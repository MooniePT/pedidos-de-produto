import { dependencyCycle, normalize, type Command } from '../../domain';
import { Sprint } from '../../model/Sprint';
import type { ContextoComando } from './contexto';

/** Sprints, releases e dependências. O fecho guarda uma cópia histórica dos pedidos. */
export function tratarPlaneamento(contexto: ContextoComando, comando: Command): string | undefined {
  const { dados, agoraIso, exigirPapel, obterPedido, registarHistorico, notificar, gerarId } =
    contexto;

  let resultado: string | undefined;

  switch (comando.type) {
    case 'definirSprintBacklog': {
      exigirPapel('manager');

      if (dados.sprints.some((s) => s.state === 'Ativo')) {
        throw Error('Já existe um sprint ativo. Feche-o antes de iniciar o próximo.');
      }

      if (!comando.name.trim() || !comando.start || !comando.end || comando.end < comando.start) {
        throw Error('Indique o nome e um intervalo de datas válido.');
      }

      const selected = [...new Set(comando.requestIds)];

      if (!selected.length) throw Error('Selecione pelo menos um pedido.');

      if (
        selected.some(
          (i) =>
            obterPedido(i).archived ||
            !['Priorizado', 'Atribuído', 'Em progresso'].includes(obterPedido(i).status),
        )
      ) {
        throw Error('A seleção contém pedidos que não estão disponíveis no backlog.');
      }

      dados.sprints.push({
        id: gerarId(),
        name: comando.name.trim(),
        start: comando.start,
        end: comando.end,
        state: 'Ativo',
        requestIds: selected,
      });

      break;
    }
    case 'fecharSprint': {
      exigirPapel('manager');

      const sprint = dados.sprints.find((s) => s.id === comando.id && s.state === 'Ativo');

      if (!sprint) throw Error('Não existe este sprint ativo.');
      new Sprint(sprint, dados.requests).concluir();

      for (const pm of dados.users.filter((u) => u.role === 'product')) {
        const first = sprint.requestIds[0];

        if (first) notificar(pm.id, obterPedido(first), sprint.name + ' foi fechado.');
      }

      sprint.closedAt = agoraIso;

      for (const rid of sprint.requestIds) {
        const pedido = obterPedido(rid);

        registarHistorico(
          pedido,
          pedido.status === 'Concluído'
            ? 'Arquivado no fecho do sprint'
            : 'Devolvido ao backlog no fecho do sprint',
        );

        if (pedido.assignee) notificar(pedido.assignee, pedido, `${sprint.name} foi fechado.`);
      }

      break;
    }
    case 'guardarRelease': {
      exigirPapel('product');

      const pedido = comando.release;

      if (
        !pedido.name.trim() ||
        !pedido.date ||
        !pedido.milestone.trim() ||
        !pedido.milestoneDate ||
        pedido.milestoneDate > pedido.date
      ) {
        throw Error('Preencha a release e uma milestone anterior ou igual à data prevista.');
      }

      if (
        dados.releases.some(
          (i) => i.id !== pedido.id && normalize(i.name) === normalize(pedido.name),
        )
      ) {
        throw Error('Já existe uma release com esse nome.');
      }

      const existing = dados.releases.find((i) => i.id === pedido.id);

      if (
        pedido.requestIds.some(
          (i) =>
            !['Priorizado', 'Atribuído', 'Em progresso', 'Concluído'].includes(
              obterPedido(i).status,
            ) && !existing?.requestIds.includes(i),
        )
      ) {
        throw Error('Só pode associar pedidos que já foram priorizados.');
      }

      if (
        pedido.requestIds.some((i) =>
          dados.releases.some((x) => x.id !== pedido.id && x.requestIds.includes(i)),
        )
      ) {
        throw Error('Um dos pedidos já está associado a outra release.');
      }

      const release = {
        ...pedido,
        id: pedido.id || gerarId(),
        name: pedido.name.trim(),
        milestone: pedido.milestone.trim(),
        requestIds: [...new Set(pedido.requestIds)],
      };

      if (existing) {
        Object.assign(existing, release);
      } else {
        dados.releases.push(release);
      }

      resultado = release.id;
      break;
    }
    case 'adicionarDependencia': {
      exigirPapel('product');
      obterPedido(comando.from);
      obterPedido(comando.to);

      if (dados.dependencies.some((e) => e.from === comando.from && e.to === comando.to)) {
        throw Error('Esta dependência já existe.');
      }

      if (dependencyCycle(dados.dependencies, comando.from, comando.to)) {
        throw Error('Esta dependência cria um ciclo.');
      }

      dados.dependencies.push({ from: comando.from, to: comando.to });
      break;
    }
    case 'removerDependencia': {
      exigirPapel('product');

      dados.dependencies = dados.dependencies.filter(
        (e) => e.from !== comando.from || e.to !== comando.to,
      );

      break;
    }
  }

  return resultado;
}
