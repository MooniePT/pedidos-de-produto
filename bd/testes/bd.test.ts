/** Testes da base de dados e da API (npm run test:bd). Usam um MongoDB temporário. */
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import type { AddressInfo } from 'node:net';
import { MongoClient, type Db } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Command, Database } from '../../client/src/domain';
import { seed } from '../../client/src/seed';
import { apagarCredenciais, garantirCredenciais, PALAVRA_PASSE_INICIAL } from '../autenticacao';
import { aplicarEsquema, COLECAO_SESSAO, COLECOES } from '../esquema';
import { carregarEstado, guardarEstado, lerRevisao } from '../ligacao';
import { paraDocumentos, paraEstado } from '../mapeamento';
import { criarServidor } from '../servidor';

type Linha = { _id: string } & Record<string, any>;

let mongo: MongoMemoryServer;

let cliente: MongoClient;

let db: Db;

let api = '';

let fecharApi = async () => {};

before(async () => {
  mongo = await MongoMemoryServer.create({
    binary: { version: process.env.MONGODB_VERSAO || '8.0.4' },
  });

  cliente = await MongoClient.connect(mongo.getUri());
  db = cliente.db('pedidos_produto_teste');
  await aplicarEsquema(db);

  const servidor = criarServidor(db);

  await new Promise<void>((resolve) => servidor.listen(0, '127.0.0.1', resolve));
  api = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;
  fecharApi = () => new Promise((resolve) => servidor.close(() => resolve()));
});

after(async () => {
  await fecharApi();
  await cliente?.close();
  await mongo?.stop();
});

// Põe dois estados na mesma forma para os comparar.
const DATA_ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

function comparavel(estado: Database | null) {
  assert.ok(estado, 'a base de dados devia ter dados');

  const copia: Database = JSON.parse(
    JSON.stringify(estado, (_chave, valor) =>
      typeof valor === 'string' && DATA_ISO.test(valor) ? new Date(valor).toISOString() : valor,
    ),
  );

  copia.dependencies.sort((a, b) => (a.from + a.to).localeCompare(b.from + b.to));
  copia.invites.sort((a, b) => a.token.localeCompare(b.token));
  // Os pedidos ficam do mais recente para o mais antigo (número do código).
  copia.requests.sort((a, b) => b.code.localeCompare(a.code));
  for (const r of copia.requests) r.votes.sort();

  return copia;
}

/** Pedido à API. `cookie` é o cookie da sessão (o Node não guarda cookies sozinho). */
async function pedir(caminho: string, corpo?: unknown, cookie?: string) {
  const resposta = await fetch(api + caminho, {
    method: corpo === undefined ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });

  return {
    codigo: resposta.status,
    corpo: resposta.status === 204 ? null : await resposta.json(),
    // "sessao=<código>", sem os atributos do cookie.
    cookie: resposta.headers.get('set-cookie')?.split(';')[0],
    cabecalhoCookie: resposta.headers.get('set-cookie') ?? '',
  };
}

const sessoes = new Map<string, string>();

/** Inicia sessão com uma conta de exemplo (palavra-passe inicial) e guarda o cookie. */
async function entrarComo(utilizadorId: string): Promise<string> {
  const guardado = sessoes.get(utilizadorId);

  if (guardado) return guardado;

  const email = seed().users.find((u) => u.id === utilizadorId)!.email;

  const { codigo, corpo, cookie } = await pedir('/api/autenticacao/entrar', {
    email,
    palavraPasse: PALAVRA_PASSE_INICIAL(),
  });

  assert.equal(codigo, 200, `entrar como ${utilizadorId}: ${corpo?.mensagem}`);
  sessoes.set(utilizadorId, cookie!);

  return cookie!;
}

/** Operação feita com a sessão de um utilizador. */
async function pedirComo(utilizadorId: string, comando: unknown) {
  return pedir('/api/comandos', { comando }, await entrarComo(utilizadorId));
}

/** Faz uma operação pela API e confirma que ficou gravada. */
async function agir(utilizadorId: string, comando: Command) {
  const { codigo, corpo } = await pedirComo(utilizadorId, comando);

  assert.equal(codigo, 200, `${comando.type}: ${corpo?.mensagem}`);
  assert.deepEqual(comparavel(await carregarEstado(db)), comparavel(corpo.estado), comando.type);

  return corpo as { revisao: number; estado: Database; resultado?: string };
}

test('a conversão entre o estado do programa e os documentos não perde dados', () => {
  const inicial = seed();

  assert.deepEqual(comparavel(paraEstado(paraDocumentos(inicial))), comparavel(inicial));
  assert.equal(paraEstado({}), null);
});

test('o esquema cria uma coleção por classe do diagrama e aceita os dados de exemplo', async () => {
  const nomes = (await db.listCollections().toArray()).map((c) => c.name).sort();

  assert.deepEqual(nomes, [...COLECOES, COLECAO_SESSAO].map((c) => c.nome).sort());

  // Utilizador é abstrata: há uma coleção por subclasse e nenhuma chamada Utilizador.
  assert.ok(!nomes.includes('Utilizador'));

  for (const classe of ['Cliente', 'GestorDeProjeto', 'ProductManager', 'Developer'])
    assert.ok(nomes.includes(classe));

  const inicial = seed();

  await guardarEstado(db, null, inicial);
  assert.deepEqual(comparavel(await carregarEstado(db)), comparavel(inicial));
  assert.equal(
    await db.collection('PedidoFuncionalidade').countDocuments(),
    inicial.requests.length,
  );
  assert.equal(await db.collection('Developer').countDocuments(), 2);

  const pedido = await db.collection<Linha>('PedidoFuncionalidade').findOne({ _id: 'p-52' });

  // Atributos e valores do enum com os nomes do diagrama.
  assert.equal(pedido?.id, 'P-052');
  assert.equal(pedido?.estado, 'Atribuido');
  assert.ok(pedido?.dataCriacao instanceof Date);

  const priorizacao = await db
    .collection<Linha>('Priorizacao')
    .findOne({ pedidoFuncionalidade: 'p-52' });

  assert.equal(priorizacao?.impacto, 'Alto');
  assert.equal(priorizacao?.esforco, 'Medio');
  assert.equal(priorizacao?.prioridade, 'Alto');

  const sprint = await db.collection<Linha>('Sprint').findOne({ id: 1 });

  assert.ok(sprint?.dataInicio instanceof Date && sprint?.dataFim instanceof Date);
  assert.equal(await db.collection('Metrica').countDocuments(), 7);

  // Aplicar o esquema outra vez não apaga nada.
  await aplicarEsquema(db);
  assert.equal(
    await db.collection('PedidoFuncionalidade').countDocuments(),
    inicial.requests.length,
  );
});

test('a validação recusa dados fora das regras', async () => {
  const pedidos = db.collection('PedidoFuncionalidade');

  // Só valores do enum EstadoPedido do diagrama (sem espaços nem acentos).
  await assert.rejects(
    pedidos.updateOne({ _id: 'p-41' as never }, { $set: { estado: 'Em triagem' } }),
  );
  await assert.rejects(
    pedidos.updateOne({ _id: 'p-41' as never }, { $set: { estado: 'Em sprint' } }),
  );
  await assert.rejects(
    pedidos.updateOne({ _id: 'p-41' as never }, { $set: { titulo: 'x'.repeat(101) } }),
  );

  // id: String único, no formato P-053.
  await assert.rejects(pedidos.updateOne({ _id: 'p-44' as never }, { $set: { id: 'P-041' } }));
  await assert.rejects(pedidos.updateOne({ _id: 'p-44' as never }, { $set: { id: 44 } }));
  await assert.rejects(pedidos.updateOne({ _id: 'p-44' as never }, { $set: { id: '44' } }));

  // Nível só Alto, Medio ou Baixo.
  await assert.rejects(
    db
      .collection('Priorizacao')
      .updateOne({ _id: 'p-52' as never }, { $set: { esforco: 'Médio' } }),
  );

  // Só um sprint ativo.
  await assert.rejects(
    db.collection('Sprint').insertOne({
      _id: 'outro' as never,
      id: 99,
      dataInicio: new Date('2026-12-01'),
      dataFim: new Date('2026-12-12'),
      estado: 'Ativo',
    }),
  );

  // Um voto por cliente e pedido.
  const voto = { pedidoFuncionalidade: 'p-44', cliente: 'joao', data: new Date() };

  await db.collection('Voto').insertOne({ _id: 'x1' as never, ...voto });
  await assert.rejects(db.collection('Voto').insertOne({ _id: 'x2' as never, ...voto }));
  await db.collection('Voto').deleteOne({ _id: 'x1' as never });
});

test('a validação protege as passwords e as sessões', async () => {
  // Uma password em texto simples não é aceite: só o hash.
  await assert.rejects(
    db
      .collection('Cliente')
      .updateOne({ _id: 'joao' as never }, { $set: { password: 'segredo123' } }),
  );

  // Uma sessão tem de ter utilizador e data de fim.
  await assert.rejects(
    db.collection('Sessao').insertOne({ _id: 'x' as never, utilizador: 'joao' }),
  );

  // Índice que apaga as sessões expiradas.
  const indices = await db.collection('Sessao').indexes();

  assert.ok(indices.some((i) => i.key.expiraEm === 1 && i.expireAfterSeconds === 0));
});

test('a API devolve o estado e só o reenvia quando muda', async () => {
  // Sem sessão, não há dados.
  assert.equal((await pedir('/api/estado')).codigo, 401);

  const cookie = await entrarComo('joao');
  const primeira = await pedir('/api/estado', undefined, cookie);

  assert.equal(primeira.codigo, 200);
  assert.equal(primeira.corpo.estado.requests.length, seed().requests.length);

  assert.equal(
    (await pedir(`/api/estado?revisao=${primeira.corpo.revisao}`, undefined, cookie)).codigo,
    204,
  );

  // O estado nunca leva palavras-passe.
  assert.ok(!JSON.stringify(primeira.corpo).includes('scrypt$'));
  assert.equal((await pedir('/api/saude')).corpo.ok, true);
  assert.equal((await pedir('/api/nada')).codigo, 404);
});

test('as regras do programa são aplicadas no servidor e nada é gravado quando falham', async () => {
  const antes = await lerRevisao(db);

  const submeter = {
    type: 'submeterPedido',
    input: { title: 'T', description: 'D', product: 'Produto A' },
  };

  // A Developer não pode submeter pedidos, mesmo dizendo no corpo que é o João:
  // o utilizador vem sempre da sessão (ACE-7).
  const proibido = await pedir(
    '/api/comandos',
    { utilizadorId: 'joao', comando: submeter },
    await entrarComo('ana'),
  );

  assert.equal(proibido.codigo, 400);
  assert.equal(proibido.corpo.mensagem, 'O seu perfil não permite esta operação.');

  // Sem sessão, nada é feito.
  const semSessao = await pedir('/api/comandos', { utilizadorId: 'joao', comando: submeter });

  assert.equal(semSessao.codigo, 401);
  assert.equal(semSessao.corpo.mensagem, 'Inicie sessão para continuar.');

  assert.equal((await pedirComo('joao', { type: 'inventado' })).codigo, 400);
  assert.equal((await pedir('/api/comandos', {}, await entrarComo('joao'))).codigo, 400);
  assert.equal(await lerRevisao(db), antes);
});

test('percurso completo dos quatro perfis, com todas as operações gravadas no MongoDB', async () => {
  const produto = 'Produto A';
  const descricao = 'Atribuir uma cor a cada etiqueta para as distinguir na lista.';

  // Cliente: submeter, editar, votar, convidar, comentar, ficheiros.
  const a = (
    await agir('joao', {
      type: 'submeterPedido',
      input: { title: 'Etiquetas coloridas', description: descricao, product: produto },
    })
  ).resultado!;

  await agir('joao', {
    type: 'editar',
    id: a,
    version: 1,
    input: { title: 'Etiquetas com cor', description: descricao, product: produto },
  });

  await agir('ines', { type: 'adicionarVoto', id: a });
  await agir('rui', { type: 'adicionarVoto', id: a });
  await agir('rui', { type: 'removerVoto', id: a });

  const voto = await db.collection<Linha>('Voto').findOne({ _id: `${a}#ines` });

  assert.ok(voto?.data instanceof Date, 'o voto fica com a data em que foi feito');

  const token = (await agir('joao', { type: 'gerarConvite', id: a })).resultado!;

  // O Workspace gera o ConviteLink; para o programa só existe quando alguém aceita (US2 CA2).
  const antesDeAceitar = await db.collection<Linha>('Workspace').findOne({ _id: a });

  assert.equal(antesDeAceitar?.dataCriacao, null, 'US2 CA2: ainda não há Workspace');
  assert.deepEqual(antesDeAceitar?.participantes, ['joao']);

  const convite = await db.collection<Linha>('ConviteLink').findOne({ _id: token });

  assert.equal(convite?.workspace, a);
  assert.equal(convite?.link, `/convite?token=${token}`);
  await agir('ines', { type: 'aceitarConvite', token });
  await agir('rui', { type: 'aceitarConvite', token });

  const workspace = await db.collection<Linha>('Workspace').findOne({ _id: a });

  assert.deepEqual(workspace?.participantes, ['joao', 'ines', 'rui']);
  assert.equal(workspace?.cliente, 'joao');
  assert.equal(workspace?.somenteLeitura, false);
  assert.ok(workspace?.dataCriacao instanceof Date);

  await agir('joao', {
    type: 'adicionarComentario',
    id: a,
    text: 'O que acham das cores?',
    mentions: ['ines'],
  });

  const ficheiro = {
    name: 'nota.txt',
    type: 'text/plain',
    size: 4,
    data: 'data:text/plain;base64,b2zDoQ==',
  };

  await agir('joao', { type: 'adicionarFicheiro', id: a, file: ficheiro });

  let estado = (
    await agir('ines', {
      type: 'adicionarFicheiro',
      id: a,
      file: { ...ficheiro, name: 'outra.txt' },
    })
  ).estado;

  await agir('joao', {
    type: 'removerFicheiro',
    id: a,
    fileId: estado.requests.find((r) => r.id === a)!.files[1].id,
  });

  await agir('joao', { type: 'removerMembro', id: a, member: 'rui', remove: true });
  // Gestor: triar, devolver, confirmar, duplicado.
  await agir('jose', { type: 'triarPedido', id: a });

  await agir('jose', {
    type: 'alterarEstado',
    id: a,
    status: 'Devolvido',
    reason: 'Indique quantas cores.',
  });

  assert.equal(
    (await db.collection<Linha>('PedidoFuncionalidade').findOne({ _id: a }))?.motivo,
    'Indique quantas cores.',
  );

  await agir('joao', {
    type: 'editar',
    id: a,
    version: 2,
    input: {
      title: 'Etiquetas com cor',
      description: descricao + ' Oito cores.',
      product: produto,
    },
  });

  await agir('jose', { type: 'triarPedido', id: a });
  await agir('jose', { type: 'alterarEstado', id: a, status: 'Confirmado' });

  const b = (
    await agir('ines', {
      type: 'submeterPedido',
      input: { title: 'Cores nas etiquetas', description: descricao, product: produto },
    })
  ).resultado!;

  await agir('jose', { type: 'alterarEstado', id: b, status: 'Duplicado', originalId: a });
  assert.equal(
    (await db.collection<Linha>('PedidoFuncionalidade').findOne({ _id: b }))?.pedidoOriginal,
    a,
  );

  // Product Manager: decidir, priorizar, tags, user story, release, dependências.
  await agir('marta', {
    type: 'alterarEstado',
    id: 'p-50',
    status: 'Rejeitado',
    reason: 'Fora do âmbito.',
  });

  await agir('marta', { type: 'alterarEstado', id: a, status: 'Aprovado' });

  await agir('marta', {
    type: 'definirPriorizacao',
    id: a,
    impact: 'Médio',
    effort: 'Baixo',
    priority: 'Alta',
  });

  await agir('marta', { type: 'gerirTags', kind: 'tags', op: 'create', name: 'Etiquetas' });

  await agir('marta', {
    type: 'gerirTags',
    kind: 'tags',
    op: 'edit',
    name: 'Etiquetagem',
    previous: 'Etiquetas',
  });

  await agir('marta', { type: 'gerirTags', kind: 'tags', op: 'create', name: 'Temporária' });
  await agir('marta', { type: 'gerirTags', kind: 'tags', op: 'delete', name: 'Temporária' });
  await agir('marta', { type: 'atribuirTags', id: a, tags: ['Etiquetagem', 'Pesquisa'] });

  await agir('marta', {
    type: 'definirCriteriosAceitacao',
    id: a,
    story: 'Como utilizador, pretendo dar cor às etiquetas.',
    criteria: ['Há oito cores.', 'A cor aparece na lista.'],
  });

  await agir('marta', {
    type: 'guardarRelease',
    release: {
      id: '',
      name: 'Release 2.0',
      date: '2027-01-15',
      milestone: 'Beta',
      milestoneDate: '2027-01-08',
      requestIds: [a],
    },
  });

  await agir('marta', { type: 'adicionarDependencia', from: a, to: 'p-31' });
  await agir('marta', { type: 'adicionarDependencia', from: 'p-31', to: 'p-42' });
  await agir('marta', { type: 'removerDependencia', from: 'p-31', to: 'p-42' });

  const ciclo = await pedirComo('marta', { type: 'adicionarDependencia', from: 'p-31', to: a });

  assert.equal(ciclo.corpo.mensagem, 'Esta dependência cria um ciclo.');
  // Gestor e Developer: sprint, atribuição, trabalho, conclusão.
  await agir('jose', { type: 'fecharSprint', id: 's3' });

  estado = (
    await agir('jose', {
      type: 'definirSprintBacklog',
      name: 'Sprint 4',
      start: '2026-11-23',
      end: '2026-12-04',
      requestIds: [a],
    })
  ).estado;

  await agir('jose', { type: 'atribuir', id: a, assignee: 'ana' });
  await agir('ana', { type: 'atualizarEstado', id: a });

  await agir('ana', {
    type: 'associarCodigo',
    id: a,
    url: 'https://github.com/exemplo/repo/commit/1',
  });

  await agir('ana', {
    type: 'associarCodigo',
    id: a,
    url: 'https://github.com/exemplo/repo/commit/2',
  });

  await agir('ana', {
    type: 'removerCodigo',
    id: a,
    url: 'https://github.com/exemplo/repo/commit/1',
  });

  await agir('ana', { type: 'concluir', id: a, note: 'Oito cores disponíveis.' });
  await agir('jose', { type: 'fecharSprint', id: estado.sprints.at(-1)!.id });
  estado = (await agir('ana', { type: 'configurarNotificacoes', value: 'all' })).estado;

  await agir('ana', {
    type: 'marcarComoLida',
    id: estado.notifications.find((n) => n.user === 'ana')!.id,
  });

  await agir('ana', { type: 'marcarTodasComoLidas' });

  const pedido = await db.collection<Linha>('PedidoFuncionalidade').findOne({ _id: a });
  const doPedido = { pedidoFuncionalidade: a };

  assert.equal(pedido?.estado, 'Concluido');
  assert.equal(pedido?.arquivado, true, 'SPR-8: concluído e arquivado no fecho do sprint');
  assert.equal(pedido?.developer, 'ana');
  assert.deepEqual(pedido?.tags, ['Etiquetagem', 'Pesquisa']);
  assert.deepEqual(pedido?.dependencias, ['p-31']);
  assert.ok(pedido?.dataInicio instanceof Date && pedido?.dataConclusao instanceof Date);

  const priorizacao = await db.collection<Linha>('Priorizacao').findOne(doPedido);

  assert.deepEqual(
    [priorizacao?.impacto, priorizacao?.esforco, priorizacao?.prioridade],
    ['Medio', 'Baixo', 'Alto'],
  );

  const story = await db.collection<Linha>('UserStory').findOne(doPedido);

  assert.equal(story?.geradaPorIA, false);
  assert.equal(
    await db.collection('CriterioAceitacao').countDocuments({ userStory: story?._id }),
    2,
  );

  const links = await db.collection<Linha>('LinkCodigo').find(doPedido).toArray();

  assert.deepEqual(
    links.map((l) => [l.url, l.developer]),
    [['https://github.com/exemplo/repo/commit/2', 'ana']],
  );

  assert.equal(await db.collection('VersaoPedido').countDocuments(doPedido), 2);
  assert.ok((await db.collection('HistoricoEstado').countDocuments(doPedido)) > 5);
  assert.equal(await db.collection('Comentario').countDocuments(doPedido), 1);
  assert.equal(await db.collection('Voto').countDocuments(doPedido), 1);
  assert.equal(await db.collection('Tag').countDocuments({ nome: 'Etiquetagem' }), 1);

  assert.equal(
    await db.collection('Tag').countDocuments({ nome: { $in: ['Etiquetas', 'Temporária'] } }),
    0,
  );

  assert.equal(await db.collection('Sprint').countDocuments({ estado: 'Ativo' }), 0);
  const sprint4 = await db.collection<Linha>('Sprint').findOne({ nome: 'Sprint 4' });

  assert.equal(sprint4?.id, 4);
  assert.equal(sprint4?.gestorDeProjeto, 'jose');

  const release = await db.collection<Linha>('Release').findOne({ nome: 'Release 2.0' });

  assert.ok(release?.dataPrevista instanceof Date);
  assert.equal((await db.collection('Milestone').findOne({ release: release?._id }))?.nome, 'Beta');
  assert.equal(
    (await db.collection<Linha>('Developer').findOne({ _id: 'ana' }))?.filtroNotificacao,
    'Todas',
  );

  assert.equal(
    await db.collection('Notificacao').countDocuments({ utilizador: 'ana', lida: false }),
    0,
  );

  assert.ok((await db.collection('Notificacao').distinct('tipo')).length > 1);
  assert.equal(
    (await db.collection('PedidoFuncionalidade').find().sort({ id: -1 }).limit(1).next())?.id,
    'P-054',
  );
});

test('a base de dados pode ser vista no navegador, só pela equipa interna e sem passwords', async () => {
  assert.equal((await pedir('/api/bd')).codigo, 401);
  assert.equal((await pedir('/api/bd', undefined, await entrarComo('joao'))).codigo, 403);

  const marta = await entrarComo('marta');
  const lista = await pedir('/api/bd', undefined, marta);

  assert.equal(lista.codigo, 200);
  assert.ok(
    lista.corpo.colecoes.some((c: Linha) => c.nome === 'PedidoFuncionalidade' && c.documentos > 0),
  );

  const clientes = await pedir('/api/bd/Cliente', undefined, marta);

  assert.equal(clientes.codigo, 200);
  assert.ok(clientes.corpo.documentos.length > 0);
  assert.ok(!JSON.stringify(clientes.corpo).includes('scrypt$'));
  assert.equal((await pedir('/api/bd/Sessao', undefined, marta)).codigo, 404);
});

test('o adaptador do programa lê e grava através da API', async () => {
  // Simula o navegador.
  const global = globalThis as Record<string, any>;
  const [intervalo, documento] = [global.setInterval, global.document];

  global.setInterval = () => 0;
  global.document = { visibilityState: 'visible' };

  try {
    const { criarRepositorioHttp } = await import('../../client/src/services/repositoryHttp');
    const repositorio = criarRepositorioHttp(api, { Cookie: await entrarComo('joao') });
    let avisos = 0;

    repositorio.subscribe(() => avisos++);
    await repositorio.carregar();
    assert.equal(repositorio.snapshot().users.length, 7);

    const total = repositorio.snapshot().requests.length;

    const id = await repositorio.command({
      type: 'submeterPedido',
      input: { title: 'Modo escuro', description: 'Tema escuro.', product: 'Produto B' },
    });

    assert.equal(repositorio.snapshot().requests.length, total + 1);

    assert.equal(
      (await db.collection<Linha>('PedidoFuncionalidade').findOne({ _id: id! }))?.titulo,
      'Modo escuro',
    );

    assert.ok(avisos >= 2, 'os ecrãs são avisados quando os dados mudam');

    const daAna = criarRepositorioHttp(api, { Cookie: await entrarComo('ana') });

    await assert.rejects(daAna.command({ type: 'adicionarVoto', id: id! }), {
      message: 'O seu perfil não permite esta operação.',
    });

    // Sem sessão: recusa e avisa o ecrã de que a sessão terminou.
    const semSessao = criarRepositorioHttp(api);
    let perdeuSessao = false;

    semSessao.aoPerderSessao(() => (perdeuSessao = true));
    await assert.rejects(semSessao.carregar(), { message: 'Inicie sessão para continuar.' });
    assert.ok(perdeuSessao);

    // Ao terminar a sessão, os dados são esquecidos.
    repositorio.limpar();
    assert.equal(repositorio.snapshot().requests.length, 0);

    await assert.rejects(
      criarRepositorioHttp('http://127.0.0.1:9').carregar(),
      /Sem ligação ao servidor/,
    );
  } finally {
    global.setInterval = intervalo;
    global.document = documento;
  }
});

test('registo: só cria clientes, guarda apenas o hash e recusa emails repetidos', async () => {
  const dados = { nome: 'Maria Silva', email: 'Maria@Exemplo.pt', palavraPasse: 'segredo123' };

  // Mesmo que o pedido diga outro perfil, o registo público cria um cliente.
  const criado = await pedir('/api/autenticacao/registar', { ...dados, perfil: 'product' });

  assert.equal(criado.codigo, 201, criado.corpo?.mensagem);
  assert.equal(criado.corpo.utilizador.role, 'customer');
  assert.equal(criado.corpo.utilizador.email, 'maria@exemplo.pt');
  assert.equal(criado.cookie, undefined, 'o registo não inicia sessão');

  const id = criado.corpo.utilizador.id;
  // O registo público cria sempre um Cliente (subclasse de Utilizador).
  const utilizador = await db.collection<Linha>('Cliente').findOne({ _id: id });

  assert.equal(utilizador?.nome, 'Maria Silva');
  assert.equal(typeof utilizador?.id, 'number');

  // A password não fica guardada em texto: só o hash.
  assert.match(utilizador?.password, /^scrypt\$[0-9a-f]{32}\$[0-9a-f]{128}$/);
  assert.ok(!utilizador?.password.includes(dados.palavraPasse));

  // Email repetido (sem distinguir maiúsculas).
  const repetido = await pedir('/api/autenticacao/registar', {
    ...dados,
    email: 'maria@exemplo.pt',
  });

  assert.equal(repetido.codigo, 409);
  assert.equal(repetido.corpo.mensagem, 'Este email já está registado.');

  // Dados inválidos: erros por campo, como no protótipo.
  const invalido = await pedir('/api/autenticacao/registar', {
    nome: ' ',
    email: 'sem-arroba',
    palavraPasse: 'curta',
  });

  assert.equal(invalido.codigo, 400);

  assert.deepEqual(invalido.corpo.erros, {
    nome: 'Indique um nome de utilizador.',
    email: 'Indique um email válido (ex.: nome@empresa.pt).',
    palavraPasse: 'Indique uma palavra-passe com pelo menos 8 caracteres.',
  });
});

test('início e fim de sessão: palavra-passe certa, cookie HttpOnly e sessão terminada', async () => {
  const errado = await pedir('/api/autenticacao/entrar', {
    email: 'maria@exemplo.pt',
    palavraPasse: 'errada123',
  });

  assert.equal(errado.codigo, 401);
  assert.equal(errado.corpo.mensagem, 'Email ou palavra-passe incorretos.');

  const inexistente = await pedir('/api/autenticacao/entrar', {
    email: 'ninguem@exemplo.pt',
    palavraPasse: 'qualquer1',
  });

  // A mesma mensagem: não revela se o email existe.
  assert.equal(inexistente.corpo.mensagem, 'Email ou palavra-passe incorretos.');

  const certo = await pedir('/api/autenticacao/entrar', {
    email: 'MARIA@exemplo.pt',
    palavraPasse: 'segredo123',
  });

  assert.equal(certo.codigo, 200);
  assert.match(certo.cabecalhoCookie, /HttpOnly/);
  assert.match(certo.cabecalhoCookie, /SameSite=Lax/);

  const sessao = await pedir('/api/autenticacao/sessao', undefined, certo.cookie);

  assert.equal(sessao.codigo, 200);
  assert.equal(sessao.corpo.utilizador.name, 'Maria Silva');

  // Um cliente registado pode logo submeter pedidos.
  const pedido = await pedir(
    '/api/comandos',
    {
      comando: {
        type: 'submeterPedido',
        input: { title: 'Pedido da Maria', description: 'Teste.', product: 'Produto B' },
      },
    },
    certo.cookie,
  );

  assert.equal(pedido.codigo, 200, pedido.corpo?.mensagem);

  const saida = await pedir('/api/autenticacao/sair', {}, certo.cookie);

  assert.equal(saida.codigo, 204);
  assert.match(saida.cabecalhoCookie, /Max-Age=0/);
  assert.equal((await pedir('/api/autenticacao/sessao', undefined, certo.cookie)).codigo, 401);
  assert.equal((await pedir('/api/estado', undefined, certo.cookie)).codigo, 401);
  assert.equal((await pedir('/api/autenticacao/sessao')).codigo, 401);
});

test('repor volta aos dados de exemplo e apaga as contas registadas', async () => {
  // O mesmo que "npm run bd:repor" (a API já não tem uma rota para repor dados).
  const inicial = seed();

  await guardarEstado(db, await carregarEstado(db), inicial);
  await apagarCredenciais(db);
  await garantirCredenciais(db, inicial);

  assert.equal(
    await db.collection('PedidoFuncionalidade').countDocuments(),
    inicial.requests.length,
  );
  assert.equal(await db.collection('Comentario').countDocuments(), 1);

  for (const classe of ['Cliente', 'GestorDeProjeto', 'ProductManager', 'Developer'])
    assert.equal(await db.collection(classe).countDocuments({ password: { $exists: false } }), 0);

  assert.equal(await db.collection('Cliente').countDocuments({ email: 'maria@exemplo.pt' }), 0);

  // A Maria registou-se nos testes anteriores: a conta desapareceu.
  const maria = await pedir('/api/autenticacao/entrar', {
    email: 'maria@exemplo.pt',
    palavraPasse: 'segredo123',
  });

  assert.equal(maria.codigo, 401);

  // As contas de exemplo voltam a entrar com a palavra-passe inicial (e as sessões antigas acabam).
  const marta = await pedir('/api/autenticacao/entrar', {
    email: 'marta@exemplo.pt',
    palavraPasse: PALAVRA_PASSE_INICIAL(),
  });

  assert.equal(marta.codigo, 200);
  assert.equal((await pedir('/api/estado', undefined, sessoes.get('joao'))).codigo, 401);
  assert.equal((await pedir('/api/repor', {})).codigo, 404);
});
