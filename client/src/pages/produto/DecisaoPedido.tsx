import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Actions, Area, Button, Card, Form } from '../../components';
import { type Request } from '../../domain';
import { useApp } from '../../state';

/** US13 e US14: aprovar ou rejeitar um pedido confirmado, incluindo o motivo da rejeição. */
export function ProductDecision({ request: pedido }: { request: Request }) {
  const { act } = useApp();
  const [reject, setReject] = useState(false);
  const [reason, setReason] = useState('');

  return pedido.status === 'Confirmado' ? (
    <>
      <Actions>
        <Button
          onClick={() =>
            void act(
              { type: 'alterarEstado', id: pedido.id, status: 'Aprovado' },
              'Pedido aprovado. O autor foi notificado.',
            )
          }
        >
          Aprovar pedido
        </Button>

        <Button kind="secondary" onClick={() => setReject(!reject)}>
          Rejeitar pedido
        </Button>
      </Actions>

      {reject && (
        <Form
          onSubmit={() =>
            void act(
              { type: 'alterarEstado', id: pedido.id, status: 'Rejeitado', reason },
              'Pedido rejeitado. O autor foi notificado.',
            ).then((a) => {
              if (a.ok) setReject(false);
            })
          }
        >
          <Card title="Fundamentação da decisão">
            <Area
              label="Motivo da rejeição *"
              value={reason}
              onChange={setReason}
              maxLength={500}
              required
            />

            <Actions>
              <Button type="submit">Confirmar rejeição</Button>
              <Button kind="secondary" onClick={() => setReject(false)}>
                Cancelar
              </Button>
            </Actions>
          </Card>
        </Form>
      )}
    </>
  ) : (
    <Actions>
      {['Aprovado', 'Priorizado'].includes(pedido.status) && (
        <>
          <Link className="button primary" to={'?tab=priority'}>
            Definir prioridade
          </Link>
          <Link className="button secondary" to={'?tab=requirements'}>
            User story e critérios
          </Link>
        </>
      )}

      <Link className="button secondary" to={'?tab=trace'}>
        Consultar rastreabilidade
      </Link>
    </Actions>
  );
}
