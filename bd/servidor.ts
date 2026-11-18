/**
 * API entre o programa e a base de dados. Usa as mesmas regras do programa (reducer.ts).
 * Todas as rotas, exceto a saúde e a autenticação, exigem uma sessão iniciada.
 */
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { Db } from 'mongodb';
import type { Command, Database, User } from '../client/src/domain';
import { seed } from '../client/src/seed';
import { executarComando } from '../client/src/services/reducer';
import {
  adicionarCliente,
  autenticar,
  COOKIE_SESSAO,
  cookieSessao,
  criarSessao,
  garantirCredenciais,
  guardarCredencial,
  lerCookie,
  lerSessao,
  MENSAGENS,
  terminarSessao,
  validarRegisto,
  type DadosRegisto,
} from './autenticacao';
import { COLECOES } from './esquema';
import { carregarEstado, guardarEstado, lerRevisao } from './ligacao';

const LIMITE_CORPO = 8 * 1024 * 1024; // um ficheiro de 2 MB ocupa cerca de 2,7 MB em texto

const ORIGENS = () =>
  (process.env.ORIGENS_PERMITIDAS || 'http://127.0.0.1:5174,http://localhost:5174').split(',');

class ErroDePedido extends Error {
  constructor(
    readonly codigo: number,
    mensagem: string,
    // Erros por campo, para o formulário os mostrar junto de cada campo.
    readonly erros?: Record<string, string>,
  ) {
    super(mensagem);
  }
}

// Nomes antigos dos produtos (antes de 18-11-2026).
const PRODUTOS_ANTIGOS: Record<string, string> = {
  'Gestão de ferramentas': 'Produto A',
  'Gestão de tarefas': 'Produto B',
  'Gestão de conhecimento': 'Produto C',
};

let dadosAtualizados = false;

/** Corrige uma base de dados criada por uma versão anterior: id do pedido e nomes dos produtos. */
async function atualizarDadosAntigos(db: Db, atual: Database): Promise<Database> {
  dadosAtualizados = true;

  const pedidos = db.collection('PedidoFuncionalidade');

  for (const p of await pedidos.find({ id: { $type: 'number' } }).toArray()) {
    await pedidos.updateOne({ _id: p._id }, { $set: { id: `P-${String(p.id).padStart(3, '0')}` } });
  }

  const nome = (produto: string) => PRODUTOS_ANTIGOS[produto] ?? produto;
  const antigos = atual.requests.some(
    (r) => r.product in PRODUTOS_ANTIGOS || r.versions.some((v) => v.product in PRODUTOS_ANTIGOS),
  );

  if (!antigos) return atual;

  const novo = structuredClone(atual);

  novo.requests = novo.requests.map((r) => ({
    ...r,
    product: nome(r.product),
    versions: r.versions.map((v) => ({ ...v, product: nome(v.product) })),
  }));

  // A coleção Produto é refeita com os nomes novos; o resto é regravado por cima.
  await db.collection('Produto').deleteMany({});
  await guardarEstado(db, null, novo);

  return (await carregarEstado(db))!;
}

/** Se a base de dados estiver vazia, carrega os dados de exemplo. */
export async function prepararDados(db: Db): Promise<Database> {
  const atual = await carregarEstado(db);

  if (atual) return dadosAtualizados ? atual : atualizarDadosAntigos(db, atual);

  const inicial = seed();

  await guardarEstado(db, null, inicial);

  const estado = (await carregarEstado(db))!;

  // As contas de exemplo recebem a palavra-passe inicial.
  await garantirCredenciais(db, estado);

  return estado;
}

async function lerCorpo(pedido: IncomingMessage): Promise<Record<string, unknown>> {
  const partes: Buffer[] = [];
  let tamanho = 0;

  for await (const parte of pedido) {
    tamanho += parte.length;
    if (tamanho > LIMITE_CORPO) throw new ErroDePedido(413, 'O pedido é demasiado grande.');
    partes.push(parte);
  }

  try {
    const corpo = JSON.parse(Buffer.concat(partes).toString('utf8') || '{}');

    if (corpo && typeof corpo === 'object') return corpo;
  } catch {
    /* tratado abaixo */
  }

  throw new ErroDePedido(400, 'Os dados enviados não são válidos.');
}

type Resposta = { codigo: number; corpo?: unknown; cookie?: string };

const semPalavraPasse = (u: User) => ({ id: u.id, name: u.name, email: u.email, role: u.role });

export function criarServidor(db: Db): Server {
  // Uma gravação de cada vez.
  let fila: Promise<unknown> = Promise.resolve();

  const emFila = <T>(tarefa: () => Promise<T>): Promise<T> => {
    const resultado = fila.then(tarefa, tarefa);

    fila = resultado.catch(() => undefined);

    return resultado;
  };

  /** Utilizador da sessão. Sem sessão válida, responde 401 e nada é feito. */
  async function exigirSessao(pedido: IncomingMessage): Promise<string> {
    const utilizadorId = await lerSessao(db, lerCookie(pedido.headers.cookie, COOKIE_SESSAO));

    if (!utilizadorId) throw new ErroDePedido(401, MENSAGENS.semSessao);

    return utilizadorId;
  }

  async function tratar(pedido: IncomingMessage, url: URL): Promise<Resposta> {
    const rota = `${pedido.method} ${url.pathname}`;

    if (rota === 'GET /api/saude') {
      await db.command({ ping: 1 });

      return { codigo: 200, corpo: { ok: true, baseDados: db.databaseName } };
    }

    // ---- Ver a base de dados no navegador (só leitura, só equipa interna) -----------------

    if (
      pedido.method === 'GET' &&
      (url.pathname === '/api/bd' || url.pathname.startsWith('/api/bd/'))
    ) {
      const utilizadorId = await exigirSessao(pedido);
      const utilizador = (await prepararDados(db)).users.find((u) => u.id === utilizadorId);

      if (!utilizador || utilizador.role === 'customer') {
        throw new ErroDePedido(403, 'Só a equipa interna pode ver a base de dados.');
      }

      const nome = decodeURIComponent(url.pathname.slice('/api/bd/'.length));

      if (url.pathname === '/api/bd' || !nome) {
        const colecoes = [];

        for (const c of COLECOES) {
          colecoes.push({ nome: c.nome, documentos: await db.collection(c.nome).countDocuments() });
        }

        return { codigo: 200, corpo: { baseDados: db.databaseName, colecoes } };
      }

      if (!COLECOES.some((c) => c.nome === nome)) {
        throw new ErroDePedido(404, 'Coleção não encontrada.');
      }

      // A password nunca sai da base de dados.
      const documentos = await db
        .collection(nome)
        .find({}, { projection: { password: 0 } })
        .limit(200)
        .toArray();

      return { codigo: 200, corpo: { colecao: nome, documentos } };
    }

    // ---- Autenticação ---------------------------------------------------------------------

    if (rota === 'POST /api/autenticacao/registar') {
      const dados = (await lerCorpo(pedido)) as Partial<DadosRegisto>;
      const erros = validarRegisto(dados);

      if (Object.keys(erros).length) {
        throw new ErroDePedido(400, 'Verifique os dados do registo.', erros);
      }

      return emFila(async () => {
        const atual = await prepararDados(db);
        let resultado: ReturnType<typeof adicionarCliente>;

        try {
          resultado = adicionarCliente(atual, dados as DadosRegisto);
        } catch (erro) {
          throw new ErroDePedido(409, (erro as Error).message, {
            email: (erro as Error).message,
          });
        }

        await guardarEstado(db, atual, resultado.novo);
        await guardarCredencial(db, resultado.utilizador.id, dados.palavraPasse!);

        return { codigo: 201, corpo: { utilizador: semPalavraPasse(resultado.utilizador) } };
      });
    }

    if (rota === 'POST /api/autenticacao/entrar') {
      const { email, palavraPasse } = (await lerCorpo(pedido)) as Record<string, string>;
      const estado = await prepararDados(db);

      await garantirCredenciais(db, estado);

      let utilizador: User;

      try {
        utilizador = await autenticar(db, estado, email, palavraPasse);
      } catch (erro) {
        throw new ErroDePedido(401, (erro as Error).message);
      }

      const codigo = await criarSessao(db, utilizador.id);

      return {
        codigo: 200,
        corpo: { utilizador: semPalavraPasse(utilizador) },
        cookie: cookieSessao(codigo),
      };
    }

    if (rota === 'POST /api/autenticacao/sair') {
      await terminarSessao(db, lerCookie(pedido.headers.cookie, COOKIE_SESSAO));

      return { codigo: 204, cookie: cookieSessao(null) };
    }

    if (rota === 'GET /api/autenticacao/sessao') {
      const utilizadorId = await exigirSessao(pedido);
      const utilizador = (await prepararDados(db)).users.find((u) => u.id === utilizadorId);

      // A conta pode ter sido apagada (por exemplo, ao repor os dados de exemplo).
      if (!utilizador) throw new ErroDePedido(401, MENSAGENS.semSessao);

      return { codigo: 200, corpo: { utilizador: semPalavraPasse(utilizador) } };
    }

    // ---- Dados e operações (só com sessão) ---------------------------------------------------

    if (rota === 'GET /api/estado') {
      await exigirSessao(pedido);

      const revisao = await lerRevisao(db);

      if (url.searchParams.get('revisao') === String(revisao)) return { codigo: 204 };

      return emFila(async () => ({
        codigo: 200,
        corpo: { revisao: await lerRevisao(db), estado: await prepararDados(db) },
      }));
    }

    if (rota === 'POST /api/comandos') {
      // O utilizador vem da sessão, nunca do corpo do pedido (ACE-7).
      const utilizadorId = await exigirSessao(pedido);
      const { comando } = await lerCorpo(pedido);

      if (!comando || typeof comando !== 'object') {
        throw new ErroDePedido(400, 'Indique a operação.');
      }

      return emFila(async () => {
        const atual = await prepararDados(db);
        let seguinte: ReturnType<typeof executarComando>;

        try {
          seguinte = executarComando(atual, utilizadorId, comando as Command);
        } catch (erro) {
          // A regra falhou: não grava nada e devolve a mensagem.
          throw new ErroDePedido(
            400,
            erro instanceof TypeError ? 'Operação desconhecida.' : (erro as Error).message,
          );
        }

        const revisao = await guardarEstado(db, atual, seguinte.state, utilizadorId);

        return {
          codigo: 200,
          corpo: { revisao, estado: seguinte.state, resultado: seguinte.result },
        };
      });
    }

    throw new ErroDePedido(404, 'Recurso não encontrado.');
  }

  return createServer((pedido: IncomingMessage, resposta: ServerResponse) => {
    const origem = pedido.headers.origin;

    // Com o programa a correr em "npm run bd", os pedidos chegam pelo Vite (mesma origem).
    // As origens abaixo só servem para quem chamar a API diretamente noutra porta.
    if (origem && ORIGENS().includes(origem)) {
      resposta.setHeader('Access-Control-Allow-Origin', origem);
      resposta.setHeader('Access-Control-Allow-Credentials', 'true');
      resposta.setHeader('Vary', 'Origin');
      resposta.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      resposta.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    }

    if (pedido.method === 'OPTIONS') {
      resposta.writeHead(204).end();

      return;
    }

    const enviar = ({ codigo, corpo, cookie }: Resposta) => {
      if (cookie) resposta.setHeader('Set-Cookie', cookie);

      if (corpo === undefined) {
        resposta.writeHead(codigo).end();
      } else {
        resposta
          .writeHead(codigo, {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-store',
          })
          .end(JSON.stringify(corpo));
      }
    };

    tratar(pedido, new URL(pedido.url || '/', 'http://localhost')).then(enviar, (erro) => {
      if (erro instanceof ErroDePedido) {
        enviar({ codigo: erro.codigo, corpo: { mensagem: erro.message, erros: erro.erros } });
      } else {
        console.error(erro);

        enviar({
          codigo: 500,
          corpo: { mensagem: 'Não foi possível concluir a operação. Tente novamente.' },
        });
      }
    });
  });
}
