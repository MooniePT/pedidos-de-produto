import {
  podeEscreverWorkspace,
  type Database,
  type Request,
  type Status,
  type User,
} from '../../domain';
import { ColecaoPedidos } from '../../model/ColecaoPedidos';
import { PedidoFuncionalidade } from '../../model/PedidoFuncionalidade';

const gerarId = () => crypto.randomUUID();

/** Texto da notificação ao autor do pedido, ou null quando o documento não prevê notificação. */
function mensagemParaAutor(pedido: Request, status: Status, dados: Database): string | null {
  switch (status) {
    case 'Devolvido': // NOT-3
      return 'Pedido devolvido. Complete a informação em falta.';
    case 'Duplicado': {
      // NOT-4 (US9 CA2): o pedido já está a ser tratado no original.
      const original = dados.requests.find((r) => r.id === pedido.originalId);

      return `Já está a ser tratado no pedido ${original?.code ?? 'original'}.`;
    }
    case 'Aprovado': // NOT-5
      return 'Pedido aprovado.';
    case 'Rejeitado': // NOT-6
      return 'Pedido rejeitado.';
    case 'Em progresso': // NOT-8 (o gestor de projeto é notificado em implementacao.ts)
      return 'O trabalho no pedido começou.';
    default:
      return null;
  }
}

/** Cria uma cópia de trabalho: se uma regra lançar um erro, os dados anteriores não são modificados. */
export function criarContexto(dadosAtuais: Database, utilizadorId: string) {
  const dados = structuredClone(dadosAtuais);
  const utilizador = dados.users.find((u) => u.id === utilizadorId);

  if (!utilizador) throw Error('Inicie sessão para continuar.');

  const agoraIso = new Date().toISOString();

  const exigirPapel = (...roles: User['role'][]) => {
    if (!roles.includes(utilizador.role)) throw Error('O seu perfil não permite esta operação.');
  };

  const colecao = new ColecaoPedidos(dados);
  const obterPedido = (rid: string) => colecao.findPedido(rid);
  const obterModelo = (pedido: Request) => new PedidoFuncionalidade(pedido, dados.users);

  const registarHistorico = (pedido: Request, action: string, from?: Status) => {
    pedido.updated = agoraIso;

    pedido.history.push({
      id: gerarId(),
      date: agoraIso,
      user: utilizador.id,
      action,
      from,
      to: pedido.status,
    });
  };

  const notificar = (uid: string, pedido: Request, message: string, relevant = true) => {
    dados.notifications.unshift({
      id: gerarId(),
      user: uid,
      requestId: pedido.id,
      message,
      date: agoraIso,
      read: false,
      relevant,
    });
  };

  const transitarEstado = (pedido: Request, status: Status, action: string) => {
    const previous = pedido.status;

    if (status === 'Devolvido') {
      obterModelo(pedido).devolver(pedido.reason);
    } else if (status === 'Rejeitado') {
      obterModelo(pedido).rejeitar(pedido.reason, utilizador);
    } else {
      obterModelo(pedido).alterarEstado(status, utilizador);
    }

    registarHistorico(pedido, action, previous);

    // NOT-3 a NOT-9: o autor só é notificado nestas mudanças de estado.
    // Triagem, confirmação, priorização e atribuição não geram notificação para o autor.
    const mensagem = mensagemParaAutor(pedido, status, dados);

    if (mensagem) notificar(pedido.submittedBy, pedido, `${pedido.code} · ${mensagem}`);
  };

  const obterWorkspaceEditavel = (rid: string) => {
    const pedido = obterPedido(rid);

    if (!pedido.workspace) throw Error('Crie primeiro o workspace.');

    if (!pedido.members.includes(utilizador.id) || utilizador.role !== 'customer') {
      throw Error('Só os membros do Workspace podem alterar este espaço.');
    }

    if (!podeEscreverWorkspace(pedido, utilizador)) {
      throw Error('O workspace está em modo de leitura.');
    }

    return pedido;
  };

  return {
    dados,
    utilizador,
    agoraIso,
    exigirPapel,
    colecao,
    obterPedido,
    obterModelo,
    registarHistorico,
    notificar,
    transitarEstado,
    obterWorkspaceEditavel,
    gerarId,
  };
}

export type ContextoComando = ReturnType<typeof criarContexto>;
