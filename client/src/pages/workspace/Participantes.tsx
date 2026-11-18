import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Actions, Button, Card, Confirm, Empty, Field, Table } from '../../components';
import { podeVerWorkspace, workspaceApenasLeitura, type Request } from '../../domain';
import { useAgora } from '../../hooks/useAgora';
import { useApp } from '../../state';

/** US2: gera convites e mostra os participantes autorizados. A criação efetiva ocorre quando o primeiro convite é aceite. */
export function Members({ request: pedido }: { request: Request }) {
  const { db, user, act } = useApp();
  const agora = useAgora();
  const [link, setLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [remove, setRemove] = useState('');
  const owner = user?.id === pedido.submittedBy;
  const access = podeVerWorkspace(pedido, user);
  const readonly = workspaceApenasLeitura(pedido, agora);

  if (!access && !owner) return <Empty title="Participantes privados" />;

  async function gerarLinkConvite() {
    const response = await act(
      { type: 'gerarConvite', id: pedido.id },
      'Link de convite criado. Válido durante 7 dias.',
    );

    if (response.ok) setLink(location.origin + '/convite?token=' + response.result);
  }

  return (
    <>
      {pedido.workspace ? (
        <Card title="Participantes do Workspace">
          <p className="muted">
            Os participantes e os comentários só são visíveis aos membros e ao Product Manager.
          </p>

          <Table head={['Nome', 'Ação']}>
            {pedido.members.map((id) => (
              <tr key={id}>
                <td>{db.users.find((utilizador) => utilizador.id === id)?.name}</td>
                <td>
                  {owner && id !== pedido.submittedBy && !readonly && (
                    <Button kind="text-button" onClick={() => setRemove(id)}>
                      Remover
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </Table>
        </Card>
      ) : (
        <Card title="Convidar participantes">
          <p>
            O Workspace é criado automaticamente quando o primeiro convidado aceita o link. Terá o
            título do pedido como nome, até 50 carateres.
          </p>
        </Card>
      )}

      {owner && !readonly && (
        <Card title="Link de convite">
          <p>
            Partilhe o link com as pessoas que pretende convidar. O link é válido durante 7 dias.
          </p>

          <Actions>
            <Button onClick={() => void gerarLinkConvite()}>Gerar link de convite</Button>
          </Actions>

          {link && (
            <>
              <Field label="Link de convite" value={link} onChange={() => {}} />

              <Actions>
                <Button
                  kind="secondary"
                  onClick={() =>
                    void navigator.clipboard
                      .writeText(link)
                      .then(() => setCopied(true))
                      .catch(() => setCopied(false))
                  }
                >
                  {copied ? 'Copiado' : 'Copiar link'}
                </Button>

                <Link className="button secondary" to={link.replace(location.origin, '')}>
                  Abrir convite
                </Link>
              </Actions>

              <p className="muted small">
                Partilhe o link. Quem o abrir com sessão iniciada passa a participante do pedido.
              </p>
            </>
          )}
        </Card>
      )}

      {readonly && (
        <div className="notice">
          Workspace apenas de leitura: o prazo terminou ou o pedido já foi aprovado, rejeitado ou
          marcado como duplicado.
        </div>
      )}

      {remove && (
        <Confirm
          title="Remover participante?"
          onClose={() => setRemove('')}
          onConfirm={() =>
            void act(
              { type: 'removerMembro', id: pedido.id, member: remove, remove: true },
              'Participante removido.',
            ).then((a) => {
              if (a.ok) setRemove('');
            })
          }
        >
          <p>Este utilizador deixará de ter acesso ao Workspace.</p>
        </Confirm>
      )}
    </>
  );
}
