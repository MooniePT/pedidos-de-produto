import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Actions, Button, Card, Check, date, Empty, Heading } from '../../components';
import { useApp } from '../../state';

/** Mostra apenas as notificações do utilizador e permite marcá-las como lidas. */
export function Notifications() {
  const { db, user, act } = useApp();
  const [unread, setUnread] = useState(false);

  const notifications = db.notifications.filter(
    (n) => n.user === user?.id && (!unread || !n.read) && (user.preference === 'all' || n.relevant),
  );

  return (
    <>
      <Heading title="Notificações">
        Acompanhe as alterações e menções que lhe dizem respeito.
      </Heading>

      <Actions>
        <Check label="Apenas não lidas" checked={unread} onChange={setUnread} />
        <Button
          kind="secondary"
          onClick={() =>
            void act({ type: 'marcarTodasComoLidas' }, 'Notificações marcadas como lidas.')
          }
        >
          Marcar todas como lidas
        </Button>
      </Actions>

      <Card>
        {notifications.length ? (
          notifications.map((n) => (
            <article className={'notification ' + (!n.read ? 'unread' : '')} key={n.id}>
              <div>
                <h3>{n.message}</h3>
                <p className="muted small">{date(n.date)}</p>
              </div>

              <Actions>
                <Link
                  className="button secondary"
                  onClick={() => void act({ type: 'marcarComoLida', id: n.id })}
                  to={'/app/pedidos/' + n.requestId}
                >
                  Consultar pedido
                </Link>

                {!n.read && (
                  <Button
                    kind="text-button"
                    onClick={() => void act({ type: 'marcarComoLida', id: n.id })}
                  >
                    Marcar como lida
                  </Button>
                )}
              </Actions>
            </article>
          ))
        ) : (
          <Empty title="Sem notificações">As novidades dos seus pedidos aparecerão aqui.</Empty>
        )}
      </Card>
    </>
  );
}
