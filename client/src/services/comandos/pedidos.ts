import { editable, validateRequest, type Command, type Request } from '../../domain';
import type { ContextoComando } from './contexto';

/** Submissão, edição, votos e triagem: valida quem pode agir e em que estado está o pedido. */
export function tratarPedidos(contexto: ContextoComando, comando: Command): string | undefined {
  const {
    dados,
    utilizador,
    agoraIso,
    exigirPapel,
    colecao,
    obterPedido,
    obterModelo,
    registarHistorico,
    transitarEstado,
    gerarId,
  } = contexto;

  let resultado: string | undefined;

  switch (comando.type) {
    case 'submeterPedido': {
      exigirPapel('customer');

      const dadosPedido = comando.input;

      validateRequest(dadosPedido);

      const code = `P-${String(++dados.sequence).padStart(3, '0')}`;

      const pedido: Request = {
        id: gerarId(),
        code,
        title: dadosPedido.title.trim(),
        description: dadosPedido.description.trim(),
        product: dadosPedido.product,
        tags: [],
        status: 'Submetido',
        author: utilizador.name,
        submittedBy: utilizador.id,
        votes: [],
        voteOffset: 0,
        date: agoraIso,
        updated: agoraIso,
        versions: [],
        history: [],
        reason: '',
        originalId: '',
        priority: '',
        impact: '',
        effort: '',
        story: '',
        criteria: [],
        assignee: '',
        assignedAt: '',
        startedAt: '',
        completedAt: '',
        resolution: '',
        links: [],
        members: [utilizador.id],
        workspace: '',
        workspaceCreatedAt: '',
        comments: [],
        files: [],
        archived: false,
      };

      registarHistorico(pedido, 'Pedido submetido');
      colecao.addPedido(pedido);
      resultado = pedido.id;
      break;
    }
    case 'editar': {
      exigirPapel('customer', 'manager', 'product');

      const pedido = obterPedido(comando.id);

      const customerEdit =
        utilizador.role === 'customer' &&
        pedido.submittedBy === utilizador.id &&
        editable.includes(pedido.status);

      const teamEdit = utilizador.role === 'manager' && pedido.status === 'Em triagem';

      if (!customerEdit && !teamEdit) {
        throw Error('Este pedido não pode ser editado por si neste estado.');
      }

      if (pedido.versions.length + 1 !== comando.version) {
        throw Error('O pedido foi alterado entretanto. Reabra-o antes de guardar.');
      }

      validateRequest(comando.input);
      obterModelo(pedido).editar(comando.input.title, comando.input.description, utilizador.id);

      if (
        comando.input.product !== pedido.product &&
        utilizador.role === 'customer' &&
        pedido.status !== 'Submetido'
      ) {
        throw Error('O produto só pode ser alterado pelo autor antes da triagem.');
      }

      pedido.product = comando.input.product;

      const old = pedido.status;

      if (old === 'Devolvido') {
        pedido.status = 'Submetido';
        pedido.reason = '';
      }

      registarHistorico(
        pedido,
        old === 'Devolvido' ? 'Pedido completado e reenviado' : 'Pedido editado',
        old,
      );

      resultado = pedido.id;
      break;
    }
    case 'adicionarVoto':
    case 'removerVoto': {
      exigirPapel('customer');

      const pedido = obterPedido(comando.id);

      if (comando.type === 'adicionarVoto') {
        obterModelo(pedido).adicionarVoto(utilizador);
      } else {
        obterModelo(pedido).removerVoto(utilizador);
      }

      break;
    }
    case 'triarPedido': {
      exigirPapel('manager');

      const pedido = obterPedido(comando.id);

      if (pedido.status === 'Submetido') {
        transitarEstado(pedido, 'Em triagem', 'Triagem iniciada');
      } else if (pedido.status !== 'Em triagem') throw Error('O pedido já não aguarda triagem.');

      break;
    }
    case 'alterarEstado': {
      const pedido = obterPedido(comando.id);

      if (['Confirmado', 'Devolvido', 'Duplicado'].includes(comando.status)) {
        exigirPapel('manager');

        if (!['Submetido', 'Em triagem'].includes(pedido.status)) {
          throw Error('O pedido já não aguarda triagem.');
        }
      } else {
        exigirPapel('product');
        if (pedido.status !== 'Confirmado') throw Error('Só pode decidir pedidos confirmados.');
      }

      if (
        ['Devolvido', 'Rejeitado'].includes(comando.status) &&
        (!comando.reason?.trim() || comando.reason.trim().length > 500)
      ) {
        throw Error('Indique um motivo entre 1 e 500 carateres.');
      }

      if (comando.status === 'Duplicado') {
        const original = obterPedido(comando.originalId || '');

        if (
          original.id === pedido.id ||
          original.status === 'Duplicado' ||
          original.product !== pedido.product
        ) {
          throw Error('Selecione um pedido original válido do mesmo produto.');
        }

        obterModelo(pedido).associarPedidoOriginal(obterModelo(original));
      }

      pedido.reason = comando.reason?.trim() || '';
      transitarEstado(pedido, comando.status, `Estado alterado para ${comando.status}`);
      break;
    }
  }

  return resultado;
}
