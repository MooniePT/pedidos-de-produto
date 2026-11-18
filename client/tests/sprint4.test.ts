import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  PRAZO_WORKSPACE_MS,
  podeEscreverWorkspace,
  podeVerWorkspace,
  workspaceApenasLeitura,
  type Command,
  type Database,
} from '../src/domain';
import { ColecaoPedidos } from '../src/model/ColecaoPedidos';
import { PedidoFuncionalidade } from '../src/model/PedidoFuncionalidade';
import { seed } from '../src/seed';
import { migrarDados } from '../src/services/migracao';
import { executarComando } from '../src/services/reducer';
import { normalizar, palavrasChave, procurarSemelhantes } from '../src/services/semelhantes';

const aplicar = (db: Database, user: string, c: Command) => executarComando(db, user, c).state;

test('palavras-chave normalizam acentos, ignoram palavras comuns e eliminam repetições', () => {
  assert.equal(normalizar('Exportação'), 'exportacao');

  assert.deepEqual(palavrasChave('PARA esta Exportação exportacao como com tema'), [
    'exportacao',
    'tema',
  ]);

  assert.deepEqual(palavrasChave('uma com uns sem por'), []);
});

test('semelhantes usam título e descrição, ignoram rejeitados/duplicados e mostram no máximo três', () => {
  const pedidos = [
    'Submetido',
    'Rejeitado',
    'Duplicado',
    'Aprovado',
    'Confirmado',
    'Concluído',
  ].map((estado, i) => ({ id: i, titulo: 'Exportação ' + i, descricao: 'Um tema escuro', estado }));

  assert.deepEqual(
    procurarSemelhantes('', 'tema', pedidos).map((p) => p.id),
    [0, 3, 4],
  );

  assert.equal(procurarSemelhantes('para isto', 'com uma', pedidos).length, 0);
});

test('ColecaoPedidos.findSemelhantes limita sugestões ao produto escolhido', () => {
  const db = seed();

  db.requests[0].product = 'Produto B';

  assert.equal(
    new ColecaoPedidos(db)
      .findSemelhantes('Pesquisa de ferramentas', '', 'Produto A')
      .some((p) => p.id === 'p-41'),
    false,
  );

  assert.equal(
    new ColecaoPedidos(db).findSemelhantes('Pesquisa de ferramentas', '', 'Produto B')[0].id,
    'p-41',
  );
});

test('o primeiro convidado cria o Workspace automaticamente com nome até 50 carateres', () => {
  let db = seed();
  const r = db.requests.find((p) => p.id === 'p-44')!;

  r.title = 'Uma ideia com um título suficientemente longo para ultrapassar os cinquenta carateres';

  const invite = executarComando(db, 'ines', { type: 'gerarConvite', id: r.id });

  db = invite.state;
  assert.equal(db.requests.find((p) => p.id === r.id)?.workspace, '');
  assert.equal(Date.parse(db.invites[0].expires) > Date.now() + 6 * 86400000, true);
  db = aplicar(db, 'joao', { type: 'aceitarConvite', token: invite.result! });

  const created = db.requests.find((p) => p.id === r.id)!;

  assert.equal(created.workspace, r.title.slice(0, 50));
  assert.deepEqual(created.members, ['ines', 'joao']);
  assert.ok(created.workspaceCreatedAt);

  assert.throws(
    () => aplicar(db, 'joao', { type: 'aceitarConvite', token: invite.result! }),
    /Já pertence/,
  );
});

test('convites só podem ser gerados pelo criador e não podem ser aceites depois do prazo', () => {
  const db = seed();

  assert.throws(() => aplicar(db, 'rui', { type: 'gerarConvite', id: 'p-41' }), /criador/);

  const invitation = executarComando(db, 'joao', { type: 'gerarConvite', id: 'p-41' });

  invitation.state.invites[0].expires = new Date(Date.now() - 1).toISOString();

  assert.throws(
    () => aplicar(invitation.state, 'ines', { type: 'aceitarConvite', token: invitation.result! }),
    /expirou/,
  );
});

test('o Workspace fecha exatamente após 14 dias, sem depender de abrir outro ecrã', () => {
  const db = seed(),
    r = db.requests.find((p) => p.id === 'p-41')!,
    start = Date.parse(r.workspaceCreatedAt);

  assert.equal(workspaceApenasLeitura(r, start + PRAZO_WORKSPACE_MS - 1), false);
  assert.equal(workspaceApenasLeitura(r, start + PRAZO_WORKSPACE_MS), true);
  r.workspaceCreatedAt = new Date(Date.now() - PRAZO_WORKSPACE_MS - 1).toISOString();

  for (const command of [
    { type: 'adicionarComentario', id: r.id, text: 'Olá', mentions: [] },
    { type: 'gerarConvite', id: r.id },
    { type: 'removerMembro', id: r.id, member: 'rui', remove: true },
    {
      type: 'adicionarFicheiro',
      id: r.id,
      file: { name: 'a.txt', size: 1, type: 'text/plain', data: 'data:text/plain;base64,YQ==' },
    },
  ] satisfies Command[])
    assert.throws(() => aplicar(db, 'joao', command), /leitura/);
});

test('aprovação, rejeição e duplicado fecham o Workspace antes dos 14 dias', () => {
  for (const status of [
    'Aprovado',
    'Priorizado',
    'Atribuído',
    'Em progresso',
    'Concluído',
    'Rejeitado',
    'Duplicado',
  ] as const) {
    const db = seed(),
      r = db.requests.find((p) => p.id === 'p-41')!;

    r.status = status;
    assert.equal(workspaceApenasLeitura(r), true);

    assert.throws(
      () =>
        aplicar(db, 'joao', {
          type: 'adicionarComentario',
          id: r.id,
          text: 'Novo comentário',
          mentions: [],
        }),
      /leitura/,
    );
  }
});

test('apenas membros consultam o Workspace; Product Manager consulta mas não escreve', () => {
  const db = seed(),
    r = db.requests.find((p) => p.id === 'p-41')!;

  for (const uid of ['jose', 'ana']) {
    const user = db.users.find((u) => u.id === uid)!;

    assert.equal(podeVerWorkspace(r, user), false);

    assert.throws(
      () => aplicar(db, uid, { type: 'adicionarComentario', id: r.id, text: 'Olá', mentions: [] }),
      /membros/,
    );
  }

  const marta = db.users.find((u) => u.id === 'marta')!;

  assert.equal(podeVerWorkspace(r, marta), true);
  assert.equal(podeEscreverWorkspace(r, marta), false);

  assert.throws(
    () =>
      aplicar(db, 'marta', { type: 'adicionarComentario', id: r.id, text: 'Olá', mentions: [] }),
    /membros/,
  );
});

test('comentário privado guarda menções e notifica apenas os mencionados', () => {
  let db = seed();

  db = aplicar(db, 'joao', {
    type: 'adicionarComentario',
    id: 'p-41',
    text: '@Inês Costa pode rever a ideia?',
    mentions: ['ines'],
  });

  assert.equal(db.requests.find((r) => r.id === 'p-41')?.comments.at(-1)?.mentions[0], 'ines');
  assert.ok(db.notifications.some((n) => n.user === 'ines' && n.message.includes('mencionou')));

  assert.equal(
    db.notifications.some((n) => n.user === 'rui'),
    false,
  );

  assert.throws(
    () =>
      aplicar(db, 'joao', {
        type: 'adicionarComentario',
        id: 'p-41',
        text: 'a'.repeat(1001),
        mentions: [],
      }),
    /1000/,
  );
});

test('migração mantém pedidos e versões, retira empresas e categorias e conserva a data real do Workspace', () => {
  const original = seed();

  const old = {
    ...original,
    schema: 2,
    categories: ['Antiga'],
    users: original.users.map((u) => ({ ...u, company: 'Aurora' })),
    requests: original.requests.map((r) => ({
      ...r,
      category: 'Antiga',
      company: 'Aurora',
      author: 'Aurora',
      workspaceCreatedAt: undefined,
    })),
  };

  const migrated = migrarDados(old)!;

  assert.equal(migrated.schema, 3);
  assert.equal(migrated.requests.length, old.requests.length);
  assert.equal(migrated.requests[0].author, 'João Martins');
  assert.equal(migrated.requests[0].workspaceCreatedAt, migrated.requests[0].date);
  assert.equal('company' in migrated.users[0], false);
  assert.equal('category' in migrated.requests[0], false);
  assert.equal('categories' in migrated, false);
  assert.equal(old.requests[0].author, 'Aurora');
});

test('os métodos do UML mantêm os dados do autor, os votos e a atribuição', () => {
  const db = seed(),
    r = db.requests.find((p) => p.id === 'p-41')!,
    p = new PedidoFuncionalidade(r, db.users),
    joao = db.users.find((u) => u.id === 'joao')!,
    ana = db.users.find((u) => u.id === 'ana')!;

  assert.equal(p.getAutor().id, 'joao');
  assert.equal(p.getEstado(), 'Submetido');
  p.adicionarVoto(joao);
  assert.throws(() => p.adicionarVoto(joao), /Já votou/);
  p.removerVoto(joao);
  assert.equal(r.votes.length, 0);
  p.atribuir(ana);
  assert.equal(p.getDeveloper()?.id, 'ana');
  p.editar('Título revisto', 'Descrição revista', joao.id);
  assert.equal(r.versions.length, 1);
  assert.equal(r.versions[0].title, 'Pesquisa de ferramentas');
  assert.equal(r.author, 'João Martins');
});

test('US4: um pedido concluído não aceita votos nem a remoção de votos', () => {
  const db = seed(),
    r = db.requests.find((p) => p.status === 'Concluído')!,
    joao = db.users.find((u) => u.id === 'joao')!,
    p = new PedidoFuncionalidade(r, db.users),
    antes = r.votes.length;

  assert.throws(() => p.adicionarVoto(joao), /concluído/);
  assert.throws(() => p.removerVoto(joao), /concluído/);
  assert.equal(r.votes.length, antes);
  assert.throws(() => aplicar(db, 'joao', { type: 'adicionarVoto', id: r.id }), /concluído/);
});

test('US25 CA2: concluir sem nota mostra a mensagem do documento e não conclui', () => {
  const db = seed(),
    r = db.requests.find((p) => p.status === 'Em progresso')!,
    dev = db.users.find((u) => u.id === r.assignee)!,
    p = new PedidoFuncionalidade(r, db.users);

  assert.throws(() => p.concluir('   ', dev), /Adicione uma nota com a descrição da resolução/);
  assert.equal(r.status, 'Em progresso');
});

test('IA-5: a decisão sobre a sugestão da IA fica no histórico como decisão humana', () => {
  const db = seed(),
    r = db.requests.find((p) => p.status === 'Aprovado')!;

  const depois = aplicar(db, 'marta', {
    type: 'definirPriorizacao',
    id: r.id,
    impact: 'Alto',
    effort: 'Médio',
    priority: 'Alta',
    decisaoIA: 'ajustada',
  });

  const ultimo = depois.requests.find((p) => p.id === r.id)!.history.at(-1)!;

  assert.match(ultimo.action, /sugestão da IA ajustada \(decisão humana do Product Manager\)/);
});

test('NOT-3 a NOT-9: o autor só é notificado nas mudanças de estado previstas no documento', () => {
  const produto = 'Produto B';

  const doAutor = (db: Database, id: string) =>
    db.notifications.filter((n) => n.user === 'joao' && n.requestId === id).map((n) => n.message);

  // Submeter, triar e confirmar: sem notificações para o autor.
  let db = seed();

  const { state, result: id } = executarComando(db, 'joao', {
    type: 'submeterPedido',
    input: { title: 'Lista de favoritos', description: 'Guardar favoritos.', product: produto },
  });

  db = aplicar(state, 'jose', { type: 'triarPedido', id: id! });
  db = aplicar(db, 'jose', { type: 'alterarEstado', id: id!, status: 'Confirmado' });
  assert.deepEqual(doAutor(db, id!), []);

  // Aprovar (NOT-5): uma notificação.
  db = aplicar(db, 'marta', { type: 'alterarEstado', id: id!, status: 'Aprovado' });
  assert.equal(doAutor(db, id!).length, 1);
  assert.match(doAutor(db, id!)[0], /Pedido aprovado/);

  // Priorizar não notifica o autor.
  db = aplicar(db, 'marta', {
    type: 'definirPriorizacao',
    id: id!,
    impact: 'Alto',
    effort: 'Baixo',
    priority: 'Alta',
  });

  assert.equal(doAutor(db, id!).length, 1);

  // Começar o trabalho (NOT-8): autor e gestor de projeto.
  const atribuido = db.requests.find((r) => r.status === 'Atribuído' && r.submittedBy === 'joao')!;

  db = aplicar(db, atribuido.assignee!, { type: 'atualizarEstado', id: atribuido.id });
  assert.ok(doAutor(db, atribuido.id).some((m) => m.includes('O trabalho no pedido começou')));
  assert.ok(db.notifications.some((n) => n.user === 'jose' && n.requestId === atribuido.id));

  // Duplicado (NOT-4): indica o pedido original.
  const segundo = executarComando(db, 'joao', {
    type: 'submeterPedido',
    input: { title: 'Favoritos', description: 'Guardar favoritos.', product: produto },
  });

  db = aplicar(segundo.state, 'jose', {
    type: 'alterarEstado',
    id: segundo.result!,
    status: 'Duplicado',
    originalId: id!,
  });

  const codigoOriginal = db.requests.find((r) => r.id === id)!.code;

  assert.deepEqual(doAutor(db, segundo.result!), [
    `${db.requests.find((r) => r.id === segundo.result)!.code} · Já está a ser tratado no pedido ${codigoOriginal}.`,
  ]);
});
