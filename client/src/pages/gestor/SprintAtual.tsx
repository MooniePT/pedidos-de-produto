import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Actions,
  Badge,
  Button,
  Card,
  Confirm,
  Empty,
  Heading,
  RequestsTable,
  Stats,
  date,
} from '../../components';
import { useApp } from '../../state';

/** Apresenta o sprint ativo e pede confirmação antes de arquivar concluídos e devolver os restantes ao backlog. */
export function SprintCurrent() {
  const { db, act } = useApp();
  const [closing, setClosing] = useState(false);
  const sprint = db.sprints.find((s) => s.state === 'Ativo');
  const rows = db.requests.filter((pedido) => sprint?.requestIds.includes(pedido.id));
  const done = rows.filter((pedido) => pedido.status === 'Concluído').length;

  return (
    <>
      <Heading title="Sprint atual">Organize o trabalho e acompanhe a implementação.</Heading>

      {sprint ? (
        <>
          <Card>
            <div className="card-heading">
              <div>
                <h2>{sprint.name}</h2>
                <p className="muted">
                  {date(sprint.start)} — {date(sprint.end)}
                </p>
              </div>
              <Badge status="Ativo" />
            </div>

            <Stats
              items={[
                { label: 'Pedidos no sprint', value: rows.length },
                { label: 'Concluídos', value: done },
                {
                  label: 'Em progresso',
                  value: rows.filter((pedido) => pedido.status === 'Em progresso').length,
                },
                {
                  label: 'Sem responsável',
                  value: rows.filter((pedido) => !pedido.assignee).length,
                },
              ]}
            />
          </Card>

          <Card title="Pedidos do sprint">
            <RequestsTable requests={rows} />
          </Card>

          <Actions>
            <Button onClick={() => setClosing(true)}>Fechar sprint</Button>
            <Link to="/app/historico" className="button secondary">
              Histórico de sprints
            </Link>
          </Actions>
        </>
      ) : (
        <Card>
          <Empty title="Sem sprint ativo">
            Prepare um sprint com os pedidos disponíveis no backlog.
          </Empty>
          <Link className="button primary" to="/app/preparar">
            Preparar sprint
          </Link>
        </Card>
      )}

      {closing && sprint && (
        <Confirm
          title={'Fechar ' + sprint.name + '?'}
          label="Fechar sprint"
          onClose={() => setClosing(false)}
          onConfirm={() =>
            void act(
              { type: 'fecharSprint', id: sprint.id },
              'Sprint fechado. O histórico ficou guardado.',
            ).then((a) => {
              if (a.ok) setClosing(false);
            })
          }
        >
          <p>
            {done} pedidos concluídos serão arquivados. Os restantes {rows.length - done} regressam
            ao backlog, mantendo o estado e o responsável. O histórico deste sprint será preservado.
          </p>
        </Confirm>
      )}
    </>
  );
}
