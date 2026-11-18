import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Actions, Area, Button, Card, Confirm, Field, Form } from '../../components';
import { MENSAGEM_NOTA_EM_FALTA, type Request } from '../../domain';
import { useApp } from '../../state';

/** US24, US25 e US27: iniciar trabalho, associar código e concluir com uma nota de resolução. */
export function DeveloperActions({ request: pedido }: { request: Request }) {
  const { db, user, act } = useApp();
  const [url, setUrl] = useState('');
  const [note, setNote] = useState('');
  const [conclude, setConclude] = useState(false);
  const [noteError, setNoteError] = useState('');
  const [remove, setRemove] = useState('');
  const own = pedido.assignee === user?.id;
  const working = own && pedido.status === 'Em progresso';

  // US25 CA2: sem nota de resolução, mostra a mensagem do documento e não conclui o pedido.
  async function concluirPedido() {
    if (!note.trim()) {
      setNoteError(MENSAGEM_NOTA_EM_FALTA);
      return;
    }

    const resultado = await act(
      { type: 'concluir', id: pedido.id, note },
      'Pedido concluído. O gestor e o autor foram notificados.',
    );

    if (resultado.ok) {
      setNote('');
      setConclude(false);
    }
  }

  return (
    <>
      <div className="detail-grid">
        <Card title="Critérios de aceitação">
          {pedido.criteria.length ? (
            <ol>
              {pedido.criteria.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ol>
          ) : (
            <p className="muted">Não existem critérios definidos.</p>
          )}
        </Card>

        <Card title="Contexto">
          <p>
            Responsável:{' '}
            {db.users.find((utilizador) => utilizador.id === pedido.assignee)?.name ||
              'Sem responsável'}
          </p>

          <p>
            Sprint:{' '}
            {db.sprints.find((s) => s.state === 'Ativo' && s.requestIds.includes(pedido.id))
              ?.name || 'Sem sprint ativo'}
          </p>

          <p>
            Dependências:{' '}
            {db.dependencies
              .filter((e) => e.from === pedido.id)
              .map((e) => db.requests.find((q) => q.id === e.to)?.code)
              .join(', ') || 'Nenhuma'}
          </p>
        </Card>
      </div>

      <Actions>
        {own && pedido.status === 'Atribuído' && (
          <Button
            onClick={() =>
              void act({ type: 'atualizarEstado', id: pedido.id }, 'Trabalho iniciado.')
            }
          >
            Iniciar trabalho
          </Button>
        )}

        {/* Abre o formulário de conclusão; se já estiver aberto, não faz nada. */}
        {working && <Button onClick={() => setConclude(true)}>Concluir pedido</Button>}

        <Link className="button secondary" to="/app">
          Voltar aos meus pedidos
        </Link>
      </Actions>

      {['Em progresso', 'Concluído'].includes(pedido.status) && (
        <Card title="Alterações de código">
          {pedido.links.length ? (
            <ul className="link-list">
              {pedido.links.map((l) => (
                <li key={l}>
                  <a href={l} target="_blank" rel="noreferrer">
                    {l}
                  </a>
                  {working && (
                    <Button kind="text-button" onClick={() => setRemove(l)}>
                      Remover
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">Ainda não foram associados links.</p>
          )}

          {working && (
            <Form
              onSubmit={() =>
                void act({ type: 'associarCodigo', id: pedido.id, url }, 'Link associado.').then(
                  (a) => {
                    if (a.ok) setUrl('');
                  },
                )
              }
            >
              <Field
                label="Link da alteração de código *"
                value={url}
                onChange={setUrl}
                placeholder="https://github.com/equipa/projeto/commit/..."
                required
              />

              <Actions>
                <Button type="submit">Associar link</Button>
              </Actions>
            </Form>
          )}
        </Card>
      )}

      {working && conclude && (
        <Form onSubmit={() => void concluirPedido()}>
          <Card title="Concluir pedido">
            <Area
              label="Nota de resolução *"
              value={note}
              onChange={(texto) => {
                setNote(texto);
                setNoteError('');
              }}
              maxLength={1000}
            />

            {noteError && (
              <p className="field-error" role="alert">
                {noteError}
              </p>
            )}

            <Actions>
              <Button type="submit">Confirmar conclusão</Button>
              <Button
                kind="secondary"
                onClick={() => {
                  setConclude(false);
                  setNoteError('');
                }}
              >
                Cancelar
              </Button>
            </Actions>
          </Card>
        </Form>
      )}

      {pedido.resolution && (
        <Card title="Nota de resolução">
          <p className="description">{pedido.resolution}</p>
        </Card>
      )}

      {remove && (
        <Confirm
          title="Remover link?"
          onClose={() => setRemove('')}
          onConfirm={() =>
            void act({ type: 'removerCodigo', id: pedido.id, url: remove }, 'Link removido.').then(
              (a) => {
                if (a.ok) setRemove('');
              },
            )
          }
        >
          <p>{remove}</p>
        </Confirm>
      )}
    </>
  );
}
