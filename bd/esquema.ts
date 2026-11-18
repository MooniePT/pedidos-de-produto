/**
 * Esquema da base de dados: uma coleção por classe do Diagrama de Classes UML Geral (Miro),
 * com os mesmos nomes de classes, atributos, tipos e valores dos enums.
 */
import type { CreateIndexesOptions, Db, Document, IndexSpecification } from 'mongodb';

// Enumerações do diagrama.
export const EstadoPedido = [
  'Submetido',
  'EmTriagem',
  'Devolvido',
  'Duplicado',
  'Confirmado',
  'Aprovado',
  'Rejeitado',
  'Priorizado',
  'Atribuido',
  'EmProgresso',
  'Concluido',
] as const;

export const EstadoSprint = ['Ativo', 'Fechado'] as const;

export const Nivel = ['Alto', 'Medio', 'Baixo'] as const;

export const DecisaoSugestao = ['Pendente', 'Aceite', 'Ajustada', 'Rejeitada'] as const;

export const FiltroNotificacao = ['ApenasMencoesEAlteracoes', 'Todas'] as const;

export const TipoMetrica = [
  'PedidosSubmetidos',
  'AprovadosVsRejeitados',
  'FeaturesPorRelease',
  'LeadTime',
  'CycleTime',
  'CargaDaEquipa',
  'ProgressoDoRoadmap',
] as const;

// Subclasses de Utilizador. Utilizador é abstrata: não tem coleção própria.
export const SUBCLASSES_UTILIZADOR = [
  'Cliente',
  'GestorDeProjeto',
  'ProductManager',
  'Developer',
] as const;

// Tamanhos máximos dos textos (critérios de aceitação).
export const LIMITES = {
  titulo: 100,
  descricao: 2000,
  comentario: 1000,
  criterio: 1000,
  nomeWorkspace: 50,
  motivo: 500,
  notaResolucao: 1000,
};

const TEXTO = { bsonType: 'string' };
const TEXTO_OU_NULO = { bsonType: ['string', 'null'] };
const Int = { bsonType: 'int', minimum: 1 };
const DateT = { bsonType: 'date' };
const DateOuNulo = { bsonType: ['date', 'null'] };
const BOOL = { bsonType: 'bool' };
const Lista = { bsonType: 'array', items: TEXTO };
const NivelOuNulo = { enum: [...Nivel, null] };
const texto = (max: number, min = 0) => ({ bsonType: 'string', minLength: min, maxLength: max });

type Colecao = {
  nome: string;
  esquema?: Document;
  indices?: [IndexSpecification, CreateIndexesOptions?][];
};

const objeto = (required: string[], properties: Document) => ({
  bsonType: 'object',
  required,
  properties,
});

// Atributos de Utilizador, iguais nas quatro subclasses.
const utilizador = (nome: string): Colecao => ({
  nome,
  esquema: objeto(['id', 'nome', 'email'], {
    id: Int,
    nome: texto(100, 1),
    email: TEXTO,
    // Só o hash scrypt: "scrypt$<sal>$<hash>".
    password: { bsonType: 'string', pattern: '^scrypt\\$[0-9a-f]+\\$[0-9a-f]+$' },
    filtroNotificacao: { enum: FiltroNotificacao },
  }),
  indices: [
    [{ id: 1 }, { unique: true }],
    [{ email: 1 }, { unique: true }],
  ],
});

export const COLECOES: Colecao[] = [
  ...SUBCLASSES_UTILIZADOR.map(utilizador),
  {
    nome: 'Produto',
    esquema: objeto(['id', 'nome'], { id: Int, nome: texto(100, 1) }),
    indices: [[{ id: 1 }, { unique: true }]],
  },
  {
    nome: 'Tag',
    esquema: objeto(['id', 'nome'], { id: Int, nome: texto(100, 1) }),
    indices: [[{ id: 1 }, { unique: true }]],
  },
  {
    nome: 'PedidoFuncionalidade',
    esquema: objeto(['id', 'titulo', 'descricao', 'estado', 'dataCriacao', 'autor', 'produto'], {
      // id: String no formato P-053.
      id: { bsonType: 'string', pattern: '^P-[0-9]{3,}$' },
      titulo: texto(LIMITES.titulo, 1),
      descricao: texto(LIMITES.descricao, 1),
      estado: { enum: EstadoPedido },
      dataCriacao: DateT,
      motivo: { bsonType: ['string', 'null'], maxLength: LIMITES.motivo },
      notaResolucao: { bsonType: ['string', 'null'], maxLength: LIMITES.notaResolucao },
      // Associações: Cliente (submete), Produto, Tag e Developer.
      autor: TEXTO,
      produto: TEXTO,
      tags: Lista,
      developer: TEXTO_OU_NULO,
      // associarPedidoOriginal(original)
      pedidoOriginal: TEXTO_OU_NULO,
      // Usados pelo programa e ainda por confirmar no diagrama (ver BASE_DADOS.md).
      dependencias: Lista,
      arquivado: BOOL,
      votosDemonstracao: { bsonType: 'int', minimum: 0 },
      atualizadoEm: DateT,
      dataAtribuicao: DateOuNulo,
      dataInicio: DateOuNulo,
      dataConclusao: DateOuNulo,
    }),
    indices: [
      [{ id: 1 }, { unique: true }],
      [{ titulo: 'text', descricao: 'text' }, { default_language: 'portuguese' }],
      [{ estado: 1, dataCriacao: 1 }],
      [{ autor: 1 }],
      [{ developer: 1, estado: 1 }],
    ],
  },
  {
    nome: 'VersaoPedido',
    esquema: objeto(
      ['numeroVersao', 'titulo', 'descricao', 'dataEdicao', 'pedidoFuncionalidade', 'utilizador'],
      {
        numeroVersao: Int,
        titulo: TEXTO,
        descricao: TEXTO,
        dataEdicao: DateT,
        pedidoFuncionalidade: TEXTO,
        utilizador: TEXTO,
        produto: TEXTO,
      },
    ),
    indices: [[{ pedidoFuncionalidade: 1, numeroVersao: 1 }, { unique: true }]],
  },
  {
    nome: 'HistoricoEstado',
    esquema: objeto(['data', 'pedidoFuncionalidade', 'autor'], {
      estadoAnterior: { enum: [...EstadoPedido, null] },
      novoEstado: { enum: [...EstadoPedido, null] },
      data: DateT,
      pedidoFuncionalidade: TEXTO,
      autor: TEXTO,
      acao: TEXTO,
    }),
    indices: [[{ pedidoFuncionalidade: 1 }]],
  },
  {
    nome: 'Voto',
    esquema: objeto(['data', 'pedidoFuncionalidade', 'cliente'], {
      data: DateT,
      pedidoFuncionalidade: TEXTO,
      cliente: TEXTO,
    }),
    // Um voto por cliente e pedido.
    indices: [[{ pedidoFuncionalidade: 1, cliente: 1 }, { unique: true }]],
  },
  {
    nome: 'Priorizacao',
    esquema: objeto(['pedidoFuncionalidade'], {
      impacto: NivelOuNulo,
      esforco: NivelOuNulo,
      prioridade: NivelOuNulo,
      pedidoFuncionalidade: TEXTO,
    }),
    indices: [[{ pedidoFuncionalidade: 1 }, { unique: true }]],
  },
  {
    nome: 'SugestaoIA',
    esquema: objeto(['decisao', 'pedidoFuncionalidade'], {
      impacto: NivelOuNulo,
      esforco: NivelOuNulo,
      prioridade: NivelOuNulo,
      decisao: { enum: DecisaoSugestao },
      pedidoFuncionalidade: TEXTO,
    }),
    indices: [[{ pedidoFuncionalidade: 1 }]],
  },
  {
    nome: 'UserStory',
    esquema: objeto(['texto', 'geradaPorIA', 'pedidoFuncionalidade'], {
      texto: TEXTO,
      geradaPorIA: BOOL,
      pedidoFuncionalidade: TEXTO,
    }),
    indices: [[{ pedidoFuncionalidade: 1 }, { unique: true }]],
  },
  {
    nome: 'CriterioAceitacao',
    esquema: objeto(['texto', 'userStory'], {
      texto: texto(LIMITES.criterio),
      userStory: TEXTO,
    }),
    indices: [[{ userStory: 1 }]],
  },
  {
    nome: 'LinkCodigo',
    esquema: objeto(['url', 'pedidoFuncionalidade'], {
      url: TEXTO,
      pedidoFuncionalidade: TEXTO,
      developer: TEXTO_OU_NULO,
    }),
    indices: [[{ pedidoFuncionalidade: 1 }]],
  },
  {
    nome: 'Workspace',
    esquema: objeto(
      ['nome', 'somenteLeitura', 'pedidoFuncionalidade', 'cliente', 'participantes'],
      {
        nome: texto(LIMITES.nomeWorkspace, 1),
        somenteLeitura: BOOL,
        dataCriacao: DateOuNulo,
        pedidoFuncionalidade: TEXTO,
        cliente: TEXTO,
        participantes: Lista,
        ficheiros: {
          bsonType: 'array',
          items: objeto(['id', 'nome', 'utilizador', 'data'], {
            id: TEXTO,
            nome: TEXTO,
            tipo: TEXTO,
            tamanho: { bsonType: 'int', minimum: 0 },
            conteudo: TEXTO,
            utilizador: TEXTO,
            data: DateT,
          }),
        },
      },
    ),
    indices: [[{ pedidoFuncionalidade: 1 }, { unique: true }], [{ participantes: 1 }]],
  },
  {
    nome: 'ConviteLink',
    esquema: objeto(['link', 'dataExpiracao', 'workspace'], {
      link: TEXTO,
      dataExpiracao: DateT,
      workspace: TEXTO,
    }),
    indices: [[{ link: 1 }, { unique: true }], [{ workspace: 1 }]],
  },
  {
    nome: 'Comentario',
    esquema: objeto(['texto', 'data', 'utilizador', 'pedidoFuncionalidade'], {
      texto: texto(LIMITES.comentario, 1),
      data: DateT,
      utilizador: TEXTO,
      pedidoFuncionalidade: TEXTO,
      mencoes: Lista,
    }),
    indices: [[{ pedidoFuncionalidade: 1 }]],
  },
  {
    nome: 'Notificacao',
    esquema: objeto(['tipo', 'mensagem', 'data', 'lida', 'utilizador'], {
      tipo: TEXTO,
      mensagem: TEXTO,
      data: DateT,
      lida: BOOL,
      utilizador: TEXTO,
      pedidoFuncionalidade: TEXTO_OU_NULO,
      relevante: BOOL,
    }),
    indices: [[{ utilizador: 1, lida: 1 }]],
  },
  {
    nome: 'Release',
    esquema: objeto(['nome', 'dataPrevista'], {
      nome: texto(100, 1),
      dataPrevista: DateT,
      produto: TEXTO_OU_NULO,
      pedidos: Lista, // Release 0..1 -- 0..* PedidoFuncionalidade
    }),
    indices: [[{ nome: 1 }, { unique: true }]],
  },
  {
    nome: 'Milestone',
    esquema: objeto(['nome', 'release'], {
      nome: TEXTO,
      data: DateOuNulo,
      release: TEXTO,
    }),
    indices: [[{ release: 1 }]],
  },
  {
    nome: 'Sprint',
    esquema: objeto(['id', 'dataInicio', 'dataFim', 'estado'], {
      id: Int,
      dataInicio: DateT,
      dataFim: DateT,
      estado: { enum: EstadoSprint },
      pedidos: Lista, // Sprint 0..1 -- 0..* PedidoFuncionalidade
      gestorDeProjeto: TEXTO_OU_NULO,
      nome: TEXTO,
      fechadoEm: DateOuNulo,
      resultadoFecho: {
        bsonType: 'array',
        items: objeto(['pedidoFuncionalidade', 'estado'], {
          pedidoFuncionalidade: TEXTO,
          codigo: TEXTO,
          titulo: TEXTO,
          estado: { enum: EstadoPedido },
          developer: TEXTO,
        }),
      },
    }),
    indices: [
      [{ id: 1 }, { unique: true }],
      // Só um sprint ativo.
      [{ estado: 1 }, { unique: true, partialFilterExpression: { estado: 'Ativo' } }],
    ],
  },
  {
    nome: 'Metrica',
    esquema: objeto(['tipo', 'valor'], {
      tipo: { enum: TipoMetrica },
      valor: { bsonType: ['double', 'int', 'null'] },
    }),
    indices: [[{ tipo: 1 }, { unique: true }]],
  },
];

// Sessões de início de sessão. Não estão no diagrama (questão em aberto, ver BASE_DADOS.md).
export const COLECAO_SESSAO: Colecao = {
  nome: 'Sessao',
  esquema: objeto(['utilizador', 'criadaEm', 'expiraEm'], {
    utilizador: TEXTO,
    criadaEm: DateT,
    expiraEm: DateT,
  }),
  // O MongoDB apaga sozinho as sessões que já expiraram.
  indices: [[{ expiraEm: 1 }, { expireAfterSeconds: 0 }], [{ utilizador: 1 }]],
};

// Coleções da versão anterior. São apagadas para a base de dados ficar só com as do diagrama.
const ANTIGAS = [
  'utilizadores',
  'produtos',
  'tags',
  'pedidos',
  'votos',
  'comentarios',
  'workspaces',
  'sprints',
  'releases',
  'notificacoes',
  'contadores',
  'credenciais',
  'sessoes',
];

/** Cria as coleções que faltam e atualiza a validação e os índices. Não apaga dados do diagrama. */
export async function aplicarEsquema(db: Db): Promise<void> {
  const existentes = new Set(
    (await db.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name),
  );

  for (const nome of ANTIGAS) if (existentes.has(nome)) await db.dropCollection(nome);

  for (const colecao of [...COLECOES, COLECAO_SESSAO]) {
    const opcoes = {
      validator: { $jsonSchema: colecao.esquema },
      validationLevel: 'strict',
      validationAction: 'error',
    };

    if (!existentes.has(colecao.nome)) await db.createCollection(colecao.nome, opcoes as Document);
    else await db.command({ collMod: colecao.nome, ...opcoes });

    for (const [chaves, opcoesIndice] of colecao.indices || [])
      await db.collection(colecao.nome).createIndex(chaves, opcoesIndice || {});
  }
}
