/** Ligação à base de dados: abrir, ler e gravar. */
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { MongoClient, type AnyBulkWriteOperation, type Db, type Document } from 'mongodb';
import type { Database } from '../client/src/domain';
import { aplicarEsquema, COLECOES, SUBCLASSES_UTILIZADOR } from './esquema';
import { paraDocumentos, paraEstado, type Documento } from './mapeamento';

export const NOME_BD = () => process.env.MONGODB_DB || 'pedidos_produto';

/** Pasta onde o MongoDB local guarda os dados (fora do OneDrive). */
export const PASTA_DADOS = () =>
  process.env.MONGODB_DADOS || join(homedir(), '.pedidos-produto', 'mongo');

/** Porta do MongoDB local. */
export const PORTA_LOCAL = () => Number(process.env.MONGODB_PORTA || 27017);

export type Ligacao = { db: Db; origem: string; fechar: () => Promise<void> };

/** Abre a base de dados indicada no .env (MONGODB_URI) ou, se não houver, um MongoDB local. */
export async function abrirBaseDados(): Promise<Ligacao> {
  if (existsSync('.env')) process.loadEnvFile('.env');

  let uri = process.env.MONGODB_URI;
  let pararLocal = async () => {};

  if (!uri) {
    const { MongoMemoryServer } = await import('mongodb-memory-server');

    await mkdir(PASTA_DADOS(), { recursive: true });

    try {
      const arrancar = (port?: number) =>
        MongoMemoryServer.create({
          binary: { version: process.env.MONGODB_VERSAO || '8.0.4' },
          instance: { dbPath: PASTA_DADOS(), storageEngine: 'wiredTiger', ip: '127.0.0.1', port },
        });

      // Porta fixa (27017), para o Compass e o "npm run bd:ver" se ligarem.
      // Se estiver ocupada (outro MongoDB instalado), usa uma porta livre.
      const local = await arrancar(PORTA_LOCAL()).catch(() => arrancar());

      uri = local.getUri();

      pararLocal = async () => {
        await local.stop({ doCleanup: false });
      };
    } catch (erro) {
      throw Error(
        `Não foi possível arrancar o MongoDB local em ${PASTA_DADOS()}. ` +
          'Se o programa já está a correr noutra janela (npm run bd), feche-o primeiro. ' +
          `Detalhe: ${erro instanceof Error ? erro.message : String(erro)}`,
      );
    }
  }

  // journal: a gravação só é confirmada depois de estar em disco.
  const cliente = new MongoClient(uri, { serverSelectionTimeoutMS: 5000, w: 1, journal: true });

  try {
    await cliente.connect();
  } catch (erro) {
    await pararLocal();

    throw Error(
      `Não foi possível ligar ao MongoDB em ${uri}. Confirme que o servidor está a correr. ` +
        `Detalhe: ${erro instanceof Error ? erro.message : String(erro)}`,
    );
  }

  const db = cliente.db(NOME_BD());

  await aplicarEsquema(db);

  return {
    db,
    origem: process.env.MONGODB_URI ? uri : `${uri} (MongoDB local, dados em ${PASTA_DADOS()})`,
    fechar: async () => {
      await cliente.close();
      await pararLocal();
    },
  };
}

/** Lê a base de dados toda. Devolve null se estiver vazia. */
export async function carregarEstado(db: Db): Promise<Database | null> {
  const docs: Record<string, Document[]> = {};

  for (const { nome } of COLECOES) docs[nome] = await db.collection(nome).find().toArray();

  return paraEstado(docs);
}

// Número de revisão do estado: muda a cada gravação e serve para o programa saber se há
// alterações. Fica em memória e começa na hora do arranque, por isso nunca volta atrás.
let revisao = Date.now();

export async function lerRevisao(_db: Db): Promise<number> {
  return revisao;
}

// Nas subclasses de Utilizador, a password é gerida pela autenticação: a gravação só atualiza
// os outros atributos e nunca apaga a password.
const UTILIZADORES = new Set<string>(SUBCLASSES_UTILIZADOR);

/** Grava só o que mudou entre os dois estados e devolve o novo número de revisão. */
export async function guardarEstado(
  db: Db,
  anterior: Database | null,
  novo: Database,
  autor?: string,
): Promise<number> {
  const antes = anterior ? paraDocumentos(anterior) : {};
  const depois = paraDocumentos(novo);
  const agora = new Date();

  for (const { nome } of COLECOES) {
    const antigos = new Map((antes[nome] || []).map((d) => [d._id, JSON.stringify(d)]));
    const operacoes: AnyBulkWriteOperation<Documento>[] = [];
    const novos = new Set((depois[nome] || []).map((d) => d._id));

    // Primeiro apaga o que saiu, para os índices únicos (id, nome) não chocarem.
    for (const _id of antigos.keys()) {
      if (!novos.has(_id)) operacoes.push({ deleteOne: { filter: { _id } } });
    }

    for (const doc of depois[nome] || []) {
      if (antigos.get(doc._id) !== JSON.stringify(doc)) {
        const { _id, ...campos } = doc;

        if (nome === 'Voto') {
          // A data do voto só é posta quando o voto é criado.
          operacoes.push({
            updateOne: {
              filter: { _id },
              update: { $set: campos, $setOnInsert: { data: agora } },
              upsert: true,
            },
          });
        } else if (nome === 'Sprint') {
          // GestorDeProjeto 1 -- 0..* Sprint: quem define o sprint fica associado a ele.
          const gestor = autor ?? novo.users.find((u) => u.role === 'manager')?.id ?? null;

          operacoes.push({
            updateOne: {
              filter: { _id },
              update: { $set: campos, $setOnInsert: { gestorDeProjeto: gestor } },
              upsert: true,
            },
          });
        } else if (UTILIZADORES.has(nome)) {
          operacoes.push({
            updateOne: { filter: { _id }, update: { $set: campos }, upsert: true },
          });
        } else {
          operacoes.push({ replaceOne: { filter: { _id }, replacement: campos, upsert: true } });
        }
      }
    }

    if (operacoes.length) {
      await db.collection<Documento>(nome).bulkWrite(operacoes, { ordered: true });
    }
  }

  return ++revisao;
}
