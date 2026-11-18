import { Link, useParams } from 'react-router-dom';
import { Badge, Card, Empty, Heading, Table, date } from '../../components';
import { useApp } from '../../state';

/** Mantém os dois passos: selecionar um sprint e consultar os pedidos tal como estavam no momento do fecho. */
export function SprintHistory() {
  const { db } = useApp();
  const { id } = useParams();
  const closed = db.sprints.filter((s) => s.state === 'Fechado');
  const sprint = closed.find((s) => s.id === id);

  if (id) {
    return (
      <>
        <Link to="/app/historico">‹ Selecionar outro sprint</Link>

        <Heading title={sprint ? sprint.name : 'Sprint não encontrado'}>
          {sprint ? `${date(sprint.start)} — ${date(sprint.end)} · Estado no momento do fecho` : ''}
        </Heading>

        {sprint && (
          <Card title="Pedidos deste sprint">
            <Table head={['Pedido', 'Estado no fecho', 'Responsável', 'Ação']}>
              {sprint.snapshot?.map((pedido) => (
                <tr key={pedido.id}>
                  <td>
                    {pedido.code} · {pedido.title}
                  </td>

                  <td>
                    <Badge status={pedido.status} />
                  </td>

                  <td>
                    {db.users.find((utilizador) => utilizador.id === pedido.assignee)?.name ||
                      'Sem responsável'}
                  </td>

                  <td>
                    <Link className="button secondary" to={'/app/pedidos/' + pedido.id}>
                      Consultar
                    </Link>
                  </td>
                </tr>
              ))}
            </Table>
          </Card>
        )}
      </>
    );
  }

  return (
    <>
      <Heading title="Histórico de sprints">
        Selecione um sprint para consultar os pedidos e os resultados no fecho.
      </Heading>

      <Card>
        {closed.length ? (
          <Table head={['Sprint', 'Período', 'Pedidos', 'Ação']}>
            {[...closed].reverse().map((s) => (
              <tr key={s.id}>
                <td>{s.name}</td>
                <td>
                  {date(s.start)} — {date(s.end)}
                </td>
                <td>{s.snapshot?.length || 0}</td>
                <td>
                  <Link className="button secondary" to={'/app/historico/' + s.id}>
                    Ver pedidos
                  </Link>
                </td>
              </tr>
            ))}
          </Table>
        ) : (
          <Empty title="Sem sprints fechados" />
        )}
      </Card>
    </>
  );
}
