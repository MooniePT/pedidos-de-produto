import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Command, Database } from '../src/domain';
import { seed } from '../src/seed';
import { executarComando } from '../src/services/reducer';

const apply = (db: Database, user: string, c: Command) => executarComando(db, user, c).state;

test('um pedido percorre os quatro perfis e fica no histórico do sprint', () => {
  let db = seed();

  let created = executarComando(db, 'joao', {
    type: 'submeterPedido',
    input: {
      title: 'Novo painel',
      description: 'Consultar atividade da equipa.',
      product: 'Produto A',
    },
  });

  db = created.state;

  const id = created.result!;

  assert.equal(db.requests.find((r) => r.id === id)?.author, 'João Martins');
  db = apply(db, 'jose', { type: 'triarPedido', id });
  db = apply(db, 'jose', { type: 'alterarEstado', id, status: 'Confirmado' });
  db = apply(db, 'marta', { type: 'alterarEstado', id, status: 'Aprovado' });

  db = apply(db, 'marta', {
    type: 'definirCriteriosAceitacao',
    id,
    story: 'Como cliente pretendo consultar a atividade.',
    criteria: ['Mostra atividade da equipa.'],
  });

  db = apply(db, 'marta', {
    type: 'definirPriorizacao',
    id,
    impact: 'Alto',
    effort: 'Médio',
    priority: 'Alta',
  });

  db = apply(db, 'jose', { type: 'fecharSprint', id: 's3' });

  db = apply(db, 'jose', {
    type: 'definirSprintBacklog',
    name: 'Sprint 4',
    start: '2026-11-23',
    end: '2026-12-04',
    requestIds: [id],
  });

  db = apply(db, 'jose', { type: 'atribuir', id, assignee: 'ana' });
  db = apply(db, 'ana', { type: 'atualizarEstado', id });
  assert.throws(
    () => apply(db, 'ana', { type: 'concluir', id, note: ' ' }),
    /Adicione uma nota com a descrição da resolução/,
  );
  db = apply(db, 'ana', { type: 'associarCodigo', id, url: 'https://example.com/commit/123' });
  db = apply(db, 'ana', { type: 'concluir', id, note: 'Critérios verificados.' });

  const sprint = db.sprints.find((s) => s.state === 'Ativo')!;

  db = apply(db, 'jose', { type: 'fecharSprint', id: sprint.id });
  assert.equal(db.requests.find((r) => r.id === id)?.archived, true);
  assert.equal(db.sprints.find((s) => s.id === sprint.id)?.snapshot?.[0].status, 'Concluído');
  assert.ok(db.notifications.some((n) => n.user === 'joao' && n.requestId === id));
});

test('edição preserva autor, versões e impede gravações desatualizadas', () => {
  let db = seed();

  const input = {
    title: 'Título alterado',
    description: 'Descrição revista.',
    product: 'Produto A',
  };

  db = apply(db, 'joao', { type: 'editar', id: 'p-41', input, version: 1 });

  const r = db.requests.find((r) => r.id === 'p-41')!;

  assert.equal(r.author, 'João Martins');
  assert.equal(r.versions[0].title, 'Pesquisa de ferramentas');

  assert.throws(
    () => apply(db, 'joao', { type: 'editar', id: r.id, input, version: 1 }),
    /alterado entretanto/,
  );

  assert.throws(
    () => apply(db, 'ines', { type: 'editar', id: r.id, input, version: 2 }),
    /não pode/,
  );
});

test('atribuição exige critérios e um único sprint ativo', () => {
  const db = seed();

  assert.throws(
    () => apply(db, 'jose', { type: 'atribuir', id: 'p-42', assignee: 'ana' }),
    /critérios/,
  );

  assert.throws(
    () =>
      apply(db, 'jose', {
        type: 'definirSprintBacklog',
        name: 'Outro',
        start: '2026-11-20',
        end: '2026-11-30',
        requestIds: ['p-31'],
      }),
    /ativo/,
  );

  assert.throws(() => apply(db, 'marta', { type: 'triarPedido', id: 'p-41' }), /perfil/);
  assert.throws(() => apply(db, 'luis', { type: 'atualizarEstado', id: 'p-52' }), /atribuído a si/);
});

test('fechar sprint preserva trabalho em progresso e uma cópia histórica', () => {
  const db = apply(seed(), 'jose', { type: 'fecharSprint', id: 's3' });

  assert.equal(db.requests.find((r) => r.id === 'p-38')?.status, 'Em progresso');
  assert.equal(db.requests.find((r) => r.id === 'p-38')?.assignee, 'luis');

  const next = apply(db, 'luis', {
    type: 'concluir',
    id: 'p-38',
    note: 'Concluído depois do sprint.',
  });

  assert.equal(
    next.sprints.find((s) => s.id === 's3')?.snapshot?.find((r) => r.id === 'p-38')?.status,
    'Em progresso',
  );
});

test('dependências circulares, nomes repetidos e eliminações em uso são rejeitados', () => {
  let db = apply(seed(), 'marta', { type: 'adicionarDependencia', from: 'p-31', to: 'p-38' });

  assert.throws(
    () => apply(db, 'marta', { type: 'adicionarDependencia', from: 'p-38', to: 'p-31' }),
    /ciclo/,
  );

  assert.throws(
    () => apply(db, 'marta', { type: 'gerirTags', kind: 'tags', op: 'create', name: ' PESQUISA ' }),
    /já existe/,
  );

  assert.throws(
    () =>
      apply(db, 'marta', {
        type: 'gerirTags',
        kind: 'tags',
        op: 'delete',
        name: 'Pesquisa',
      }),
    /em uso/,
  );

  db = apply(db, 'marta', {
    type: 'gerirTags',
    kind: 'tags',
    op: 'edit',
    previous: 'Pesquisa',
    name: 'Experiência',
  });

  assert.equal(db.requests.find((r) => r.id === 'p-41')?.tags.includes('Experiência'), true);
});

test('convites, comentários e votos respeitam participação e duplicação', () => {
  let db = seed();
  const invite = executarComando(db, 'joao', { type: 'gerarConvite', id: 'p-41' });

  db = invite.state;

  assert.throws(
    () => apply(db, 'ines', { type: 'aceitarConvite', token: invite.result! }),
    /Já pertence/,
  );

  assert.throws(
    () =>
      apply(db, 'joao', {
        type: 'adicionarComentario',
        id: 'p-41',
        text: 'Olá',
        mentions: ['ana'],
      }),
    /participantes/,
  );

  db = apply(db, 'joao', { type: 'adicionarVoto', id: 'p-41' });
  assert.equal(db.requests.find((r) => r.id === 'p-41')?.votes.length, 1);
  db = apply(db, 'joao', { type: 'removerVoto', id: 'p-41' });
  assert.equal(db.requests.find((r) => r.id === 'p-41')?.votes.length, 0);

  assert.throws(
    () => apply(db, 'joao', { type: 'removerMembro', id: 'p-41', member: 'joao', remove: true }),
    /não pode ser removido/,
  );
});
