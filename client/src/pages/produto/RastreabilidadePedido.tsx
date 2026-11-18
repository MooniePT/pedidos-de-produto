import { Card } from '../../components';
import { type Request } from '../../domain';
import { useApp } from '../../state';

/** US32: apresenta a ligação entre o pedido, a user story, o sprint, a release e os links de código. */
export function Trace({ request: pedido }: { request: Request }) {
  const { db } = useApp();

  return (
    <>
      <Card title="Pedido → user story → implementação">
        <p>
          <strong>{pedido.code}</strong> · {pedido.title}
        </p>

        <h3>User story</h3>
        <p className="description">{pedido.story || 'Sem user story associada'}</p>
        <h3>Critérios de aceitação</h3>

        <ol>
          {pedido.criteria.map((c, i) => (
            <li key={i}>{c}</li>
          ))}
        </ol>

        <h3>Implementação</h3>

        <p>
          Responsável:{' '}
          {db.users.find((utilizador) => utilizador.id === pedido.assignee)?.name ||
            'Sem responsável'}
        </p>

        <p>
          Sprint:{' '}
          {db.sprints.find((s) => s.state === 'Ativo' && s.requestIds.includes(pedido.id))?.name ||
            'Sem sprint ativo'}
        </p>

        <p>
          Release:{' '}
          {db.releases.find((x) => x.requestIds.includes(pedido.id))?.name || 'Sem release'}
        </p>

        <h3>Alterações de código</h3>

        {pedido.links.length ? (
          <ul>
            {pedido.links.map((l) => (
              <li key={l}>
                <a href={l} target="_blank" rel="noreferrer">
                  {l}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">Sem alterações de código associadas</p>
        )}

        {pedido.resolution && <p className="description">Nota de resolução: {pedido.resolution}</p>}
      </Card>
    </>
  );
}
