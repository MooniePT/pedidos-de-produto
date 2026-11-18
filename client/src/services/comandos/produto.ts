import { normalize, textoDecisaoIA, type Command } from '../../domain';
import type { ContextoComando } from './contexto';

/** Decisões de produto: priorização, requisitos e tags. As sugestões nunca substituem a decisão humana. */
export function tratarProduto(contexto: ContextoComando, comando: Command): string | undefined {
  const { dados, exigirPapel, obterPedido, obterModelo, registarHistorico, transitarEstado } =
    contexto;

  let resultado: string | undefined;

  switch (comando.type) {
    case 'definirPriorizacao': {
      exigirPapel('product');

      const pedido = obterPedido(comando.id);

      if (!['Aprovado', 'Priorizado'].includes(pedido.status)) {
        throw Error('Só pode priorizar um pedido aprovado.');
      }

      if (!comando.impact || !comando.effort || !comando.priority) {
        throw Error('Preencha impacto, esforço e prioridade.');
      }

      obterModelo(pedido).definirPriorizacao({
        impact: comando.impact,
        effort: comando.effort,
        priority: comando.priority,
      });

      transitarEstado(
        pedido,
        'Priorizado',
        'Prioridade guardada' + textoDecisaoIA(comando.decisaoIA),
      );
      break;
    }
    case 'definirCriteriosAceitacao': {
      exigirPapel('product');

      const pedido = obterPedido(comando.id);

      if (!['Aprovado', 'Priorizado', 'Atribuído'].includes(pedido.status)) {
        throw Error('Só pode alterar critérios antes do início da implementação.');
      }

      const criteria = comando.criteria.map((s) => s.trim());

      if (!comando.story.trim() || comando.story.trim().length > 1000) {
        throw Error('A user story deve ter entre 1 e 1000 carateres.');
      }

      if (!criteria.length || criteria.some((s) => !s || s.length > 1000)) {
        throw Error('Preencha pelo menos um critério, até 1000 carateres.');
      }

      if (new Set(criteria.map(normalize)).size !== criteria.length) {
        throw Error('Este critério já existe.');
      }

      pedido.story = comando.story.trim();
      pedido.criteria = criteria;
      registarHistorico(
        pedido,
        'User story e critérios guardados' + textoDecisaoIA(comando.decisaoIA),
      );
      break;
    }
    case 'atribuirTags': {
      exigirPapel('product');

      const pedido = obterPedido(comando.id);

      if (comando.tags.some((t) => !dados.tags.includes(t))) throw Error('Selecione tags válidas.');
      pedido.tags = [...new Set(comando.tags)];
      registarHistorico(pedido, 'Tags atualizadas');
      break;
    }
    case 'gerirTags': {
      exigirPapel('product');

      const name = comando.name.trim();
      const old = comando.previous || name;

      if (comando.op !== 'delete' && (!name || name.length > 50)) {
        throw Error('O nome deve ter entre 1 e 50 carateres.');
      }

      if (
        comando.op !== 'delete' &&
        dados.tags.some((t) => normalize(t) === normalize(name) && t !== comando.previous)
      ) {
        throw Error('Esta tag já existe');
      }

      if (comando.op === 'create') {
        dados.tags.push(name);
      } else {
        if (!dados.tags.includes(old)) throw Error('A tag já não existe.');

        if (comando.op === 'delete' && dados.requests.some((pedido) => pedido.tags.includes(old))) {
          throw Error('Esta tag está em uso e não pode ser eliminada.');
        }

        dados.tags = dados.tags.filter((t) => t !== old);

        if (comando.op === 'edit') {
          dados.tags.push(name);

          for (const pedido of dados.requests)
            pedido.tags = pedido.tags.map((t) => (t === old ? name : t));
        }
      }

      break;
    }
  }

  return resultado;
}
