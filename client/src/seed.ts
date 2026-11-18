/** Cenário inicial da demonstração. Os identificadores estáveis permitem testar os mesmos percursos; o Workspace de exemplo começa aberto. */
import { mainSteps, type Database, type Request, type Status } from './domain';

export function seed(): Database {
  const users: Database['users'] = [
    {
      id: 'joao',
      name: 'João Martins',
      email: 'joao@exemplo.pt',
      role: 'customer',
      preference: 'relevant',
    },
    {
      id: 'jose',
      name: 'José Pinhel',
      email: 'jose@exemplo.pt',
      role: 'manager',
      preference: 'all',
    },
    {
      id: 'marta',
      name: 'Marta Silva',
      email: 'marta@exemplo.pt',
      role: 'product',
      preference: 'all',
    },
    {
      id: 'ana',
      name: 'Ana Rodrigues',
      email: 'ana@exemplo.pt',
      role: 'developer',
      preference: 'relevant',
    },
    {
      id: 'luis',
      name: 'Luís Costa',
      email: 'luis@exemplo.pt',
      role: 'developer',
      preference: 'relevant',
    },
    {
      id: 'ines',
      name: 'Inês Costa',
      email: 'ines@exemplo.pt',
      role: 'customer',
      preference: 'all',
    },
    {
      id: 'rui',
      name: 'Rui Santos',
      email: 'rui@exemplo.pt',
      role: 'customer',
      preference: 'all',
    },
  ];

  const specs: [number, string, Status, string, number][] = [
    [41, 'Pesquisa de ferramentas', 'Submetido', 'joao', 12],
    [44, 'Filtros avançados', 'Submetido', 'ines', 4],
    [47, 'Listas de favoritos', 'Devolvido', 'joao', 2],
    [45, 'Personalização completa', 'Rejeitado', 'joao', 1],
    [46, 'Pesquisa por nome', 'Duplicado', 'joao', 3],
    [38, 'Atalhos de teclado', 'Em progresso', 'ines', 8],
    [35, 'Exportação de dados', 'Concluído', 'joao', 19],
    [42, 'Notificações por equipa', 'Priorizado', 'ines', 6],
    [31, 'Importação de listas', 'Priorizado', 'joao', 7],
    [29, 'Melhorar exportação', 'Concluído', 'joao', 11],
    [50, 'Partilha de listas', 'Confirmado', 'joao', 5],
    [51, 'Acessibilidade dos formulários', 'Aprovado', 'ines', 9],
    [52, 'Ordenação de ferramentas', 'Atribuído', 'joao', 6],
  ];

  const requests: Request[] = specs.map(([n, title, status, submittedBy, votes]) => {
    const user = users.find((u) => u.id === submittedBy)!;
    const date = n === 35 ? '2026-10-12T09:00:00.000Z' : '2026-11-02T09:00:00.000Z';

    const description =
      n === 41
        ? 'Pesquisar ferramentas pelo nome para as encontrar mais rapidamente.'
        : n === 47
          ? 'Guardar ferramentas favoritas numa lista e partilhá-la com colegas da empresa.'
          : `${title} para tornar a gestão de ferramentas mais simples para a equipa.`;

    return {
      id: `p-${n}`,
      code: `P-${String(n).padStart(3, '0')}`,
      title,
      description,
      product: 'Produto A',
      tags: ['Pesquisa'],
      status,
      author: user.name,
      submittedBy,
      votes: [],
      voteOffset: votes,
      date,
      updated: date,
      versions: [],
      history: [
        { id: `h-${n}`, date, user: submittedBy, action: 'Pedido submetido', to: 'Submetido' },
      ],
      reason:
        status === 'Devolvido'
          ? 'Descreva como pretende partilhar as listas com os colegas.'
          : status === 'Rejeitado'
            ? 'O pedido não está alinhado com o âmbito atual do produto.'
            : '',
      originalId: status === 'Duplicado' ? 'p-41' : '',
      priority: [
        'Submetido',
        'Em triagem',
        'Confirmado',
        'Aprovado',
        'Devolvido',
        'Rejeitado',
        'Duplicado',
      ].includes(status)
        ? ''
        : 'Alta',
      impact: 'Alto',
      effort: 'Médio',
      story: ['Priorizado', 'Atribuído', 'Em progresso', 'Concluído'].includes(status)
        ? `Como utilizador, pretendo ${title.toLowerCase()}, para trabalhar de forma mais rápida.`
        : '',
      criteria:
        n === 42 || !['Priorizado', 'Atribuído', 'Em progresso', 'Concluído'].includes(status)
          ? []
          : [
              'A funcionalidade apresenta os resultados esperados.',
              'Quando não há resultados, é apresentada uma mensagem clara.',
            ],
      assignee: n === 38 ? 'luis' : [29, 35, 52].includes(n) ? 'ana' : '',
      assignedAt:
        n === 35
          ? '2026-10-13T09:00:00.000Z'
          : [38, 29, 52].includes(n)
            ? '2026-11-09T09:00:00.000Z'
            : '',
      startedAt:
        n === 35
          ? '2026-10-14T09:00:00.000Z'
          : [38, 29].includes(n)
            ? '2026-11-10T09:00:00.000Z'
            : '',
      completedAt:
        n === 35 ? '2026-10-22T09:00:00.000Z' : [29].includes(n) ? '2026-11-12T09:00:00.000Z' : '',
      resolution: [29, 35].includes(n) ? 'Implementação concluída e critérios verificados.' : '',
      links: [],
      members: n === 41 ? ['joao', 'ines', 'rui'] : [submittedBy],
      workspace: n === 41 ? title : '',
      workspaceCreatedAt: n === 41 ? new Date(Date.now() - 2 * 86400000).toISOString() : '',
      comments:
        n === 41
          ? [
              {
                id: 'comment-1',
                user: 'ines',
                date,
                text: 'A pesquisa por nome vai ajudar a encontrar ferramentas mais rapidamente.',
                mentions: [],
              },
            ]
          : [],
      files: [],
      archived: n === 35,
    };
  });

  for (const r of requests) {
    const terminal =
      r.status === 'Devolvido' || r.status === 'Duplicado' || r.status === 'Rejeitado';

    const steps = terminal
      ? [...mainSteps.slice(0, r.status === 'Rejeitado' ? 3 : 2), r.status]
      : mainSteps.slice(0, mainSteps.indexOf(r.status) + 1);

    r.history = steps.map((s, i) => ({
      id: r.id + '-h' + i,
      date:
        s === 'Atribuído'
          ? r.assignedAt
          : s === 'Em progresso'
            ? r.startedAt
            : s === 'Concluído'
              ? r.completedAt
              : new Date(Date.parse(r.date) + i * 3600000).toISOString(),
      user:
        s === 'Submetido'
          ? r.submittedBy
          : ['Em triagem', 'Confirmado', 'Devolvido', 'Duplicado', 'Atribuído'].includes(s)
            ? 'jose'
            : ['Em progresso', 'Concluído'].includes(s)
              ? r.assignee
              : 'marta',
      action: s === 'Submetido' ? 'Pedido submetido' : 'Estado alterado para ' + s,
      from: i ? steps[i - 1] : undefined,
      to: s,
    }));

    r.updated = r.history.at(-1)?.date || r.date;
  }

  return {
    schema: 3,
    sequence: 52,
    users,
    requests,
    sprints: [
      {
        id: 's1',
        name: 'Sprint 1',
        start: '2026-10-12',
        end: '2026-10-23',
        state: 'Fechado',
        requestIds: ['p-35'],
        closedAt: '2026-10-23T16:00:00Z',
        snapshot: [
          {
            id: 'p-35',
            code: 'P-035',
            title: 'Exportação de dados',
            status: 'Concluído',
            assignee: 'ana',
          },
        ],
      },
      {
        id: 's2',
        name: 'Sprint 2',
        start: '2026-10-26',
        end: '2026-11-06',
        state: 'Fechado',
        requestIds: [],
        closedAt: '2026-11-06T16:00:00Z',
        snapshot: [],
      },
      {
        id: 's3',
        name: 'Sprint 3',
        start: '2026-11-09',
        end: '2026-11-20',
        state: 'Ativo',
        requestIds: ['p-38', 'p-29', 'p-42', 'p-52'],
      },
    ],
    releases: [
      {
        id: 'r1',
        name: 'Release 1.0',
        date: '2026-11-27',
        milestone: 'Pesquisa pronta',
        milestoneDate: '2026-11-20',
        requestIds: ['p-38', 'p-29'],
      },
      {
        id: 'r2',
        name: 'Release 1.1',
        date: '2026-12-11',
        milestone: 'Exportação avançada',
        milestoneDate: '2026-12-04',
        requestIds: ['p-35'],
      },
    ],
    tags: ['Aprendizagem', 'Pesquisa', 'Produtividade'],
    dependencies: [],
    notifications: [
      {
        id: 'n1',
        user: 'ana',
        requestId: 'p-52',
        message: 'Foi-lhe atribuído o pedido P-052 · Ordenação de ferramentas.',
        date: '2026-11-09T09:00:00Z',
        read: false,
        relevant: true,
      },
      {
        id: 'n2',
        user: 'joao',
        requestId: 'p-47',
        message: 'O pedido P-047 foi devolvido para completar.',
        date: '2026-11-12T09:00:00Z',
        read: false,
        relevant: true,
      },
    ],
    invites: [],
  };
}
