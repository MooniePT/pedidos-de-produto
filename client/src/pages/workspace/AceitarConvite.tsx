import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button, Card, Field, Heading } from '../../components';
import { useApp } from '../../state';

/** Aceita o token de um convite. A operação valida o prazo e cria o Workspace quando entra o primeiro convidado. */
export function Invite() {
  const { db, user, act } = useApp();
  const [params] = useSearchParams();
  const [token, setToken] = useState(params.get('token') || '');
  const invite = db.invites.find((i) => i.token === token);
  const request = db.requests.find((pedido) => pedido.id === invite?.requestId);

  return (
    <>
      <Heading title="Aceitar convite">Junte-se ao workspace de um pedido.</Heading>

      <Card>
        <Field label="Código do convite" value={token} onChange={setToken} />

        {request && (
          <p>
            {request.code} · {request.title}
          </p>
        )}

        {!user ? (
          <Link
            to={'/?continuar=' + encodeURIComponent('/convite?token=' + token)}
            className="button primary"
          >
            Iniciar sessão para continuar
          </Link>
        ) : (
          <Button
            onClick={() =>
              void act(
                { type: 'aceitarConvite', token },
                'Convite aceite. Já pode abrir o workspace.',
              )
            }
          >
            Aceitar convite
          </Button>
        )}

        {request && user && request.members.includes(user.id) && (
          <Link to={'/app/pedidos/' + request.id + '?tab=workspace'} className="button secondary">
            Abrir workspace
          </Link>
        )}
      </Card>
    </>
  );
}
