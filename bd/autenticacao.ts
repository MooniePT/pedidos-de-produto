/** Autenticação: palavras-passe com hash, sessões e regras de registo (RNF-2, ACE-7). */
import { createHash, randomBytes, randomUUID, scrypt, timingSafeEqual } from 'node:crypto';
import type { Db } from 'mongodb';
import type { Database, User } from '../client/src/domain';
import { SUBCLASSES_UTILIZADOR } from './esquema';

// A password (só o hash) fica no atributo password do utilizador, como no diagrama.
// Não faz parte do estado do programa: nunca é enviada para o navegador.
type ComPassword = { _id: string; password?: string };

type Sessao = { _id: string; utilizador: string; criadaEm: Date; expiraEm: Date };

export const COOKIE_SESSAO = 'sessao';

export const DURACAO_SESSAO_MS = 12 * 60 * 60 * 1000; // 12 horas

const MINIMO_PALAVRA_PASSE = 8;

/** Palavra-passe inicial das contas que já vêm na base de dados (equipa interna e clientes de exemplo). */
export const PALAVRA_PASSE_INICIAL = () => process.env.PALAVRA_PASSE_INICIAL || 'pedidos123';

// Mensagens mostradas no ecrã.
export const MENSAGENS = {
  semSessao: 'Inicie sessão para continuar.',
  credenciaisErradas: 'Email ou palavra-passe incorretos.',
  emailRegistado: 'Este email já está registado.',
  nome: 'Indique um nome de utilizador.',
  email: 'Indique um email válido (ex.: nome@empresa.pt).',
  palavraPasse: `Indique uma palavra-passe com pelo menos ${MINIMO_PALAVRA_PASSE} caracteres.`,
};

// As quatro subclasses de Utilizador (Cliente, GestorDeProjeto, ProductManager, Developer).
const subclasses = (db: Db) =>
  SUBCLASSES_UTILIZADOR.map((nome) => db.collection<ComPassword>(nome));

const sessoes = (db: Db) => db.collection<Sessao>('Sessao');

/** Hash guardado do utilizador, ou null se ainda não tiver password. */
async function lerPassword(db: Db, utilizadorId: string): Promise<string | null> {
  for (const colecao of subclasses(db)) {
    const doc = await colecao.findOne({ _id: utilizadorId });

    if (doc) return doc.password ?? null;
  }

  return null;
}

// ---------------------------------------------------------------------------------------------
// Palavras-passe: só se guarda o hash (scrypt com um "sal" aleatório por utilizador).
// ---------------------------------------------------------------------------------------------

function calcularScrypt(palavraPasse: string, sal: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(palavraPasse, sal, 64, (erro, chave) => (erro ? reject(erro) : resolve(chave))),
  );
}

/** Devolve o texto a guardar: "scrypt$<sal>$<hash>". */
export async function gerarHash(palavraPasse: string): Promise<string> {
  const sal = randomBytes(16);
  const hash = await calcularScrypt(palavraPasse, sal);

  return `scrypt$${sal.toString('hex')}$${hash.toString('hex')}`;
}

export async function verificarHash(palavraPasse: string, guardado: string): Promise<boolean> {
  const [algoritmo, salHex, hashHex] = guardado.split('$');

  if (algoritmo !== 'scrypt' || !salHex || !hashHex) return false;

  const esperado = Buffer.from(hashHex, 'hex');
  const calculado = await calcularScrypt(palavraPasse, Buffer.from(salHex, 'hex'));

  // Comparação em tempo constante, para não revelar quantos carateres estão certos.
  return esperado.length === calculado.length && timingSafeEqual(esperado, calculado);
}

// ---------------------------------------------------------------------------------------------
// Preparação: palavras-passe iniciais. (As coleções e os índices estão em esquema.ts.)
// ---------------------------------------------------------------------------------------------

/**
 * Dá a palavra-passe inicial a quem ainda não tem password (contas de exemplo) e termina as
 * sessões de utilizadores que já não existem. Devolve quem recebeu a palavra-passe inicial.
 */
export async function garantirCredenciais(db: Db, estado: Database): Promise<User[]> {
  const semPassword = new Set<string>();

  for (const colecao of subclasses(db)) {
    for (const doc of await colecao.find({ password: { $exists: false } }).toArray()) {
      await colecao.updateOne(
        { _id: doc._id },
        { $set: { password: await gerarHash(PALAVRA_PASSE_INICIAL()) } },
      );
      semPassword.add(doc._id);
    }
  }

  await sessoes(db).deleteMany({ utilizador: { $nin: estado.users.map((u) => u.id) } });

  return estado.users.filter((u) => semPassword.has(u.id));
}

/** Apaga todas as passwords e sessões (usado ao repor os dados de exemplo). */
export async function apagarCredenciais(db: Db) {
  for (const colecao of subclasses(db)) await colecao.updateMany({}, { $unset: { password: '' } });
  await sessoes(db).deleteMany({});
}

// ---------------------------------------------------------------------------------------------
// Registo (Sequência "Registar utilizador": o registo público só cria clientes).
// ---------------------------------------------------------------------------------------------

export type DadosRegisto = { nome: string; email: string; palavraPasse: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const normalizarEmail = (email: string) => email.trim().toLowerCase();

/** Valida os dados do formulário. Devolve a mensagem de cada campo com erro. */
export function validarRegisto(dados: Partial<DadosRegisto>): Partial<DadosRegisto> {
  const erros: Partial<DadosRegisto> = {};

  if (!dados.nome?.trim() || dados.nome.trim().length > 100) erros.nome = MENSAGENS.nome;
  if (!dados.email || !EMAIL.test(dados.email.trim())) erros.email = MENSAGENS.email;

  if (!dados.palavraPasse || dados.palavraPasse.length < MINIMO_PALAVRA_PASSE) {
    erros.palavraPasse = MENSAGENS.palavraPasse;
  }

  return erros;
}

/** Cria o utilizador (sempre como cliente) e devolve o estado novo, ainda por gravar. */
export function adicionarCliente(
  estado: Database,
  dados: DadosRegisto,
): {
  novo: Database;
  utilizador: User;
} {
  const email = normalizarEmail(dados.email);

  if (estado.users.some((u) => normalizarEmail(u.email) === email)) {
    throw Error(MENSAGENS.emailRegistado);
  }

  const utilizador: User = {
    id: randomUUID(),
    name: dados.nome.trim(),
    email,
    role: 'customer',
    preference: 'all',
  };

  return { novo: { ...estado, users: [...estado.users, utilizador] }, utilizador };
}

export async function guardarCredencial(db: Db, utilizadorId: string, palavraPasse: string) {
  const password = await gerarHash(palavraPasse);

  for (const colecao of subclasses(db)) {
    await colecao.updateOne({ _id: utilizadorId }, { $set: { password } });
  }
}

// ---------------------------------------------------------------------------------------------
// Início de sessão.
// ---------------------------------------------------------------------------------------------

/** Confirma o email e a palavra-passe. A mensagem de erro é a mesma nos dois casos. */
export async function autenticar(
  db: Db,
  estado: Database,
  email: string,
  palavraPasse: string,
): Promise<User> {
  const utilizador = estado.users.find(
    (u) => normalizarEmail(u.email) === normalizarEmail(email || ''),
  );

  const password = utilizador ? await lerPassword(db, utilizador.id) : null;

  if (!utilizador || !password || !(await verificarHash(palavraPasse || '', password))) {
    throw Error(MENSAGENS.credenciaisErradas);
  }

  return utilizador;
}

// ---------------------------------------------------------------------------------------------
// Sessões: o navegador guarda só um código aleatório (cookie HttpOnly);
// a base de dados guarda o resumo (hash) desse código.
// ---------------------------------------------------------------------------------------------

const resumo = (codigo: string) => createHash('sha256').update(codigo).digest('hex');

export async function criarSessao(db: Db, utilizadorId: string): Promise<string> {
  const codigo = randomBytes(32).toString('hex');
  const agora = new Date();

  await sessoes(db).insertOne({
    _id: resumo(codigo),
    utilizador: utilizadorId,
    criadaEm: agora,
    expiraEm: new Date(agora.getTime() + DURACAO_SESSAO_MS),
  });

  return codigo;
}

/** Devolve o utilizador da sessão, ou null se não houver sessão válida. */
export async function lerSessao(db: Db, codigo: string | undefined): Promise<string | null> {
  if (!codigo) return null;

  const sessao = await sessoes(db).findOne({ _id: resumo(codigo) });

  if (!sessao || sessao.expiraEm.getTime() <= Date.now()) return null;

  return sessao.utilizador;
}

export async function terminarSessao(db: Db, codigo: string | undefined) {
  if (codigo) await sessoes(db).deleteOne({ _id: resumo(codigo) });
}

// ---------------------------------------------------------------------------------------------
// Cookies.
// ---------------------------------------------------------------------------------------------

export function lerCookie(cabecalho: string | undefined, nome: string): string | undefined {
  for (const parte of (cabecalho || '').split(';')) {
    const [chave, ...valor] = parte.trim().split('=');

    if (chave === nome) return decodeURIComponent(valor.join('='));
  }

  return undefined;
}

/** HttpOnly: o JavaScript da página não consegue ler o cookie. Em produção (HTTPS), acrescenta Secure. */
export function cookieSessao(codigo: string | null): string {
  const seguro = process.env.COOKIE_SEGURO === 'true' ? '; Secure' : '';
  const validade = codigo ? Math.floor(DURACAO_SESSAO_MS / 1000) : 0;

  return `${COOKIE_SESSAO}=${codigo ?? ''}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${validade}${seguro}`;
}
