/**
 * Converte os dados do programa em documentos (uma coleção por classe do diagrama) e o contrário.
 * O programa usa nomes em inglês (Request, votes, assignee); a base de dados usa os do diagrama.
 */
import { produtos as PRODUTOS_DO_PROGRAMA, workspaceApenasLeitura } from '../client/src/domain';
import type { Database, Request, Role, Status, User } from '../client/src/domain';
import { SUBCLASSES_UTILIZADOR, TipoMetrica } from './esquema';

export type Documento = { _id: string } & Record<string, unknown>;

export type Documentos = Record<string, Documento[]>;

type Linha = Record<string, any>;

// Perfil do programa -> subclasse de Utilizador (nome da coleção).
const SUBCLASSE: Record<Role, (typeof SUBCLASSES_UTILIZADOR)[number]> = {
  customer: 'Cliente',
  manager: 'GestorDeProjeto',
  product: 'ProductManager',
  developer: 'Developer',
};

const FILTRO: Record<User['preference'], string> = {
  all: 'Todas',
  relevant: 'ApenasMencoesEAlteracoes',
};

// Estado do programa -> valor do enum EstadoPedido.
const ESTADO: Record<Status, string> = {
  Submetido: 'Submetido',
  'Em triagem': 'EmTriagem',
  Devolvido: 'Devolvido',
  Duplicado: 'Duplicado',
  Confirmado: 'Confirmado',
  Aprovado: 'Aprovado',
  Rejeitado: 'Rejeitado',
  Priorizado: 'Priorizado',
  Atribuído: 'Atribuido',
  'Em progresso': 'EmProgresso',
  Concluído: 'Concluido',
};

// Impacto e esforço (Alto/Médio/Baixo) e prioridade (Alta/Média/Baixa) -> enum Nivel.
const NIVEL: Record<string, string> = {
  Alto: 'Alto',
  Alta: 'Alto',
  Médio: 'Medio',
  Média: 'Medio',
  Baixo: 'Baixo',
  Baixa: 'Baixo',
};

const IMPACTO = { Alto: 'Alto', Medio: 'Médio', Baixo: 'Baixo' } as const;

const PRIORIDADE = { Alto: 'Alta', Medio: 'Média', Baixo: 'Baixa' } as const;

const DECISAO = { aceite: 'Aceite', ajustada: 'Ajustada', rejeitada: 'Rejeitada' } as const;

const inverso = <K extends string>(mapa: Record<K, string>, valor: unknown): K => {
  const chave = (Object.keys(mapa) as K[]).find((k) => mapa[k] === valor);

  if (!chave) throw Error(`Valor desconhecido na base de dados: ${String(valor)}`);

  return chave;
};

// No programa as datas são texto; na base de dados são Date (ou null quando não há).
const data = (texto: string | undefined) => (texto ? new Date(texto) : null);

// Datas sem hora (sprints, releases, milestones): "2026-11-20" -> Date à meia-noite UTC.
const dia = (texto: string | undefined) => (texto ? new Date(texto + 'T00:00:00.000Z') : null);

const iso = (valor: unknown) => (valor instanceof Date ? valor.toISOString() : '');

const diaDe = (valor: unknown) => (valor instanceof Date ? valor.toISOString().slice(0, 10) : '');

const nulo = (texto: string) => texto || null;

const textoDe = (valor: unknown) => (typeof valor === 'string' ? valor : '');

const nivel = (texto: string) => NIVEL[texto] ?? null;

// O _id é a chave técnica do MongoDB. Nas classes sem identificador no diagrama,
// leva a posição na lista para manter a ordem (ex.: "p-41#0002#h3").
const pos = (n: number) => String(n).padStart(6, '0');

const ultimoSegmento = (id: string) => id.slice(id.lastIndexOf('#') + 1);

// Número do código "P-052" -> 52 (só para ordenar).
const numeroDoCodigo = (codigo: string) => Number(codigo.replace(/^P-/, ''));

// Bases de dados antigas guardavam o id do pedido como número (52 -> "P-052").
const codigoDe = (id: string | number) =>
  typeof id === 'number' ? `P-${String(id).padStart(3, '0')}` : id;

// Decisão sobre a sugestão da IA, registada no histórico pelo programa (IA-5).
function decisaoIA(acao: string) {
  const m = /sugestão da IA (aceite|ajustada|rejeitada)/.exec(acao);

  return m ? DECISAO[m[1] as keyof typeof DECISAO] : null;
}

// Tipo da notificação, a partir da mensagem que o programa escreve.
function tipoNotificacao(mensagem: string) {
  if (/mencionou-o/.test(mensagem)) return 'Mencao';
  if (/convite/i.test(mensagem)) return 'Convite';
  if (/atribuído/.test(mensagem)) return 'Atribuicao';
  if (/foi fechado/.test(mensagem)) return 'Sprint';

  return 'AlteracaoEstado';
}

// O Workspace existe na base de dados a partir do primeiro convite (Cliente cria Workspace;
// Workspace gera ConviteLink). Para o programa só existe quando alguém aceita (dataCriacao).
const temWorkspace = (r: Request, estado: Database) =>
  !!r.workspace ||
  r.files.length > 0 ||
  estado.invites.some((c) => c.requestId === r.id) ||
  r.members.length !== 1 ||
  r.members[0] !== r.submittedBy;

const media = (valores: number[]) =>
  valores.length ? valores.reduce((a, b) => a + b, 0) / valores.length : null;

const dias = (a: string, b: string) => (Date.parse(b) - Date.parse(a)) / 86400000;

const APROVADOS: Status[] = ['Aprovado', 'Priorizado', 'Atribuído', 'Em progresso', 'Concluído'];

/** Metrica: os sete tipos de TipoMetrica, calculados como no ecrã de métricas (US18). */
function metricas(estado: Database): Record<(typeof TipoMetrica)[number], number | null> {
  const pedidos = estado.requests;
  const concluidos = pedidos.filter((r) => r.completedAt);
  const aprovados = pedidos.filter((r) => APROVADOS.includes(r.status)).length;
  const rejeitados = pedidos.filter((r) => r.status === 'Rejeitado').length;
  const naRelease = estado.releases.map((rel) =>
    pedidos.filter((r) => rel.requestIds.includes(r.id)),
  );
  const planeadas = naRelease.reduce((t, l) => t + l.length, 0);
  const feitas = naRelease.reduce(
    (t, l) => t + l.filter((r) => r.status === 'Concluído').length,
    0,
  );
  const developers = estado.users.filter((u) => u.role === 'developer');
  const ativos = pedidos.filter((r) => ['Atribuído', 'Em progresso'].includes(r.status));

  return {
    PedidosSubmetidos: pedidos.length,
    AprovadosVsRejeitados:
      aprovados + rejeitados ? Math.round((aprovados / (aprovados + rejeitados)) * 100) : null,
    FeaturesPorRelease: estado.releases.length ? planeadas / estado.releases.length : null,
    LeadTime: media(concluidos.map((r) => dias(r.date, r.completedAt))),
    CycleTime: media(
      concluidos.filter((r) => r.startedAt).map((r) => dias(r.startedAt, r.completedAt)),
    ),
    CargaDaEquipa: developers.length ? ativos.length / developers.length : null,
    ProgressoDoRoadmap: planeadas ? Math.round((feitas / planeadas) * 100) : null,
  };
}

/** Dados do programa -> documentos. */
export function paraDocumentos(estado: Database): Documentos {
  const docs: Documentos = {};

  for (const nome of SUBCLASSES_UTILIZADOR) docs[nome] = [];

  // id: int = posição do utilizador (as contas nunca mudam de lugar nem são apagadas).
  estado.users.forEach((u, i) =>
    docs[SUBCLASSE[u.role]].push({
      _id: u.id,
      id: i + 1,
      nome: u.name,
      email: u.email,
      filtroNotificacao: FILTRO[u.preference],
    }),
  );

  const nomesProdutos = [
    ...new Set([...PRODUTOS_DO_PROGRAMA, ...estado.requests.map((r) => r.product)]),
  ];

  docs.Produto = nomesProdutos.map((nome, i) => ({ _id: nome, id: i + 1, nome }));
  docs.Tag = estado.tags.map((nome, i) => ({ _id: nome, id: i + 1, nome }));

  const r = estado.requests;

  docs.PedidoFuncionalidade = r.map((p) => ({
    _id: p.id,
    id: p.code,
    titulo: p.title,
    descricao: p.description,
    estado: ESTADO[p.status],
    dataCriacao: data(p.date),
    motivo: nulo(p.reason),
    notaResolucao: nulo(p.resolution),
    autor: p.submittedBy,
    produto: p.product,
    tags: p.tags,
    developer: nulo(p.assignee),
    pedidoOriginal: nulo(p.originalId),
    dependencias: estado.dependencies.filter((d) => d.from === p.id).map((d) => d.to),
    arquivado: p.archived,
    votosDemonstracao: p.voteOffset,
    atualizadoEm: data(p.updated),
    dataAtribuicao: data(p.assignedAt),
    dataInicio: data(p.startedAt),
    dataConclusao: data(p.completedAt),
  }));

  docs.VersaoPedido = r.flatMap((p) =>
    p.versions.map((v) => ({
      _id: `${p.id}#${pos(v.number)}`,
      numeroVersao: v.number,
      titulo: v.title,
      descricao: v.description,
      dataEdicao: data(v.date),
      pedidoFuncionalidade: p.id,
      utilizador: v.user,
      produto: v.product,
    })),
  );

  docs.HistoricoEstado = r.flatMap((p) =>
    p.history.map((h, i) => ({
      _id: `${p.id}#${pos(i)}#${h.id}`,
      estadoAnterior: h.from ? ESTADO[h.from] : null,
      novoEstado: h.to ? ESTADO[h.to] : null,
      data: data(h.date),
      pedidoFuncionalidade: p.id,
      autor: h.user,
      acao: h.action,
    })),
  );

  // A data do voto é posta pela base de dados quando o voto é criado (ver ligacao.ts).
  docs.Voto = r.flatMap((p) =>
    p.votes.map((cliente) => ({ _id: `${p.id}#${cliente}`, pedidoFuncionalidade: p.id, cliente })),
  );

  docs.Priorizacao = r
    .filter((p) => p.impact || p.effort || p.priority)
    .map((p) => ({
      _id: p.id,
      impacto: nivel(p.impact),
      esforco: nivel(p.effort),
      prioridade: nivel(p.priority),
      pedidoFuncionalidade: p.id,
    }));

  // SugestaoIA: uma por decisão registada no histórico. Os níveis só são conhecidos quando a
  // última sugestão foi aceite (ficam iguais à priorização guardada).
  docs.SugestaoIA = r.flatMap((p) => {
    const sugestoes = p.history
      .map((h, i) => ({ i, acao: h.action, decisao: decisaoIA(h.action) }))
      .filter((h) => h.decisao && h.acao.startsWith('Prioridade guardada'));

    return sugestoes.map((s, n) => {
      const conhecida = s.decisao === 'Aceite' && n === sugestoes.length - 1;

      return {
        _id: `${p.id}#${pos(s.i)}`,
        impacto: conhecida ? nivel(p.impact) : null,
        esforco: conhecida ? nivel(p.effort) : null,
        prioridade: conhecida ? nivel(p.priority) : null,
        decisao: s.decisao!,
        pedidoFuncionalidade: p.id,
      };
    });
  });

  docs.UserStory = r
    .filter((p) => p.story || p.criteria.length)
    .map((p) => {
      const ultima = [...p.history]
        .reverse()
        .find((h) => h.action.startsWith('User story e critérios guardados'));
      const decisao = ultima ? decisaoIA(ultima.action) : null;

      return {
        _id: p.id,
        texto: p.story,
        geradaPorIA: decisao === 'Aceite' || decisao === 'Ajustada',
        pedidoFuncionalidade: p.id,
      };
    });

  docs.CriterioAceitacao = r.flatMap((p) =>
    p.criteria.map((texto, i) => ({ _id: `${p.id}#${pos(i)}`, texto, userStory: p.id })),
  );

  docs.LinkCodigo = r.flatMap((p) =>
    p.links.map((url, i) => ({
      _id: `${p.id}#${pos(i)}`,
      url,
      pedidoFuncionalidade: p.id,
      developer: nulo(p.assignee),
    })),
  );

  docs.Workspace = r
    .filter((p) => temWorkspace(p, estado))
    .map((p) => ({
      _id: p.id,
      nome: p.workspace || p.title.slice(0, 50),
      somenteLeitura: workspaceApenasLeitura(p),
      dataCriacao: data(p.workspaceCreatedAt),
      pedidoFuncionalidade: p.id,
      cliente: p.submittedBy,
      participantes: p.members,
      ficheiros: p.files.map((f) => ({
        id: f.id,
        nome: f.name,
        tipo: f.type,
        tamanho: f.size,
        conteudo: f.data,
        utilizador: f.user,
        data: data(f.date),
      })),
    }));

  docs.ConviteLink = estado.invites.map((c) => ({
    _id: c.token,
    link: `/convite?token=${c.token}`,
    dataExpiracao: data(c.expires),
    workspace: c.requestId,
  }));

  docs.Comentario = r.flatMap((p) =>
    p.comments.map((c, i) => ({
      _id: `${p.id}#${pos(i)}#${c.id}`,
      texto: c.text,
      data: data(c.date),
      utilizador: c.user,
      pedidoFuncionalidade: p.id,
      mencoes: c.mentions,
    })),
  );

  // As notificações novas entram no início da lista: a posição conta-se a partir do fim.
  const total = estado.notifications.length;

  docs.Notificacao = estado.notifications.map((n, i) => ({
    _id: `${pos(total - 1 - i)}#${n.id}`,
    tipo: tipoNotificacao(n.message),
    mensagem: n.message,
    data: data(n.date),
    lida: n.read,
    utilizador: n.user,
    pedidoFuncionalidade: nulo(n.requestId),
    relevante: n.relevant,
  }));

  const produtoDaRelease = (ids: string[]) => {
    const nomes = new Set(r.filter((p) => ids.includes(p.id)).map((p) => p.product));

    return nomes.size === 1 ? [...nomes][0] : null;
  };

  docs.Release = estado.releases.map((rel, i) => ({
    _id: `${pos(i)}#${rel.id}`,
    nome: rel.name,
    dataPrevista: dia(rel.date),
    produto: produtoDaRelease(rel.requestIds),
    pedidos: rel.requestIds,
  }));

  docs.Milestone = estado.releases.flatMap((rel, i) =>
    rel.milestone || rel.milestoneDate
      ? [
          {
            _id: `${pos(i)}#${rel.id}`,
            nome: rel.milestone,
            data: dia(rel.milestoneDate),
            release: `${pos(i)}#${rel.id}`,
          },
        ]
      : [],
  );

  docs.Sprint = estado.sprints.map((s, i) => ({
    _id: s.id,
    id: i + 1,
    dataInicio: dia(s.start),
    dataFim: dia(s.end),
    estado: s.state,
    pedidos: s.requestIds,
    nome: s.name,
    fechadoEm: data(s.closedAt),
    ...(s.snapshot
      ? {
          resultadoFecho: s.snapshot.map((p) => ({
            pedidoFuncionalidade: p.id,
            codigo: p.code,
            titulo: p.title,
            estado: ESTADO[p.status],
            developer: p.assignee,
          })),
        }
      : {}),
  }));

  docs.Metrica = Object.entries(metricas(estado)).map(([tipo, valor]) => ({
    _id: tipo,
    tipo,
    valor,
  }));

  return docs;
}

const porId = (a: Linha, b: Linha) => (a._id < b._id ? -1 : a._id > b._id ? 1 : 0);

/** Documentos -> dados do programa. Devolve null se a base de dados estiver vazia. */
export function paraEstado(docs: Record<string, Linha[]>): Database | null {
  const lista = (nome: string) => [...(docs[nome] || [])].sort(porId);

  const utilizadores = SUBCLASSES_UTILIZADOR.flatMap((subclasse) =>
    lista(subclasse).map((u): Linha => ({ ...u, role: inverso(SUBCLASSE, subclasse) })),
  ).sort((a, b) => a.id - b.id);

  if (!utilizadores.length) return null;

  const users: User[] = utilizadores.map((u) => ({
    id: u._id,
    name: u.nome,
    email: u.email,
    role: u.role,
    preference: inverso(FILTRO, u.filtroNotificacao),
  }));

  const nomes = new Map(users.map((u) => [u.id, u.name]));

  // Junta os documentos de cada classe pelo pedido a que pertencem, já pela ordem do _id.
  const porPedido = (nome: string, campo = 'pedidoFuncionalidade') => {
    const grupos = new Map<string, Linha[]>();

    for (const linha of lista(nome))
      grupos.set(linha[campo], [...(grupos.get(linha[campo]) || []), linha]);

    return (id: string) => grupos.get(id) || [];
  };

  const versoes = porPedido('VersaoPedido');
  const historico = porPedido('HistoricoEstado');
  const comentarios = porPedido('Comentario');
  const links = porPedido('LinkCodigo');
  const criterios = porPedido('CriterioAceitacao', 'userStory');
  const votos = porPedido('Voto');
  const priorizacoes = new Map(lista('Priorizacao').map((d) => [d.pedidoFuncionalidade, d]));
  const stories = new Map(lista('UserStory').map((d) => [d.pedidoFuncionalidade, d]));
  const workspaces = new Map(lista('Workspace').map((d) => [d.pedidoFuncionalidade, d]));

  // Os pedidos mais recentes primeiro (o programa acrescenta os novos no início).
  const pedidos = lista('PedidoFuncionalidade')
    .map((p): Linha => ({ ...p, id: codigoDe(p.id) }))
    .sort((a, b) => numeroDoCodigo(b.id) - numeroDoCodigo(a.id));

  const requests: Request[] = pedidos.map((p) => {
    const w = workspaces.get(p._id);
    const pr = priorizacoes.get(p._id);
    const us = stories.get(p._id);
    const ativo = !!w?.dataCriacao;

    return {
      id: p._id,
      code: p.id,
      title: p.titulo,
      description: p.descricao,
      product: p.produto,
      tags: p.tags || [],
      status: inverso(ESTADO, p.estado),
      author: nomes.get(p.autor) || '',
      submittedBy: p.autor,
      votes: votos(p._id)
        .sort((a, b) => (a.data?.getTime?.() ?? 0) - (b.data?.getTime?.() ?? 0) || porId(a, b))
        .map((v) => v.cliente),
      voteOffset: p.votosDemonstracao ?? 0,
      date: iso(p.dataCriacao),
      updated: iso(p.atualizadoEm),
      versions: versoes(p._id).map((v) => ({
        product: textoDe(v.produto),
        number: v.numeroVersao,
        date: iso(v.dataEdicao),
        user: v.utilizador,
        title: v.titulo,
        description: v.descricao,
      })),
      history: historico(p._id).map((h) => ({
        id: ultimoSegmento(h._id),
        date: iso(h.data),
        user: h.autor,
        action: textoDe(h.acao),
        ...(h.estadoAnterior ? { from: inverso(ESTADO, h.estadoAnterior) } : {}),
        ...(h.novoEstado ? { to: inverso(ESTADO, h.novoEstado) } : {}),
      })),
      reason: textoDe(p.motivo),
      originalId: textoDe(p.pedidoOriginal),
      priority: pr?.prioridade ? PRIORIDADE[pr.prioridade as keyof typeof PRIORIDADE] : '',
      impact: pr?.impacto ? IMPACTO[pr.impacto as keyof typeof IMPACTO] : '',
      effort: pr?.esforco ? IMPACTO[pr.esforco as keyof typeof IMPACTO] : '',
      story: textoDe(us?.texto),
      criteria: criterios(p._id).map((c) => c.texto),
      assignee: textoDe(p.developer),
      assignedAt: iso(p.dataAtribuicao),
      startedAt: iso(p.dataInicio),
      completedAt: iso(p.dataConclusao),
      resolution: textoDe(p.notaResolucao),
      links: links(p._id).map((l) => l.url),
      members: w ? w.participantes : [p.autor],
      workspace: ativo ? w.nome : '',
      workspaceCreatedAt: ativo ? iso(w.dataCriacao) : '',
      comments: comentarios(p._id).map((c) => ({
        id: ultimoSegmento(c._id),
        user: c.utilizador,
        date: iso(c.data),
        text: c.texto,
        mentions: c.mencoes || [],
      })),
      files: (w?.ficheiros || []).map((f: Linha) => ({
        id: f.id,
        name: f.nome,
        type: textoDe(f.tipo),
        size: f.tamanho ?? 0,
        data: textoDe(f.conteudo),
        user: f.utilizador,
        date: iso(f.data),
      })),
      archived: !!p.arquivado,
    };
  });

  const autores = new Map(pedidos.map((p) => [p._id as string, p.autor as string]));
  const milestones = new Map(lista('Milestone').map((m) => [m.release, m]));

  return {
    schema: 3,
    sequence: pedidos.reduce((max, p) => Math.max(max, numeroDoCodigo(p.id)), 0),
    users,
    requests,
    sprints: lista('Sprint')
      .sort((a, b) => a.id - b.id)
      .map((s) => ({
        id: s._id,
        name: textoDe(s.nome),
        start: diaDe(s.dataInicio),
        end: diaDe(s.dataFim),
        state: s.estado,
        requestIds: s.pedidos || [],
        ...(s.fechadoEm ? { closedAt: iso(s.fechadoEm) } : {}),
        ...(s.resultadoFecho
          ? {
              snapshot: s.resultadoFecho.map((p: Linha) => ({
                id: p.pedidoFuncionalidade,
                code: textoDe(p.codigo),
                title: textoDe(p.titulo),
                status: inverso(ESTADO, p.estado),
                assignee: textoDe(p.developer),
              })),
            }
          : {}),
      })),
    releases: lista('Release').map((rel) => {
      const m = milestones.get(rel._id);

      return {
        id: ultimoSegmento(rel._id),
        name: rel.nome,
        date: diaDe(rel.dataPrevista),
        milestone: textoDe(m?.nome),
        milestoneDate: diaDe(m?.data),
        requestIds: rel.pedidos || [],
      };
    }),
    tags: lista('Tag')
      .sort((a, b) => a.id - b.id)
      .map((t) => t.nome),
    dependencies: pedidos.flatMap((p) =>
      (p.dependencias || []).map((para: string) => ({ from: p._id as string, to: para })),
    ),
    notifications: lista('Notificacao')
      .reverse()
      .map((n) => ({
        id: ultimoSegmento(n._id),
        user: n.utilizador,
        requestId: textoDe(n.pedidoFuncionalidade),
        message: n.mensagem,
        date: iso(n.data),
        read: !!n.lida,
        relevant: !!n.relevante,
      })),
    invites: lista('ConviteLink').map((c) => ({
      token: c.link.slice(c.link.indexOf('token=') + 6),
      requestId: c.workspace,
      expires: iso(c.dataExpiracao),
      createdBy: autores.get(c.workspace) || '',
    })),
  };
}
