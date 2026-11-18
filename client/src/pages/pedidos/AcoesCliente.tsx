import { Link } from 'react-router-dom';
import { Actions, Card, Table } from '../../components';
import { editable, podeVotar, type Request } from '../../domain';
import { useApp } from '../../state';

/** Ícone do polegar usado no botão de voto. */
function IconeVoto() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M7 10v11H3V10h4Zm0 0 5-7c2 0 3 2 2 4l-1 3h6a2 2 0 0 1 2 2l-2 7a3 3 0 0 1-3 2H7" />
    </svg>
  );
}

/**
 * US4: botão de voto alternável.
 * Quando o cliente já votou, o botão fica azul (aria-pressed="true") e permite retirar o voto.
 */
function BotaoVoto({ pedido, votou }: { pedido: Request; votou: boolean }) {
  const { act } = useApp();

  function alternarVoto() {
    const comando = votou ? 'removerVoto' : 'adicionarVoto';
    const mensagem = votou ? 'Voto retirado.' : 'Voto registado.';

    void act({ type: comando, id: pedido.id }, mensagem);
  }

  return (
    <button
      type="button"
      className="button secondary vote-button"
      aria-pressed={votou}
      onClick={alternarVoto}
    >
      <IconeVoto />
      {votou ? 'Votado · retirar voto' : 'Votar'}
    </button>
  );
}

/** Ações do cliente: editar um pedido próprio ou adicionar/remover o seu voto. */
export function CustomerActions({ request: pedido }: { request: Request }) {
  const { user } = useApp();

  const votou = !!user && pedido.votes.includes(user.id);
  const totalVotos = pedido.voteOffset + pedido.votes.length;
  const podeEditar = pedido.submittedBy === user?.id && editable.includes(pedido.status);

  return (
    <>
      <Card title="Apoiar pedido" className="pedido-support">
        <div className="support-table">
          <Table head={['Votos', 'O seu voto']}>
            <tr>
              <td aria-live="polite">{totalVotos}</td>
              <td>
                {podeVotar(pedido) ? (
                  <BotaoVoto pedido={pedido} votou={votou} />
                ) : (
                  <span className="muted">Pedido concluído · já não aceita votos.</span>
                )}
              </td>
            </tr>
          </Table>
        </div>
      </Card>

      <Actions>
        <Link className="button secondary" to="/app/pedidos">
          Voltar aos pedidos
        </Link>

        {podeEditar && (
          <Link className="button primary" to={`/app/pedidos/${pedido.id}/editar`}>
            {pedido.status === 'Devolvido' ? 'Completar e reenviar' : 'Editar pedido'}
          </Link>
        )}
      </Actions>
    </>
  );
}
