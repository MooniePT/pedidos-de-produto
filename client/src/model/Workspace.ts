import { workspaceApenasLeitura, type Invite, type Request, type User } from '../domain';

/** Espaço privado de colaboração associado a um único pedido. */
export class Workspace {
  constructor(readonly dados: Request) {}

  adicionarMembro(cliente: User): void {
    if (!this.isAberto()) throw Error('O Workspace está em modo de leitura.');
    if (this.contemMembro(cliente)) throw Error('Já pertence a este Workspace.');
    this.dados.members.push(cliente.id);
  }

  removerMembro(cliente: User): void {
    if (!this.isAberto()) throw Error('O Workspace está em modo de leitura.');

    if (cliente.id === this.dados.submittedBy) {
      throw Error('O autor da submissão não pode ser removido.');
    }

    this.dados.members = this.dados.members.filter((id) => id !== cliente.id);
  }

  contemMembro(cliente: User): boolean {
    return this.dados.members.includes(cliente.id);
  }

  // O token identifica o convite e expira ao completar sete dias. Fica guardado com o pedido na base de dados.
  gerarConvite(): Invite {
    if (!this.isAberto()) throw Error('O Workspace está em modo de leitura.');

    return {
      token: crypto.randomUUID(),
      requestId: this.dados.id,
      expires: new Date(Date.now() + 7 * 86400000).toISOString(),
      createdBy: this.dados.submittedBy,
    };
  }

  // Centraliza a regra temporal e de decisão, para convites e membros respeitarem o mesmo fecho.
  isAberto(): boolean {
    return !workspaceApenasLeitura(this.dados);
  }

  getMembros(): string[] {
    return [...this.dados.members];
  }
}
