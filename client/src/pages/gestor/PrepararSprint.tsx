import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Actions, Button, Card, Field, Form, Heading, RequestsTable } from '../../components';
import { useApp } from '../../state';

/** US12: seleciona pedidos e datas antes de confirmar um novo sprint. Não altera um sprint já definido. */
export function SprintPrepare() {
  const { db, act } = useApp();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const active = db.sprints.find((s) => s.state === 'Ativo');

  const rows = db.requests.filter(
    (pedido) =>
      !pedido.archived &&
      ['Priorizado', 'Atribuído', 'Em progresso'].includes(pedido.status) &&
      !active?.requestIds.includes(pedido.id),
  );

  return (
    <>
      <Heading title="Preparar sprint">
        Selecione os pedidos e defina o período de trabalho.
      </Heading>

      {active && (
        <div className="notice">
          Existe um sprint ativo: {active.name}. <Link to="/app/sprint">Feche o sprint atual</Link>{' '}
          antes de iniciar outro.
        </div>
      )}

      <Form
        onSubmit={() =>
          void act(
            { type: 'definirSprintBacklog', name, start, end, requestIds: selected },
            'Sprint iniciado.',
          ).then((a) => {
            if (a.ok) navigate('/app/sprint');
          })
        }
      >
        <Card title="Dados do sprint">
          <Field label="Nome *" value={name} onChange={setName} required maxLength={80} />

          <div className="form-grid">
            <Field
              label="Data de início *"
              type="date"
              value={start}
              onChange={setStart}
              required
              max={end || undefined}
            />

            <Field
              label="Data de fim *"
              type="date"
              value={end}
              onChange={setEnd}
              required
              min={start || undefined}
            />
          </div>
        </Card>

        <Card title="Pedidos disponíveis">
          <RequestsTable
            requests={rows}
            selection={selected}
            onSelect={(id) =>
              setSelected(
                selected.includes(id) ? selected.filter((i) => i !== id) : [...selected, id],
              )
            }
          />

          <p className="muted">
            {selected.length} pedidos selecionados. A atribuição de responsáveis é feita no detalhe
            de cada pedido.
          </p>
        </Card>

        <Actions>
          <Button type="submit" disabled={!!active || !selected.length}>
            Iniciar sprint
          </Button>
          <Link className="button secondary" to="/app/sprint">
            Cancelar
          </Link>
        </Actions>
      </Form>
    </>
  );
}
