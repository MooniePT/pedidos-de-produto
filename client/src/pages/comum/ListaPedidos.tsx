import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Actions,
  Badge,
  Button,
  Card,
  Empty,
  Field,
  Form,
  Heading,
  RequestsTable,
  Select,
  Stats,
} from '../../components';
import { statuses } from '../../domain';
import { Backlog } from '../../model/Backlog';
import { ColecaoPedidos } from '../../model/ColecaoPedidos';
import { useApp } from '../../state';

/** Lista partilhada pelos perfis. Separa fórum, pedidos próprios, triagem e backlog; os filtros atuam no mesmo ecrã. */
export function Lists({
  mine = false,
  triage = false,
  forum = false,
}: {
  mine?: boolean;
  triage?: boolean;
  forum?: boolean;
}) {
  const { db, user, act } = useApp();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('Todos');
  const [priority, setPriority] = useState('Todas');
  const [tag, setTag] = useState('Todas');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const [filters, setFilters] = useState({
    query: '',
    tag: 'Todas',
    status: 'Todos',
    priority: 'Todas',
    from: '',
    to: '',
  });

  const developer = user?.role === 'developer';

  // Primeiro limita os pedidos ao contexto: fórum, pedidos próprios, triagem ou trabalho atribuído.
  const base = db.requests.filter((r) =>
    forum && !developer
      ? true
      : triage
        ? ['Submetido', 'Em triagem'].includes(r.status)
        : developer
          ? r.assignee === user?.id
          : mine
            ? r.submittedBy === user?.id
            : user?.role === 'product'
              ? [
                  'Confirmado',
                  'Aprovado',
                  'Priorizado',
                  'Atribuído',
                  'Em progresso',
                  'Concluído',
                  'Rejeitado',
                ].includes(r.status)
              : true,
  );

  const pesquisa = new Set(new ColecaoPedidos(db).pesquisar(filters.query).map((p) => p.id));

  // Só depois aplica os filtros. Os filtros não provocam navegação nem alteram pedidos.
  const rows = base.filter(
    (r) =>
      pesquisa.has(r.id) &&
      (filters.tag === 'Todas' || r.tags.includes(filters.tag)) &&
      (filters.status === 'Todos' || r.status === filters.status) &&
      (filters.priority === 'Todas' || r.priority === filters.priority) &&
      (!filters.from || (r.assignedAt || r.date).slice(0, 10) >= filters.from) &&
      (!filters.to || (r.assignedAt || r.date).slice(0, 10) <= filters.to),
  );

  if (user?.role === 'product' && !forum) new Backlog(rows).ordenarPorPrioridade();

  function clear() {
    setQuery('');
    setTag('Todas');
    setStatus('Todos');
    setPriority('Todas');
    setFrom('');
    setTo('');
    setFilters({ query: '', tag: 'Todas', status: 'Todos', priority: 'Todas', from: '', to: '' });
  }

  const publicView = forum || (user?.role === 'customer' && !mine);

  // Mensagens do documento quando a lista está vazia antes de qualquer filtro.
  // Se a lista só ficar vazia por causa dos filtros, mostra "Nenhum pedido encontrado".
  function mensagemListaVazia() {
    if (base.length > 0) return 'Nenhum pedido encontrado'; // US7 CA2, US20 CA3, US28 CA4
    if (triage) return 'Sem pedidos por triar'; // US9 CA4
    if (developer) return 'Não tem pedidos atribuídos'; // US23 CA2
    if (user?.role === 'product' && !forum) return 'Sem pedidos no backlog'; // US15 CA2
    return 'Nenhum pedido encontrado';
  }

  return (
    <>
      <Heading
        title={
          triage
            ? 'Triagem de pedidos'
            : forum
              ? 'Fórum público'
              : developer || mine
                ? 'Os meus pedidos'
                : user?.role === 'product'
                  ? 'Backlog de produto'
                  : 'Fórum público'
        }
      >
        {triage
          ? 'Analise a informação e encaminhe cada pedido.'
          : developer
            ? 'Consulte os pedidos atribuídos a si e acompanhe o trabalho.'
            : 'Consulte as ideias da comunidade e vote nos pedidos que considera úteis.'}
      </Heading>

      {triage && (
        <Stats
          items={[
            { label: 'Por triar', value: base.length },
            {
              label: 'Tratados hoje',
              value: db.requests.filter((r) =>
                r.history.some(
                  (h) =>
                    h.user === user?.id &&
                    ['Confirmado', 'Devolvido', 'Duplicado'].includes(h.to || '') &&
                    h.date.slice(0, 10) === new Date().toISOString().slice(0, 10),
                ),
              ).length,
            },
            { label: 'Em triagem', value: base.filter((r) => r.status === 'Em triagem').length },
          ]}
        />
      )}

      {user?.role === 'customer' && (
        <div>
          <Link className="button primary" to="/app/novo">
            Novo pedido
          </Link>
        </div>
      )}

      <Form
        onSubmit={() => {
          if (from && to && from > to) return;
          setFilters({ query, tag, status, priority, from, to });
        }}
      >
        <div className="filters">
          <Field
            label="Pesquisar pedidos"
            value={query}
            onChange={setQuery}
            maxLength={100}
            placeholder="Pesquise por título ou palavra-chave"
          />

          {!triage && (
            <Select label="Tag" value={tag} onChange={setTag} options={['Todas', ...db.tags]} />
          )}

          {!triage && (
            <>
              <Select
                label="Estado"
                value={status}
                onChange={setStatus}
                options={['Todos', ...statuses]}
              />

              {user?.role !== 'customer' && (
                <Select
                  label="Prioridade"
                  value={priority}
                  onChange={setPriority}
                  options={['Todas', 'Alta', 'Média', 'Baixa']}
                />
              )}
            </>
          )}

          {developer && (
            <>
              <Field
                label="Atribuído desde"
                type="date"
                value={from}
                onChange={setFrom}
                max={to || undefined}
              />
              <Field label="Até" type="date" value={to} onChange={setTo} min={from || undefined} />
            </>
          )}

          <div className="filter-actions">
            <Button type="submit">Aplicar filtros</Button>
            <Button kind="text-button" onClick={clear}>
              Limpar filtros
            </Button>
          </div>
        </div>

        {from && to && from > to && (
          <p className="field-error" role="alert">
            A data final deve ser posterior à inicial.
          </p>
        )}
      </Form>

      <Card title={triage ? 'Fila de triagem' : 'Pedidos'}>
        {publicView ? (
          <div className="forum-list">
            {rows.length ? (
              rows.map((r) => (
                <article className="forum-request" key={r.id}>
                  <div className="card-heading">
                    <h3>
                      {r.code} · {r.title}
                    </h3>
                    <Badge status={r.status} />
                  </div>

                  <p className="muted small">
                    Produto: {r.product} · Autor: {r.author}
                  </p>

                  <p className="description">{r.description}</p>

                  <Actions>
                    <span>{r.voteOffset + r.votes.length} votos</span>
                    <Link to={'/app/pedidos/' + r.id} className="button secondary">
                      Consultar
                      <span className="sr-only"> {r.code}</span>
                    </Link>
                  </Actions>
                </article>
              ))
            ) : (
              <Empty title={mensagemListaVazia()} />
            )}
          </div>
        ) : (
          <RequestsTable
            requests={rows}
            emptyTitle={mensagemListaVazia()}
            emptyText={base.length > 0 ? 'Experimente alterar os filtros.' : ''}
          />
        )}
      </Card>

      <p className="muted small">
        {rows.length} {rows.length === 1 ? 'pedido' : 'pedidos'}
      </p>
    </>
  );
}
