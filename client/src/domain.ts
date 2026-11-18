export const statuses = [
  'Submetido',
  'Em triagem',
  'Devolvido',
  'Duplicado',
  'Confirmado',
  'Aprovado',
  'Rejeitado',
  'Priorizado',
  'Atribuído',
  'Em progresso',
  'Concluído',
] as const;

export type Status = (typeof statuses)[number];

export type Role = 'customer' | 'manager' | 'product' | 'developer';

export const roleNames: Record<Role, string> = {
  customer: 'Cliente',
  manager: 'Gestor de projeto',
  product: 'Product Manager',
  developer: 'Developer',
};

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  preference: 'all' | 'relevant';
};

export type History = {
  id: string;
  date: string;
  user: string;
  action: string;
  from?: Status;
  to?: Status;
};

export type Version = {
  product: string;
  number: number;
  date: string;
  user: string;
  title: string;
  description: string;
};

export type Comment = { id: string; user: string; date: string; text: string; mentions: string[] };

export type Attachment = {
  id: string;
  name: string;
  type: string;
  size: number;
  data: string;
  user: string;
  date: string;
};

export type Request = {
  id: string;
  code: string;
  title: string;
  description: string;
  product: string;
  tags: string[];
  status: Status;
  author: string;
  submittedBy: string;
  votes: string[];
  voteOffset: number;
  date: string;
  updated: string;
  versions: Version[];
  history: History[];
  reason: string;
  originalId: string;
  priority: 'Alta' | 'Média' | 'Baixa' | '';
  impact: 'Alto' | 'Médio' | 'Baixo' | '';
  effort: 'Alto' | 'Médio' | 'Baixo' | '';
  story: string;
  criteria: string[];
  assignee: string;
  assignedAt: string;
  startedAt: string;
  completedAt: string;
  resolution: string;
  links: string[];
  members: string[];
  workspace: string;
  workspaceCreatedAt: string;
  comments: Comment[];
  files: Attachment[];
  archived: boolean;
};

export type Sprint = {
  id: string;
  name: string;
  start: string;
  end: string;
  state: 'Ativo' | 'Fechado';
  requestIds: string[];
  closedAt?: string;
  snapshot?: { id: string; code: string; title: string; status: Status; assignee: string }[];
};

export type Release = {
  id: string;
  name: string;
  date: string;
  milestone: string;
  milestoneDate: string;
  requestIds: string[];
};

export type Notification = {
  id: string;
  user: string;
  requestId: string;
  message: string;
  date: string;
  read: boolean;
  relevant: boolean;
};

export type Invite = { token: string; requestId: string; expires: string; createdBy: string };

// Estado completo do programa, tal como a API o envia. Não representa uma ligação direta ao MongoDB.
export type Database = {
  schema: 3;
  sequence: number;
  users: User[];
  requests: Request[];
  sprints: Sprint[];
  releases: Release[];
  tags: string[];
  dependencies: { from: string; to: string }[];
  notifications: Notification[];
  invites: Invite[];
};

export type RequestInput = {
  title: string;
  description: string;
  product: string;
};

// Operações aceites pela aplicação. A união discriminada permite ao TypeScript validar os dados exigidos por cada operação.
export type Command =
  | { type: 'submeterPedido'; input: RequestInput }
  | { type: 'editar'; id: string; input: RequestInput; version: number }
  | { type: 'adicionarVoto'; id: string }
  | { type: 'removerVoto'; id: string }
  | { type: 'triarPedido'; id: string }
  | {
      type: 'alterarEstado';
      id: string;
      status: 'Confirmado' | 'Devolvido' | 'Duplicado' | 'Aprovado' | 'Rejeitado';
      reason?: string;
      originalId?: string;
    }
  | {
      type: 'definirPriorizacao';
      id: string;
      impact: Request['impact'];
      effort: Request['effort'];
      priority: Request['priority'];
      decisaoIA?: DecisaoIA;
    }
  | {
      type: 'definirCriteriosAceitacao';
      id: string;
      story: string;
      criteria: string[];
      decisaoIA?: DecisaoIA;
    }
  | { type: 'atribuirTags'; id: string; tags: string[] }
  | { type: 'atribuir'; id: string; assignee: string }
  | { type: 'atualizarEstado'; id: string }
  | { type: 'concluir'; id: string; note: string }
  | { type: 'associarCodigo'; id: string; url: string }
  | { type: 'removerCodigo'; id: string; url: string }
  | { type: 'definirSprintBacklog'; name: string; start: string; end: string; requestIds: string[] }
  | { type: 'fecharSprint'; id: string }
  | { type: 'guardarRelease'; release: Release }
  | { type: 'adicionarDependencia'; from: string; to: string }
  | { type: 'removerDependencia'; from: string; to: string }
  | {
      type: 'gerirTags';
      kind: 'tags';
      op: 'create' | 'edit' | 'delete';
      name: string;
      previous?: string;
    }
  | { type: 'gerarConvite'; id: string }
  | { type: 'aceitarConvite'; token: string }
  | { type: 'removerMembro'; id: string; member: string; remove?: boolean }
  | { type: 'adicionarComentario'; id: string; text: string; mentions: string[] }
  | { type: 'adicionarFicheiro'; id: string; file: Omit<Attachment, 'id' | 'user' | 'date'> }
  | { type: 'removerFicheiro'; id: string; fileId: string }
  | { type: 'marcarComoLida'; id: string }
  | { type: 'marcarTodasComoLidas' }
  | { type: 'configurarNotificacoes'; value: User['preference'] };

export const editable: Status[] = ['Submetido', 'Em triagem', 'Devolvido'];

export const mainSteps: Status[] = [
  'Submetido',
  'Em triagem',
  'Confirmado',
  'Aprovado',
  'Priorizado',
  'Atribuído',
  'Em progresso',
  'Concluído',
];

export function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('pt-PT')
    .trim();
}

export function validateRequest(input: RequestInput) {
  if (!input.title.trim()) throw Error('O título é obrigatório.');
  if (input.title.trim().length > 100) throw Error('O título tem um máximo de 100 carateres.');
  if (!input.description.trim()) throw Error('A descrição é obrigatória.');

  if (input.description.trim().length > 2000) {
    throw Error('A descrição tem um máximo de 2000 carateres.');
  }

  if (!produtos.includes(input.product)) throw Error('Selecione um produto válido.');
}

export function dependencyCycle(edges: Database['dependencies'], from: string, to: string) {
  const seen = new Set<string>();

  function visit(id: string): boolean {
    if (id === from) return true;
    if (seen.has(id)) return false;
    seen.add(id);

    return edges.filter((e) => e.from === id).some((e) => visit(e.to));
  }

  return from === to || visit(to);
}

export const produtos = ['Produto A', 'Produto B', 'Produto C'];

export const PRAZO_WORKSPACE_MS = 14 * 24 * 60 * 60 * 1000;

// WRK-8: a decisão fecha o espaço imediatamente; caso contrário, fecha ao completar 14 dias desde a criação.
const ESTADOS_WORKSPACE_FECHADO: Status[] = [
  'Aprovado',
  'Priorizado',
  'Atribuído',
  'Em progresso',
  'Concluído',
  'Rejeitado',
  'Duplicado',
];

export function workspaceApenasLeitura(r: Request, agora = Date.now()) {
  // O pedido já foi decidido (inclui "Concluído"): ninguém pode comentar.
  if (ESTADOS_WORKSPACE_FECHADO.includes(r.status)) return true;

  // Caso contrário, fecha quando passam 14 dias desde a criação do Workspace.
  if (!r.workspace) return false;

  const criadoEm = Date.parse(r.workspaceCreatedAt);

  if (!Number.isFinite(criadoEm)) return true;

  return agora >= criadoEm + PRAZO_WORKSPACE_MS;
}

// IA-5: o que o Product Manager decidiu sobre uma sugestão da IA.
export type DecisaoIA = 'aceite' | 'ajustada' | 'rejeitada';

// IA-5: texto registado no histórico, a indicar que a decisão foi humana.
export function textoDecisaoIA(decisao: DecisaoIA | undefined) {
  if (!decisao) return '';
  return ` · sugestão da IA ${decisao} (decisão humana do Product Manager)`;
}

// US25 CA2: mensagem quando o developer tenta concluir sem nota de resolução.
export const MENSAGEM_NOTA_EM_FALTA = 'Adicione uma nota com a descrição da resolução';

// US4: um pedido concluído já não aceita votos (nem adicionar nem retirar).
export function podeVotar(r: Request) {
  return r.status !== 'Concluído';
}

// Progresso do pedido: só para quem está envolvido (autor, Gestor de Projeto, Product Manager e developer atribuído).
export function podeVerProgresso(r: Request, u: User | undefined) {
  if (!u) return false;
  if (u.role === 'customer') return r.submittedBy === u.id;
  if (u.role === 'developer') return r.assignee === u.id;
  return true;
}

// VIS-2: os membros consultam o espaço; o Product Manager também consulta, mas não recebe permissão de escrita.
export function podeVerWorkspace(r: Request, u: User | undefined) {
  return !!u && (r.members.includes(u.id) || u.role === 'product');
}

export function podeEscreverWorkspace(r: Request, u: User | undefined, agora = Date.now()) {
  return (
    !!u && u.role === 'customer' && r.members.includes(u.id) && !workspaceApenasLeitura(r, agora)
  );
}
