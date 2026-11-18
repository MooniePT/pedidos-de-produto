import { useState } from 'react';
import { Actions, Button, Card, Field, Form, RequestsTable } from '../../components';
import type { Release } from '../../domain';
import { useApp } from '../../state';

/** Formulário de uma release, com milestone e seleção dos pedidos a incluir. */
export function ReleaseEditor({ initial, onClose }: { initial: Release; onClose: () => void }) {
  const { db, act } = useApp();
  const [release, setRelease] = useState(initial);

  const rows = db.requests.filter(
    (r) =>
      ['Priorizado', 'Atribuído', 'Em progresso', 'Concluído'].includes(r.status) &&
      !db.releases.some((x) => x.id !== initial.id && x.requestIds.includes(r.id)),
  );

  return (
    <Form
      onSubmit={() =>
        void act({ type: 'guardarRelease', release }, 'Release guardada.').then((a) => {
          if (a.ok) onClose();
        })
      }
    >
      <Card title={initial.id ? 'Editar release' : 'Nova release'}>
        <Field
          label="Nome *"
          value={release.name}
          onChange={(name) => setRelease({ ...release, name })}
          required
          maxLength={80}
        />

        <div className="form-grid">
          <Field
            label="Data prevista *"
            type="date"
            value={release.date}
            onChange={(date) => setRelease({ ...release, date })}
            required
            min={release.milestoneDate || undefined}
          />

          <Field
            label="Milestone *"
            value={release.milestone}
            onChange={(milestone) => setRelease({ ...release, milestone })}
            required
            maxLength={100}
          />

          <Field
            label="Data da milestone *"
            type="date"
            value={release.milestoneDate}
            onChange={(milestoneDate) => setRelease({ ...release, milestoneDate })}
            required
            max={release.date || undefined}
          />
        </div>

        <RequestsTable
          requests={rows}
          selection={release.requestIds}
          onSelect={(id) =>
            setRelease({
              ...release,
              requestIds: release.requestIds.includes(id)
                ? release.requestIds.filter((i) => i !== id)
                : [...release.requestIds, id],
            })
          }
        />

        <Actions>
          <Button type="submit">Guardar release</Button>
          <Button kind="secondary" onClick={onClose}>
            Cancelar
          </Button>
        </Actions>
      </Card>
    </Form>
  );
}
