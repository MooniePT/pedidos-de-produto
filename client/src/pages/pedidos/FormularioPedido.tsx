import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Actions,
  Area,
  Badge,
  Button,
  Card,
  Confirm,
  Field,
  Form,
  Heading,
  Select,
} from '../../components';
import { editable, produtos, validateRequest, type RequestInput } from '../../domain';
import { ColecaoPedidos } from '../../model/ColecaoPedidos';
import { useApp } from '../../state';

/** US1 e US6: recolhe os dados, apresenta semelhantes durante a escrita e envia a operação de submissão ou edição. */
export function RequestForm({ edit = false }: { edit?: boolean }) {
  const { db, user, act } = useApp();
  const { id } = useParams();
  const navigate = useNavigate();
  const original = db.requests.find((pedido) => pedido.id === id);
  // Guarda a versão que foi aberta; uma edição feita entretanto não deve ser sobrescrita.
  const [expectedVersion] = useState((original?.versions.length || 0) + 1);

  const [input, setInput] = useState<RequestInput>(() => ({
    title: edit ? original?.title || '' : '',
    description: edit ? original?.description || '' : '',
    product: edit ? original?.product || '' : '',
  }));

  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmar, setConfirmar] = useState(false);

  // As sugestões derivam do texto atual e do produto. Escrever não grava nem associa pedidos.
  const matches = edit
    ? []
    : new ColecaoPedidos(db).findSemelhantes(input.title, input.description, input.product);

  function alterarCampo<K extends keyof RequestInput>(key: K, value: RequestInput[K]) {
    setInput({ ...input, [key]: value });
    setError('');
  }

  // Valida e, num pedido novo, pede confirmação antes de submeter (o pedido não pode ser eliminado).
  function validarPedido() {
    if (busy) return;

    try {
      validateRequest(input);
    } catch (e) {
      setError((e as Error).message);

      return;
    }

    if (edit) void submeterPedido();
    else setConfirmar(true);
  }

  // Depois da validação, o ecrã envia uma operação; as alterações aos dados são feitas na camada de comandos.
  async function submeterPedido() {
    setConfirmar(false);
    setBusy(true);

    const result = await act(
      edit
        ? { type: 'editar', id: id!, input, version: expectedVersion }
        : { type: 'submeterPedido', input },
      edit
        ? 'Alterações guardadas. A versão anterior foi preservada.'
        : 'Pedido registado com sucesso',
    );

    setBusy(false);
    if (result.ok) navigate('/app/pedidos/' + result.result);
  }

  const teamEdit = user?.role === 'manager' && original?.status === 'Em triagem';

  const ownEdit =
    user?.role === 'customer' &&
    original?.submittedBy === user.id &&
    editable.includes(original.status);

  if (!user || (!edit && user.role !== 'customer') || (edit && !teamEdit && !ownEdit)) {
    return (
      <>
        <Heading title="Edição indisponível" />
        <Link to="/app">Voltar aos pedidos</Link>
      </>
    );
  }

  return (
    <>
      <Heading title={edit ? 'Editar pedido' : 'Novo pedido'}>
        {edit
          ? original?.code
          : 'Preencha os dados do pedido e escolha o produto a que se destina.'}
      </Heading>

      {original?.status === 'Devolvido' && <div className="notice">{original.reason}</div>}

      {error && (
        <div className="notice notice-error" role="alert">
          {error}
        </div>
      )}

      <Form onSubmit={validarPedido}>
        <Card title="Informação do pedido">
          <Select
            label="Produto selecionado *"
            value={input.product}
            onChange={(v) => alterarCampo('product', v)}
            options={[{ value: '', label: 'Selecionar produto' }, ...produtos]}
            required
            disabled={
              busy || !!(edit && user.role === 'customer' && original?.status !== 'Submetido')
            }
          />

          <Field
            label="Título *"
            value={input.title}
            onChange={(v) => alterarCampo('title', v)}
            maxLength={100}
            required
            disabled={busy}
          />

          <Area
            label="Descrição *"
            value={input.description}
            onChange={(v) => alterarCampo('description', v)}
            required
            disabled={busy}
          />
        </Card>

        {matches.length > 0 && (
          <section
            className="notice similar-live"
            aria-label="Pedidos semelhantes"
            aria-live="polite"
          >
            <h2>
              Encontrámos {matches.length}{' '}
              {matches.length === 1 ? 'pedido semelhante' : 'pedidos semelhantes'}
            </h2>

            <p>
              Se algum corresponder à sua necessidade, consulte-o e vote nele. Assim evita pedidos
              duplicados.
            </p>

            {matches.map((pedido) => (
              <article className="similar-request" key={pedido.id}>
                <div>
                  <h3>
                    {pedido.code} · {pedido.title}
                  </h3>
                  <p>
                    <Badge status={pedido.status} /> {pedido.voteOffset + pedido.votes.length} votos
                    · {pedido.author}
                  </p>
                </div>

                <Link className="button secondary" to={'/app/pedidos/' + pedido.id}>
                  Ver e votar<span className="sr-only"> {pedido.code}</span>
                </Link>
              </article>
            ))}
          </section>
        )}

        <Actions>
          <Button type="submit" disabled={busy}>
            {busy
              ? 'A guardar…'
              : edit
                ? original?.status === 'Devolvido'
                  ? 'Guardar e reenviar'
                  : 'Guardar alterações'
                : matches.length
                  ? 'Continuar e submeter pedido'
                  : 'Submeter pedido'}
          </Button>

          <Link className="button secondary" to={edit ? '/app/pedidos/' + id : '/app'}>
            Cancelar
          </Link>
        </Actions>
      </Form>

      {confirmar && (
        <Confirm
          title="Submeter pedido?"
          label="Submeter"
          kind="primary"
          onConfirm={() => void submeterPedido()}
          onClose={() => setConfirmar(false)}
        >
          <p>
            Confirma a submissão do pedido «{input.title.trim()}» para o produto {input.product}?
            Depois de submetido, o pedido não pode ser eliminado.
          </p>
        </Confirm>
      )}
    </>
  );
}
