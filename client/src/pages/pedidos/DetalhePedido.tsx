import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Card, Heading, Timeline } from '../../components';
import { podeVerProgresso, podeVerWorkspace } from '../../domain';
import { useApp } from '../../state';
import { DeveloperActions } from '../developer/ImplementacaoPedido';
import { ManagerActions } from '../gestor/TriagemEAtribuicao';
import { ProductDecision } from '../produto/DecisaoPedido';
import { Prioritize } from '../produto/PriorizacaoPedido';
import { Trace } from '../produto/RastreabilidadePedido';
import { Requirements } from '../produto/RequisitosPedido';
import { Classify } from '../produto/TagsPedido';
import { Members } from '../workspace/Participantes';
import { Workspace } from '../workspace/WorkspacePedido';
import { CustomerActions } from './AcoesCliente';
import { History } from './HistoricoPedido';

/** Escolhe os separadores disponíveis para o utilizador. As áreas privadas não são montadas para quem não tem acesso. */
export function RequestDetail() {
  const { id } = useParams();
  const { db, user } = useApp();
  const [params, setParams] = useSearchParams();
  const pedido = db.requests.find((pedido) => pedido.id === id);

  if (!pedido) return <Heading title="Pedido não encontrado" />;

  if (user?.role === 'developer' && pedido.assignee !== user.id) {
    return <Heading title="Pedido não atribuído a si" />;
  }

  const owner = user?.id === pedido.submittedBy;
  const privateAccess = podeVerWorkspace(pedido, user);

  const tabs = [
    ['detail', 'Detalhe'],
    ...(owner ? [['history', 'Histórico e versões']] : []),
    ...(privateAccess
      ? [
          ['members', 'Participantes'],
          ['workspace', 'Workspace'],
        ]
      : owner
        ? [['members', 'Convidar participantes']]
        : []),
    ...(user?.role === 'product'
      ? [
          ['priority', 'Priorizar'],
          ['requirements', 'User story e critérios'],
          ['classify', 'Tags'],
          ['trace', 'Rastreabilidade'],
        ]
      : []),
  ];

  const requested = params.get('tab') || 'detail';
  const tab = tabs.some((t) => t[0] === requested) ? requested : 'detail';

  return (
    <>
      <Link className="back-link" to="/app">
        ‹ Pedidos / {pedido.code}
      </Link>

      <Heading title={pedido.title}>
        {pedido.code} · Autor: {pedido.author} · Produto: {pedido.product}
      </Heading>

      <div className="tabs" role="tablist" aria-label="Informação do pedido">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            aria-controls="request-panel"
            onClick={() => setParams(key === 'detail' ? {} : { tab: key })}
          >
            {label}
          </button>
        ))}
      </div>

      <div id="request-panel" role="tabpanel" className="stack">
        {tab === 'history' && owner ? (
          <History request={pedido} />
        ) : tab === 'members' && (privateAccess || owner) ? (
          <Members request={pedido} />
        ) : tab === 'workspace' && privateAccess ? (
          <Workspace request={pedido} />
        ) : tab === 'priority' && user?.role === 'product' ? (
          <Prioritize key={pedido.id} request={pedido} />
        ) : tab === 'requirements' && user?.role === 'product' ? (
          <Requirements key={pedido.id} request={pedido} />
        ) : tab === 'classify' && user?.role === 'product' ? (
          <Classify key={pedido.id} request={pedido} />
        ) : tab === 'trace' && user?.role === 'product' ? (
          <Trace request={pedido} />
        ) : (
          <>
            {podeVerProgresso(pedido, user) && <Timeline request={pedido} />}

            <Card title="Descrição" className="pedido-description">
              <p className="description">{pedido.description}</p>

              <div className="tag-list">
                {pedido.tags.map((t) => (
                  <span className="badge neutral" key={t}>
                    {t}
                  </span>
                ))}
              </div>

              {user?.role !== 'customer' && <p>{pedido.voteOffset + pedido.votes.length} votos</p>}
              {pedido.reason && <div className="notice">{pedido.reason}</div>}

              {pedido.originalId && (
                <Link to={'/app/pedidos/' + pedido.originalId}>Consultar pedido original</Link>
              )}
            </Card>

            {user?.role === 'customer' ? (
              <CustomerActions request={pedido} />
            ) : user?.role === 'manager' ? (
              <ManagerActions request={pedido} />
            ) : user?.role === 'product' ? (
              <ProductDecision request={pedido} />
            ) : (
              <DeveloperActions request={pedido} />
            )}
          </>
        )}
      </div>
    </>
  );
}
