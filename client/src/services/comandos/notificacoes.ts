import { type Command } from '../../domain';
import type { ContextoComando } from './contexto';

/** Preferências e leitura de notificações do próprio utilizador. */
export function tratarNotificacoes(
  contexto: ContextoComando,
  comando: Command,
): string | undefined {
  const { dados, utilizador } = contexto;
  let resultado: string | undefined;

  switch (comando.type) {
    case 'marcarComoLida': {
      const n = dados.notifications.find((n) => n.id === comando.id && n.user === utilizador.id);

      if (n) n.read = true;
      break;
    }
    case 'marcarTodasComoLidas':
      for (const n of dados.notifications) if (n.user === utilizador.id) n.read = true;
      break;
    case 'configurarNotificacoes':
      utilizador.preference = comando.value;
      break;
  }

  return resultado;
}
