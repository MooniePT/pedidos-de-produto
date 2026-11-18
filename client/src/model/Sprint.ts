/** Agrupa os pedidos de um período. Ao concluir, preserva o estado no fecho para não alterar o histórico de sprints. */
import type { Sprint as DadosSprint, Request } from '../domain';

export class Sprint {
  constructor(
    readonly dados: DadosSprint,
    private readonly pedidos: Request[],
  ) {}

  adicionarPedido(pedido: Request): void {
    if (this.dados.state !== 'Ativo') throw Error('O sprint não está ativo.');
    if (!this.dados.requestIds.includes(pedido.id)) this.dados.requestIds.push(pedido.id);
  }

  removerPedido(pedido: Request): void {
    if (this.dados.state !== 'Ativo') throw Error('O sprint não está ativo.');
    this.dados.requestIds = this.dados.requestIds.filter((id) => id !== pedido.id);
  }

  getPedidos(): Request[] {
    return this.dados.requestIds.map((id) => {
      const pedido = this.pedidos.find((pedido) => pedido.id === id);

      if (!pedido) throw Error('Pedido do sprint não encontrado.');

      return pedido;
    });
  }

  iniciar(): void {
    this.dados.state = 'Ativo';
  }

  concluir(): void {
    if (this.dados.state !== 'Ativo') throw Error('O sprint não está ativo.');

    this.dados.snapshot = this.getPedidos().map((pedido) => {
      if (pedido.status === 'Concluído') pedido.archived = true;

      return {
        id: pedido.id,
        code: pedido.code,
        title: pedido.title,
        status: pedido.status,
        assignee: pedido.assignee,
      };
    });

    this.dados.state = 'Fechado';
    this.dados.closedAt = new Date().toISOString();
  }
}
