import {
  MENSAGEM_NOTA_EM_FALTA,
  podeEscreverWorkspace,
  podeVotar,
  type Request,
  type Status,
  type User,
} from '../domain';
import { Workspace } from './Workspace';

/** Operações de domínio com os nomes do Diagrama de Classes geral.
 * Os dados continuam serializáveis para o adaptador local e a futura API.
 */
export class PedidoFuncionalidade {
  constructor(
    readonly dados: Request,
    private readonly utilizadores: User[] = [],
  ) {}

  // Preserva a versão anterior antes de modificar o título e a descrição. O autor do pedido permanece o mesmo.
  editar(titulo: string, descricao: string, autor: string): void {
    const pedido = this.dados;

    pedido.versions.push({
      number: pedido.versions.length + 1,
      date: new Date().toISOString(),
      user: autor,
      title: pedido.title,
      description: pedido.description,
      product: pedido.product,
    });

    pedido.title = titulo.trim();
    pedido.description = descricao.trim();
  }

  // Atualiza o estado. As permissões e as transições permitidas são verificadas pelo comando que chama este método.
  alterarEstado(novo: Status, autor: User): void {
    if (!autor.id) throw Error('Autor obrigatório.');
    this.dados.status = novo;
  }

  getEstado(): Status {
    return this.dados.status;
  }

  getAutor(): User {
    const autor = this.utilizadores.find((utilizador) => utilizador.id === this.dados.submittedBy);

    if (!autor) throw Error('Autor não encontrado.');

    return autor;
  }

  getWorkspace(): Workspace | null {
    return this.dados.workspace ? new Workspace(this.dados) : null;
  }

  setWorkspace(workspace: Workspace): void {
    if (workspace.dados.id !== this.dados.id) throw Error('O Workspace pertence a outro pedido.');
    this.dados.workspace = workspace.dados.workspace;
    this.dados.workspaceCreatedAt = workspace.dados.workspaceCreatedAt;
    this.dados.members = [...workspace.dados.members];
  }

  // Um cliente só pode ter um voto neste pedido. Remover e voltar a votar são operações explícitas.
  adicionarVoto(cliente: User): void {
    if (!podeVotar(this.dados)) throw Error('O pedido está concluído e já não aceita votos.');
    if (this.dados.votes.includes(cliente.id)) throw Error('Já votou neste pedido.');

    this.dados.votes.push(cliente.id);
  }

  removerVoto(cliente: User): void {
    if (!podeVotar(this.dados)) throw Error('O pedido está concluído e já não aceita votos.');

    this.dados.votes = this.dados.votes.filter((id) => id !== cliente.id);
  }

  // Comentários pertencem ao Workspace privado e só podem mencionar os seus membros.
  adicionarComentario(texto: string, autor: User, mencoes: string[] = []): void {
    if (!podeEscreverWorkspace(this.dados, autor)) {
      throw Error('O Workspace está em modo de leitura ou não é membro.');
    }

    if (!texto.trim() || texto.trim().length > 1000) {
      throw Error('O comentário deve ter entre 1 e 1000 carateres.');
    }

    if (mencoes.some((id) => !this.dados.members.includes(id))) {
      throw Error('Só pode mencionar membros do Workspace.');
    }

    this.dados.comments.push({
      id: crypto.randomUUID(),
      user: autor.id,
      date: new Date().toISOString(),
      text: texto.trim(),
      mentions: [...new Set(mencoes)],
    });
  }

  atribuir(developer: User): void {
    if (developer.role !== 'developer') throw Error('Selecione um Developer.');
    this.dados.assignee = developer.id;
  }

  definirPriorizacao(priorizacao: Pick<Request, 'impact' | 'effort' | 'priority'>): void {
    Object.assign(this.dados, priorizacao);
  }

  associarPedidoOriginal(original: PedidoFuncionalidade): void {
    const mesmoPedido = original.dados.id === this.dados.id;
    const originalDuplicado = original.getEstado() === 'Duplicado';
    const outroProduto = original.dados.product !== this.dados.product;

    if (mesmoPedido || originalDuplicado || outroProduto) {
      throw Error('Pedido original inválido.');
    }

    this.dados.originalId = original.dados.id;
  }

  devolver(motivo: string): void {
    this.dados.reason = motivo.trim();
    this.dados.status = 'Devolvido';
  }

  rejeitar(motivo: string, autor: User): void {
    this.dados.reason = motivo.trim();
    this.alterarEstado('Rejeitado', autor);
  }

  getDeveloper(): User | null {
    return this.utilizadores.find((utilizador) => utilizador.id === this.dados.assignee) || null;
  }

  // A conclusão exige o Developer responsável e uma nota; guarda também a data para as métricas.
  concluir(nota: string, autor: User): void {
    if (autor.id !== this.dados.assignee || this.dados.status !== 'Em progresso') {
      throw Error('Só pode concluir um pedido seu em progresso.');
    }

    if (!nota.trim()) {
      throw Error(MENSAGEM_NOTA_EM_FALTA);
    }

    if (nota.trim().length > 1000) {
      throw Error('A nota de resolução tem um máximo de 1000 carateres.');
    }

    this.dados.resolution = nota.trim();
    this.dados.completedAt = new Date().toISOString();
    this.alterarEstado('Concluído', autor);
  }
}
