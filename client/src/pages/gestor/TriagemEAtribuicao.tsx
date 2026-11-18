import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Actions, Area, Button, Card, Confirm, Form, Select } from '../../components';
import { type Request } from '../../domain';
import { useApp } from '../../state';

/** US9–US11: interface da triagem e da atribuição. As mesmas condições são novamente verificadas pelos comandos. */
export function ManagerActions({ request: pedido }: { request: Request }) {
  const { db, act } = useApp();
  const [panel, setPanel] = useState('');
  const [reason, setReason] = useState('');
  const [originalId, setOriginalId] = useState('');
  const [developer, setDeveloper] = useState(pedido.assignee || '');
  const [confirmation, setConfirmation] = useState(false);
  const triage = ['Submetido', 'Em triagem'].includes(pedido.status);
  const inSprint = db.sprints.some((s) => s.state === 'Ativo' && s.requestIds.includes(pedido.id));

  return (
    <>
      {pedido.status === 'Em triagem' && (
        <Link className="button secondary" to={'/app/pedidos/' + pedido.id + '/editar'}>
          Corrigir informação do pedido
        </Link>
      )}

      {triage ? (
        <>
          <Actions>
            {pedido.status === 'Submetido' ? (
              <Button
                onClick={() =>
                  void act({ type: 'triarPedido', id: pedido.id }, 'Triagem iniciada.')
                }
              >
                Iniciar triagem
              </Button>
            ) : (
              <>
                <Button onClick={() => setConfirmation(true)}>Confirmar pedido</Button>

                <Button
                  kind="secondary"
                  onClick={() => setPanel(panel === 'return' ? '' : 'return')}
                >
                  Devolver para completar
                </Button>

                <Button
                  kind="secondary"
                  onClick={() => setPanel(panel === 'duplicate' ? '' : 'duplicate')}
                >
                  Associar duplicado
                </Button>
              </>
            )}
          </Actions>

          {panel === 'return' && (
            <Form
              onSubmit={() =>
                void act(
                  { type: 'alterarEstado', id: pedido.id, status: 'Devolvido', reason },
                  'Pedido devolvido ao autor.',
                ).then((a) => {
                  if (a.ok) setPanel('');
                })
              }
            >
              <Card title="Devolver pedido">
                <Area
                  label="Motivo *"
                  value={reason}
                  onChange={setReason}
                  maxLength={500}
                  required
                />

                <Actions>
                  <Button type="submit">Confirmar devolução</Button>
                  <Button kind="secondary" onClick={() => setPanel('')}>
                    Cancelar
                  </Button>
                </Actions>
              </Card>
            </Form>
          )}

          {panel === 'duplicate' && (
            <Form
              onSubmit={() =>
                void act(
                  { type: 'alterarEstado', id: pedido.id, status: 'Duplicado', originalId },
                  'Pedido associado ao original.',
                ).then((a) => {
                  if (a.ok) setPanel('');
                })
              }
            >
              <Card title="Associar pedido duplicado">
                <Select
                  label="Pedido original *"
                  value={originalId}
                  onChange={setOriginalId}
                  required
                  options={[
                    { value: '', label: 'Selecionar pedido' },
                    ...db.requests
                      .filter(
                        (i) =>
                          i.id !== pedido.id &&
                          i.status !== 'Duplicado' &&
                          i.product === pedido.product,
                      )
                      .map((i) => ({ value: i.id, label: i.code + ' · ' + i.title })),
                  ]}
                />

                <Actions>
                  <Button type="submit">Associar duplicado</Button>
                  <Button kind="secondary" onClick={() => setPanel('')}>
                    Cancelar
                  </Button>
                </Actions>
              </Card>
            </Form>
          )}
        </>
      ) : (
        <Card title="Atribuição técnica">
          <p className="muted">
            Responsável:{' '}
            {db.users.find((utilizador) => utilizador.id === pedido.assignee)?.name ||
              'Sem responsável'}
          </p>

          {inSprint &&
          ['Priorizado', 'Atribuído'].includes(pedido.status) &&
          pedido.criteria.length > 0 ? (
            <Form
              onSubmit={() =>
                void act(
                  { type: 'atribuir', id: pedido.id, assignee: developer },
                  'Atribuição guardada. O responsável foi notificado.',
                )
              }
            >
              <Select
                label="Responsável técnico *"
                value={developer}
                onChange={setDeveloper}
                required
                options={[
                  { value: '', label: 'Selecionar Developer' },
                  ...db.users
                    .filter((utilizador) => utilizador.role === 'developer')
                    .map((utilizador) => ({ value: utilizador.id, label: utilizador.name })),
                ]}
              />

              <Actions>
                <Button type="submit">Confirmar atribuição</Button>
              </Actions>
            </Form>
          ) : (
            <p className="small muted">
              A atribuição fica disponível para pedidos priorizados com critérios de aceitação e
              incluídos num sprint ativo.
            </p>
          )}
        </Card>
      )}

      {confirmation && (
        <Confirm
          title="Confirmar pedido?"
          label="Confirmar pedido"
          onClose={() => setConfirmation(false)}
          onConfirm={() =>
            void act(
              { type: 'alterarEstado', id: pedido.id, status: 'Confirmado' },
              'Pedido confirmado.',
            ).then((a) => {
              if (a.ok) setConfirmation(false);
            })
          }
        >
          <p>O pedido ficará disponível para decisão do Product Manager.</p>
        </Confirm>
      )}
    </>
  );
}
