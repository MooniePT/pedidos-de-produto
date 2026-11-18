import { useState } from 'react';
import { Actions, Area, Button, Card, Confirm, Empty, Form, Table, date } from '../../components';
import {
  PRAZO_WORKSPACE_MS,
  podeEscreverWorkspace,
  podeVerWorkspace,
  type Request,
  type User,
} from '../../domain';
import { useAgora } from '../../hooks/useAgora';
import { useApp } from '../../state';

/** Texto do aviso no topo do Workspace, conforme quem consulta e o estado do pedido. */
function avisoWorkspace(pedido: Request, user: User | undefined, podeEscrever: boolean) {
  if (podeEscrever) {
    return 'Os membros podem comentar durante 14 dias, até o pedido ser aprovado, rejeitado ou marcado como duplicado.';
  }

  if (user?.role === 'product') {
    return 'Consulta do Product Manager · apenas leitura.';
  }

  if (pedido.status === 'Concluído') {
    return 'Pedido concluído · o Workspace fica apenas de leitura e já não aceita comentários.';
  }

  return 'Workspace apenas de leitura. O prazo terminou ou o pedido já avançou para decisão.';
}

/** US5: apresenta a discussão e os ficheiros privados; só disponibiliza escrita aos membros enquanto o espaço estiver aberto. */
export function Workspace({ request: pedido }: { request: Request }) {
  const { db, user, act } = useApp();
  const agora = useAgora();
  const [tab, setTab] = useState('discussion');
  const [text, setText] = useState('');
  const [mentions, setMentions] = useState<string[]>([]);
  const [fileError, setFileError] = useState('');
  const [removing, setRemoving] = useState('');

  // A autorização depende do membro, do estado do pedido e da hora atual; também é validada ao publicar.
  const writable = podeEscreverWorkspace(pedido, user, agora);

  if (!podeVerWorkspace(pedido, user)) return <Empty title="Sem acesso ao Workspace" />;

  if (!pedido.workspace) {
    return (
      <Card>
        <Empty title="Workspace ainda não criado">
          O primeiro convidado tem de aceitar o link de convite.
        </Empty>
      </Card>
    );
  }

  const mention = text.match(/@([^\s@]*)$/u);

  const suggestions = mention
    ? db.users.filter(
        (utilizador) =>
          pedido.members.includes(utilizador.id) &&
          utilizador.id !== user?.id &&
          utilizador.name
            .toLocaleLowerCase('pt-PT')
            .includes(mention[1].toLocaleLowerCase('pt-PT')),
      )
    : [];

  // Ao escolher uma sugestão, guarda o identificador do membro para o poder notificar.
  function mencionar(uid: string) {
    const utilizador = db.users.find((utilizador) => utilizador.id === uid)!;

    setText(text.replace(/@([^\s@]*)$/u, '@' + utilizador.name + ' '));
    setMentions([...new Set([...mentions, uid])]);
  }

  async function adicionarFicheiro(file: File | undefined) {
    if (!file) return;
    setFileError('');

    if (file.size > 2 * 1024 * 1024) {
      setFileError('O ficheiro deve ter até 2 MB.');

      return;
    }

    const reader = new FileReader();

    reader.onload = () =>
      void act(
        {
          type: 'adicionarFicheiro',
          id: pedido.id,
          file: {
            name: file.name,
            type: file.type || 'text/plain',
            size: file.size,
            data: String(reader.result),
          },
        },
        'Ficheiro adicionado.',
      );

    reader.onerror = () => setFileError('Não foi possível ler o ficheiro.');
    reader.readAsDataURL(file);
  }

  return (
    <>
      <Card title={pedido.workspace}>
        <p>
          Workspace privado · Criado em {date(pedido.workspaceCreatedAt)} · Prazo:{' '}
          {date(new Date(Date.parse(pedido.workspaceCreatedAt) + PRAZO_WORKSPACE_MS).toISOString())}
        </p>

        <div className="notice">{avisoWorkspace(pedido, user, writable)}</div>

        <Actions>
          <Button
            kind={tab === 'discussion' ? 'primary' : 'secondary'}
            onClick={() => setTab('discussion')}
          >
            Discussão
          </Button>
          <Button kind={tab === 'files' ? 'primary' : 'secondary'} onClick={() => setTab('files')}>
            Ficheiros
          </Button>
        </Actions>
      </Card>

      {tab === 'discussion' ? (
        <>
          <Card title="Discussão">
            {pedido.comments.length ? (
              pedido.comments.map((comentario) => (
                <article className="comment" key={comentario.id}>
                  <h3>
                    {db.users.find((utilizador) => utilizador.id === comentario.user)?.name}{' '}
                    <small className="muted">{date(comentario.date)}</small>
                  </h3>
                  <p className="description">{comentario.text}</p>
                </article>
              ))
            ) : (
              <Empty title="Ainda não há comentários" />
            )}
          </Card>

          {writable && (
            <Form
              onSubmit={() =>
                void act(
                  {
                    type: 'adicionarComentario',
                    id: pedido.id,
                    text,
                    mentions: mentions.filter((uid) =>
                      text.includes(
                        '@' + db.users.find((utilizador) => utilizador.id === uid)?.name,
                      ),
                    ),
                  },
                  'Comentário publicado.',
                ).then((a) => {
                  if (a.ok) {
                    setText('');
                    setMentions([]);
                  }
                })
              }
            >
              <Card title="Adicionar comentário">
                <Area
                  label="Comentário *"
                  value={text}
                  onChange={setText}
                  maxLength={1000}
                  required
                />

                <p className="small muted">Escreva @ para mencionar um membro deste Workspace.</p>

                {suggestions.length > 0 && (
                  <div className="mention-suggestions" aria-label="Membros para mencionar">
                    {suggestions.map((utilizador) => (
                      <Button
                        key={utilizador.id}
                        kind="secondary"
                        onClick={() => mencionar(utilizador.id)}
                      >
                        {utilizador.name}
                      </Button>
                    ))}
                  </div>
                )}

                <Actions>
                  <Button type="submit">Publicar comentário</Button>
                </Actions>
              </Card>
            </Form>
          )}
        </>
      ) : (
        <Card title="Ficheiros">
          {pedido.files.length ? (
            <Table head={['Ficheiro', 'Adicionado por', 'Ações']}>
              {pedido.files.map((f) => (
                <tr key={f.id}>
                  <td>{f.name}</td>
                  <td>{db.users.find((utilizador) => utilizador.id === f.user)?.name}</td>

                  <td>
                    <Actions>
                      <a href={f.data} download={f.name} className="button secondary">
                        Descarregar
                      </a>
                      {writable && (user?.id === f.user || user?.id === pedido.submittedBy) && (
                        <Button kind="text-button" onClick={() => setRemoving(f.id)}>
                          Remover
                        </Button>
                      )}
                    </Actions>
                  </td>
                </tr>
              ))}
            </Table>
          ) : (
            <Empty title="Ainda não há ficheiros" />
          )}

          {writable && (
            <label className="field">
              Adicionar ficheiro · PDF, PNG, JPEG ou TXT · até 2 MB
              <input
                type="file"
                accept="application/pdf,image/png,image/jpeg,text/plain"
                onChange={(e) => {
                  void adicionarFicheiro(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
            </label>
          )}

          {fileError && (
            <p className="field-error" role="alert">
              {fileError}
            </p>
          )}
        </Card>
      )}

      {removing && (
        <Confirm
          title="Remover ficheiro?"
          onClose={() => setRemoving('')}
          onConfirm={() =>
            void act(
              { type: 'removerFicheiro', id: pedido.id, fileId: removing },
              'Ficheiro removido.',
            ).then((a) => {
              if (a.ok) setRemoving('');
            })
          }
        >
          <p>O ficheiro será removido do Workspace.</p>
        </Confirm>
      )}
    </>
  );
}
