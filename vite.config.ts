import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
const api = `http://127.0.0.1:${process.env.API_PORTA || 3001}`;

export default defineConfig({
  root: 'client',
  plugins: [react()],
  // O programa e a API ficam na mesma origem: o Vite encaminha /api para o servidor (bd/servidor.ts).
  // Assim o cookie da sessão funciona sem configurações de CORS.
  server: { port: 5174, strictPort: true, proxy: { '/api': api } },
  preview: { port: 5174, strictPort: true, proxy: { '/api': api } },
  build: { outDir: '../dist', emptyOutDir: true },
});
