import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Actions,
  Badge,
  Button,
  Card,
  Confirm,
  Empty,
  Form,
  Heading,
  Select,
  Table,
  date,
} from '../../components';
import type { Release } from '../../domain';
import { useApp } from '../../state';
import { ReleaseEditor } from './EditorRelease';

/** US17, US29 e US30: consulta de releases e manutenção de dependências, sem permitir ciclos. */
export function Roadmap() {
  const { db, act } = useApp();
  const [editing, setEditing] = useState<Release | null>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [remove, setRemove] = useState<{ from: string; to: string } | null>(null);

  const eligible = db.requests.filter((r) =>
    ['Priorizado', 'Atribuído', 'Em progresso', 'Concluído'].includes(r.status),
  );

  return (
    <>
      <Heading title="Roadmap do produto">
        Planeie releases, milestones e dependências entre pedidos.
      </Heading>

      <Actions>
        <Button
          onClick={() =>
            setEditing({
              id: '',
              name: '',
              date: '',
              milestone: '',
              milestoneDate: '',
              requestIds: [],
            })
          }
        >
          Nova release
        </Button>
      </Actions>

      {editing && (
        <ReleaseEditor key={editing.id} initial={editing} onClose={() => setEditing(null)} />
      )}

      {/* US17 CA2: nenhuma release tem pedidos planeados. */}
      {!db.releases.some((r) => r.requestIds.length > 0) && (
        <Card>
          <Empty title="Sem funcionalidades planeadas" />
        </Card>
      )}

      <div className="release-grid">
        {db.releases.map((r) => {
          const rows = db.requests.filter((q) => r.requestIds.includes(q.id));

          return (
            <Card key={r.id} title={r.name}>
              <p className="muted">Data prevista: {date(r.date)}</p>

              <p>
                Milestone: {r.milestone} · {date(r.milestoneDate)}
              </p>

              <p>
                {rows.filter((q) => q.status === 'Concluído').length} de {rows.length} pedidos
                concluídos
              </p>

              <progress
                value={rows.filter((q) => q.status === 'Concluído').length}
                max={rows.length || 1}
                aria-label={'Progresso de ' + r.name}
              />

              <ul>
                {rows.map((q) => (
                  <li key={q.id}>
                    <Link to={'/app/pedidos/' + q.id}>
                      {q.code} · {q.title}
                    </Link>{' '}
                    <Badge status={q.status} />
                  </li>
                ))}
              </ul>

              {!rows.length && <p className="muted">Sem pedidos associados.</p>}

              <Actions>
                <Button kind="secondary" onClick={() => setEditing(r)}>
                  Editar {r.name}
                </Button>
              </Actions>
            </Card>
          );
        })}
      </div>

      <Card title="Dependências">
        <p className="muted">
          O primeiro pedido depende do segundo. Não são permitidas dependências circulares.
        </p>

        <Form
          onSubmit={() =>
            void act({ type: 'adicionarDependencia', from, to }, 'Dependência associada.').then(
              (a) => {
                if (a.ok) {
                  setFrom('');
                  setTo('');
                }
              },
            )
          }
        >
          <div className="form-grid">
            <Select
              label="Pedido *"
              value={from}
              onChange={setFrom}
              required
              options={[
                { value: '', label: 'Selecionar pedido' },
                ...eligible.map((r) => ({ value: r.id, label: r.code + ' · ' + r.title })),
              ]}
            />

            <Select
              label="Depende de *"
              value={to}
              onChange={setTo}
              required
              options={[
                { value: '', label: 'Selecionar dependência' },
                ...eligible
                  .filter((r) => r.id !== from)
                  .map((r) => ({ value: r.id, label: r.code + ' · ' + r.title })),
              ]}
            />
          </div>

          <Actions>
            <Button type="submit">Associar dependência</Button>
          </Actions>
        </Form>

        {db.dependencies.length ? (
          <Table head={['Pedido', 'Depende de', 'Ação']}>
            {db.dependencies.map((e) => (
              <tr key={e.from + e.to}>
                <td>{db.requests.find((r) => r.id === e.from)?.code}</td>
                <td>{db.requests.find((r) => r.id === e.to)?.code}</td>
                <td>
                  <Button kind="text-button" onClick={() => setRemove(e)}>
                    Remover
                  </Button>
                </td>
              </tr>
            ))}
          </Table>
        ) : (
          <p className="muted">Sem dependências registadas.</p>
        )}
      </Card>

      {remove && (
        <Confirm
          title="Remover dependência?"
          onClose={() => setRemove(null)}
          onConfirm={() =>
            void act({ type: 'removerDependencia', ...remove }, 'Dependência removida.').then(
              (a) => {
                if (a.ok) setRemove(null);
              },
            )
          }
        >
          <p>Os pedidos mantêm-se no roadmap.</p>
        </Confirm>
      )}
    </>
  );
}
