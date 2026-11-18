/** Apresenta uma data ISO no formato português; datas sem hora são interpretadas ao meio-dia para evitar alterações de dia por fuso horário. */
export const date = (value: string) =>
  value
    ? new Intl.DateTimeFormat('pt-PT', {
        dateStyle: 'medium',
        ...(value.includes('T') ? { timeStyle: 'short' as const } : {}),
      }).format(new Date(value.length === 10 ? value + 'T12:00:00' : value))
    : '—';
