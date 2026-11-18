/** Acesso e pesquisa dos pedidos, com os nomes do Diagrama de Classes geral assinalado pelo grupo. */
import type { Database, Request, Status, User } from '../domain';
import { normalize } from '../domain';
import { procurarSemelhantes } from '../services/semelhantes';

export class ColecaoPedidos {
  constructor(private readonly db: Database) {}

  findPedido(id: string): Request {
    const r = this.db.requests.find((pedido) => pedido.id === id);

    if (!r) throw Error('Pedido não encontrado.');

    return r;
  }

  addPedido(pedido: Request): void {
    this.db.requests.unshift(pedido);
  }

  pesquisar(texto: string, estado?: Status): Request[] {
    return this.db.requests.filter(
      (pedido) =>
        (!estado || pedido.status === estado) &&
        normalize(pedido.title + ' ' + pedido.description).includes(normalize(texto)),
    );
  }

  findSemelhantes(titulo: string, descricao: string, produto: string): Request[] {
    return procurarSemelhantes(
      titulo,
      descricao,
      this.db.requests
        .filter((pedido) => pedido.product === produto)
        .map((pedido) => ({
          ...pedido,
          titulo: pedido.title,
          descricao: pedido.description,
          estado: pedido.status,
        })),
    );
  }

  findAtribuidos(developer: User): Request[] {
    return this.db.requests.filter((pedido) => pedido.assignee === developer.id);
  }

  findPorConvite(token: string): Request {
    const convite = this.db.invites.find((c) => c.token === token);

    if (!convite) throw Error('Convite inválido.');

    return this.findPedido(convite.requestId);
  }
}
