import { Card, Heading, RequestsTable } from '../../components';
import { useApp } from '../../state';

/** Lista os pedidos confirmados que aguardam a decisão do Product Manager. */
export function Decisions() {
  const { db } = useApp();

  return (
    <>
      <Heading title="Pedidos por decidir">
        Aprove ou rejeite os pedidos confirmados na triagem.
      </Heading>
      <Card>
        <RequestsTable requests={db.requests.filter((pedido) => pedido.status === 'Confirmado')} />
      </Card>
    </>
  );
}
