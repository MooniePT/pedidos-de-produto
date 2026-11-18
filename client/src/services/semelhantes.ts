// Palavras demasiado comuns para servirem de palavra-chave.
const PALAVRAS_IGNORADAS = new Set([
  'para',
  'como',
  'pelo',
  'pela',
  'mais',
  'menos',
  'muito',
  'uma',
  'umas',
  'uns',
  'com',
  'sem',
  'que',
  'dos',
  'das',
  'nos',
  'nas',
  'por',
  'seja',
  'ser',
  'ter',
  'este',
  'esta',
  'isso',
  'isto',
  'aqui',
  'onde',
  'quando',
  'poder',
  'possa',
]);

export function normalizar(texto = '') {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function palavrasChave(texto: string) {
  return [
    ...new Set(
      normalizar(texto)
        .split(/[^a-z0-9]+/)
        .filter((p) => p.length >= 4 && !PALAVRAS_IGNORADAS.has(p)),
    ),
  ];
}

export function procurarSemelhantes<
  T extends { titulo: string; descricao: string; estado: string },
>(titulo: string, descricao: string, pedidos: T[]): T[] {
  const chaves = palavrasChave(`${titulo} ${descricao}`);

  if (!chaves.length) return [];

  return pedidos
    .filter((p) => !['Rejeitado', 'Duplicado'].includes(p.estado))
    .filter((p) => {
      const texto = normalizar(`${p.titulo} ${p.descricao}`);

      return chaves.some((chave) => texto.includes(chave));
    })
    .slice(0, 3);
}
