/** Comandos criar, exportar, importar e repor (ver BASE_DADOS.md). */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { seed } from '../client/src/seed';
import { migrarDados } from '../client/src/services/migracao';
import { apagarCredenciais, garantirCredenciais } from './autenticacao';
import { abrirBaseDados, carregarEstado, guardarEstado } from './ligacao';
import { prepararDados } from './servidor';

const ficheiro = fileURLToPath(new URL('./dados/estado.json', import.meta.url));

const acao = process.argv[2];

let ligacao: Awaited<ReturnType<typeof abrirBaseDados>>;

try {
  ligacao = await abrirBaseDados();
} catch (erro) {
  console.error(erro instanceof Error ? erro.message : erro);
  process.exit(1);
}

try {
  const { db } = ligacao;

  if (acao === 'criar') {
    const estado = await prepararDados(db);

    console.log(`Base de dados pronta em ${ligacao.origem}: ${estado.requests.length} pedidos.`);
  } else if (acao === 'exportar') {
    const estado = await prepararDados(db);

    await mkdir(fileURLToPath(new URL('./dados/', import.meta.url)), { recursive: true });
    await writeFile(ficheiro, JSON.stringify(estado, null, 2));
    console.log(`Dados exportados para ${ficheiro}.`);
  } else if (acao === 'importar') {
    const estado = migrarDados(JSON.parse(await readFile(ficheiro, 'utf8')));

    if (!estado) throw Error(`O ficheiro ${ficheiro} não tem dados válidos do programa.`);
    await guardarEstado(db, await carregarEstado(db), estado);
    await garantirCredenciais(db, estado);
    console.log(`Dados importados de ${ficheiro}: ${estado.requests.length} pedidos.`);
  } else if (acao === 'repor') {
    const inicial = seed();

    await guardarEstado(db, await carregarEstado(db), inicial);

    // As contas registadas desaparecem e todas as contas de exemplo voltam à palavra-passe inicial.
    await apagarCredenciais(db);
    await garantirCredenciais(db, inicial);
    console.log('Base de dados reposta com os dados de exemplo.');
  } else {
    throw Error('Use: criar, exportar, importar ou repor.');
  }
} catch (erro) {
  console.error(erro instanceof Error ? erro.message : erro);
  process.exitCode = 1;
} finally {
  await ligacao.fechar();
}
