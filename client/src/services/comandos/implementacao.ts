import { MENSAGEM_NOTA_EM_FALTA, type Command } from '../../domain';
import type { ContextoComando } from './contexto';

/** Trabalho técnico: atribuição pelo gestor e execução apenas pelo Developer responsável. */
export function tratarImplementacao(
  contexto: ContextoComando,
  comando: Command,
): string | undefined {
  const {
    dados,
    utilizador,
    agoraIso,
    exigirPapel,
    obterPedido,
    obterModelo,
    registarHistorico,
    notificar,
    transitarEstado,
  } = contexto;

  let resultado: string | undefined;

  switch (comando.type) {
    case 'atribuir': {
      exigirPapel('manager');

      const pedido = obterPedido(comando.id);

      if (
        !dados.sprints.some((s) => s.state === 'Ativo' && s.requestIds.includes(pedido.id)) ||
        !['Priorizado', 'Atribuído'].includes(pedido.status) ||
        !pedido.criteria.length
      ) {
        throw Error(
          'A atribuição requer um pedido priorizado, com critérios e incluído no sprint ativo.',
        );
      }

      if (!dados.users.some((u) => u.id === comando.assignee && u.role === 'developer')) {
        throw Error('Selecione um Developer.');
      }

      const anterior = pedido.assignee;

      if (anterior && anterior !== comando.assignee) {
        notificar(anterior, pedido, pedido.code + ' deixou de lhe estar atribuído.');
      }

      obterModelo(pedido).atribuir(dados.users.find((u) => u.id === comando.assignee)!);
      pedido.assignedAt = agoraIso;
      transitarEstado(pedido, 'Atribuído', 'Responsável técnico atribuído');
      notificar(pedido.assignee, pedido, `${pedido.code} foi-lhe atribuído.`);
      break;
    }
    case 'atualizarEstado': {
      exigirPapel('developer');

      const pedido = obterPedido(comando.id);

      if (pedido.assignee !== utilizador.id || pedido.status !== 'Atribuído') {
        throw Error('Só pode iniciar um pedido atribuído a si.');
      }

      pedido.startedAt = agoraIso;
      transitarEstado(pedido, 'Em progresso', 'Trabalho iniciado');
      notificar('jose', pedido, `${pedido.code} · Trabalho iniciado.`);
      break;
    }
    case 'concluir': {
      exigirPapel('developer');

      const pedido = obterPedido(comando.id);

      if (pedido.assignee !== utilizador.id || pedido.status !== 'Em progresso') {
        throw Error('Só pode concluir um pedido seu em progresso.');
      }

      if (!comando.note.trim()) {
        throw Error(MENSAGEM_NOTA_EM_FALTA);
      }

      if (comando.note.trim().length > 1000) {
        throw Error('A nota de resolução tem um máximo de 1000 carateres.');
      }

      const anterior = pedido.status;

      obterModelo(pedido).concluir(comando.note, utilizador);
      registarHistorico(pedido, 'Pedido concluído', anterior);
      notificar(pedido.submittedBy, pedido, pedido.code + ' · Pedido concluído');
      notificar('jose', pedido, `${pedido.code} · Pedido concluído.`);
      break;
    }
    case 'associarCodigo':
    case 'removerCodigo': {
      exigirPapel('developer');

      const pedido = obterPedido(comando.id);

      if (pedido.assignee !== utilizador.id || pedido.status !== 'Em progresso') {
        throw Error('Os links só podem ser alterados durante o trabalho pelo responsável.');
      }

      const url = comando.url.trim();

      if (comando.type === 'associarCodigo') {
        let parsed: URL;

        try {
          parsed = new URL(url);
        } catch {
          throw Error('Introduza um link válido.');
        }

        if (!['https:', 'http:'].includes(parsed.protocol)) {
          throw Error('Use um link HTTP ou HTTPS.');
        }

        if (pedido.links.includes(url)) throw Error('Este link já está associado.');
        pedido.links.push(url);
      } else {
        pedido.links = pedido.links.filter((l) => l !== url);
      }

      registarHistorico(
        pedido,
        comando.type === 'associarCodigo' ? 'Link de código associado' : 'Link de código removido',
      );

      break;
    }
  }

  return resultado;
}
