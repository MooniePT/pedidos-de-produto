/**
 * npm run bd:ver               -> coleções e número de documentos
 * npm run bd:ver -- Voto       -> documentos de uma coleção
 * Só lê. Liga-se à base de dados que o "npm run bd" está a usar (pode estar aberto).
 */
import { existsSync } from 'node:fs';
import { MongoClient } from 'mongodb';
import { COLECOES } from './esquema';

if (existsSync('.env')) process.loadEnvFile('.env');

const uri = process.env.MONGODB_URI || `mongodb://127.0.0.1:${process.env.MONGODB_PORTA || 27017}`;
const colecao = process.argv[2];
const cliente = new MongoClient(uri, { serverSelectionTimeoutMS: 3000 });

try {
  await cliente.connect();
} catch {
  console.error(`Não foi possível ligar a ${uri}. Arranque primeiro o programa com "npm run bd".`);
  process.exit(1);
}

const db = cliente.db(process.env.MONGODB_DB || 'pedidos_produto');

if (!colecao) {
  const linhas = [];

  for (const c of COLECOES) {
    linhas.push({ Coleção: c.nome, Documentos: await db.collection(c.nome).countDocuments() });
  }

  console.log(`Base de dados ${db.databaseName} em ${uri}`);
  console.table(linhas);
} else if (!COLECOES.some((c) => c.nome === colecao)) {
  console.error(
    `A coleção "${colecao}" não existe. Use: ${COLECOES.map((c) => c.nome).join(', ')}`,
  );
  process.exitCode = 1;
} else {
  // A password nunca é mostrada.
  const docs = await db
    .collection(colecao)
    .find({}, { projection: { password: 0 } })
    .toArray();

  console.dir(docs, { depth: null });
  console.log(`${docs.length} documento(s) em ${colecao}.`);
}

await cliente.close();
