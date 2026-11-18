/** Coleção de pedidos do backlog. A ordenação usa a prioridade definida pelo Product Manager. */
import type { Request } from '../domain';

export class Backlog {
  constructor(private pedidos: Request[]) {}

  adicionarPedido(pedido: Request): void {
    if (!this.pedidos.some((pedidoExistente) => pedidoExistente.id === pedido.id)) {
      this.pedidos.push(pedido);
    }
  }

  removerPedido(pedido: Request): void {
    this.pedidos = this.pedidos.filter((pedidoExistente) => pedidoExistente.id !== pedido.id);
  }

  ordenarPorPrioridade(): void {
    const ordem = { Alta: 0, Média: 1, Baixa: 2, '': 3 };

    this.pedidos.sort((pedidoA, pedidoB) => ordem[pedidoA.priority] - ordem[pedidoB.priority]);
  }

  getPedidos(): Request[] {
    return [...this.pedidos];
  }
}
