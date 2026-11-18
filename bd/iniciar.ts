/** npm run bd: arranca o MongoDB, a API e o programa. */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { garantirCredenciais, PALAVRA_PASSE_INICIAL } from './autenticacao';
import { abrirBaseDados } from './ligacao';
import { criarServidor, prepararDados } from './servidor';

const raiz = fileURLToPath(new URL('..', import.meta.url));

const porta = Number(process.env.PORT || 3001);

const ligacao = await abrirBaseDados();

const estado = await prepararDados(ligacao.db);

// Contas que ainda não tinham palavra-passe (equipa interna e clientes de exemplo).
const novasContas = await garantirCredenciais(ligacao.db, estado);

const servidor = criarServidor(ligacao.db);

await new Promise<void>((resolve, reject) => {
  servidor.once('error', reject);
  servidor.listen(porta, '127.0.0.1', resolve);
});

console.log(`Base de dados: ${ligacao.origem} · ${estado.requests.length} pedidos`);

console.log(`API: http://127.0.0.1:${porta}`);

if (novasContas.length) {
  console.log(
    `Palavra-passe inicial "${PALAVRA_PASSE_INICIAL()}" atribuída a: ` +
      novasContas.map((u) => u.email).join(', '),
  );
}

const interface_ = process.argv.includes('--sem-interface')
  ? null
  : spawn(
      process.execPath,
      [
        fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url)),
        '--host',
        '127.0.0.1',
        '--port',
        '5174',
      ],
      {
        cwd: raiz,
        stdio: 'inherit',
        // O Vite encaminha /api para esta porta (ver vite.config.ts).
        env: { ...process.env, API_PORTA: String(porta) },
      },
    );

let aFechar = false;

async function fechar() {
  if (aFechar) return;
  aFechar = true;
  interface_?.kill();
  await new Promise((resolve) => servidor.close(resolve));
  await ligacao.fechar();
  process.exit(0);
}

interface_?.once('exit', fechar);

process.once('SIGINT', fechar);

process.once('SIGTERM', fechar);
