import { build } from 'esbuild';
import { cp, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

await mkdir(path.join(root, 'dist'), { recursive: true });

await build({
  entryPoints: [path.join(root, 'client/src/main.tsx')],
  bundle: true,
  minify: true,
  outdir: path.join(root, 'dist'),
  entryNames: 'app',
  assetNames: 'fonts/[name]-[hash]',
  loader: { '.woff2': 'file', '.woff': 'file' },
  // Esta compilação guarda os dados no navegador; a ligação ao MongoDB usa `npm run bd`.
  define: { 'process.env.NODE_ENV': '"production"', 'import.meta.env': 'undefined' },
  sourcemap: true,
  metafile: false,
});

await cp(path.join(root, 'client/public'), path.join(root, 'dist'), { recursive: true });

await writeFile(
  path.join(root, 'dist/index.html'),
  '<!doctype html><html lang="pt-PT"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#4f46e5"><title>Pedidos de produto</title><link rel="stylesheet" href="/app.css"></head><body><div id="root"></div><script type="module" src="/app.js"></script></body></html>',
);

console.log('Frontend compilado em dist/.');
