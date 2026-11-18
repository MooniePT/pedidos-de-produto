import http from 'node:http';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.dirname(fileURLToPath(import.meta.url));
const cache = path.join(os.tmpdir(), 'pedidos-interface-assets');
await fs.mkdir(cache, { recursive: true });
const base = 'https://www.figma.com/api/mcp/asset/3b5fdd02-48e8-40ae-aad0-220b99e2b2f9';
const assets = [
  ['logo.png', base + '/4c665.png'],
  ['inbox.svg', base + '/da847.svg'],
  ['product-dot.svg', base + '/71d75.svg'],
  [
    'chevron.svg',
    'https://www.figma.com/api/mcp/asset/8e92bb40-f73d-4338-9e32-a5b62679502f/aba54.svg',
  ],
];
await Promise.all(
  assets.map(async ([name, url]) => {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Asset: ' + response.status);
    await fs.writeFile(path.join(cache, name), new Uint8Array(await response.arrayBuffer()));
  }),
);
http
  .createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      let file, type;
      if (url.pathname === '/styles.css') {
        file = path.join(root, 'client/src/styles.css');
        type = 'text/css';
      } else if (
        url.pathname.startsWith('/assets/') &&
        assets.some(([n]) => '/assets/' + n === url.pathname)
      ) {
        file = path.join(cache, path.basename(url.pathname));
        type = file.endsWith('.png') ? 'image/png' : 'image/svg+xml';
      } else {
        file = path.join(root, 'preview.html');
        type = 'text/html';
      }
      res.writeHead(200, { 'Content-Type': type + '; charset=utf-8' });
      res.end(await fs.readFile(file));
    } catch {
      res.writeHead(500);
      res.end('Erro ao carregar a interface.');
    }
  })
  .listen(5173, '127.0.0.1', () => console.log('INTERFACE http://127.0.0.1:5173'));
