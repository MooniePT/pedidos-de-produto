import { mainSteps, type Request } from '../domain';
import { Badge, Card } from './Apresentacao';

/** Representação visual do estado atual do pedido, sem modificar o percurso de estados. */
export function Timeline({ request }: { request: Request }) {
  const at = mainSteps.indexOf(request.status);

  return (
    <Card className="pedido-progress">
      <div className="card-heading">
        <h2>Progresso do pedido</h2>
        <Badge status={'Estado atual: ' + request.status} />
      </div>

      <ol className="timeline">
        {mainSteps.map((s, i) => (
          <li
            key={s}
            className={i === at ? 'current' : i < at ? 'complete' : ''}
            aria-current={i === at ? 'step' : undefined}
          >
            <span className="step-dot">{i + 1}</span>
            <span>{s}</span>
            <span className="step-date" aria-hidden="true">
              —
            </span>
          </li>
        ))}
      </ol>

      {at < 0 && (
        <p className="muted">
          Estado atual: {request.status}
          {request.reason ? ' · ' + request.reason : ''}
        </p>
      )}
    </Card>
  );
}
