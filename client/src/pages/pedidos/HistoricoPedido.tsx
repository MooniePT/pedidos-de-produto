import { useState } from 'react';
import { Badge, Card, Empty, Select, Table, date } from '../../components';
import { type Request } from '../../domain';
import { useApp } from '../../state';

/** US3 / VIS-3: mostra versões apenas ao autor e substitui nomes internos por uma identificação genérica. */
export function History({ request: pedido }: { request: Request }) {
  const { db, user } = useApp();
  const [version, setVersion] = useState('current');

  if (pedido.submittedBy !== user?.id) return <Empty title="Histórico privado" />;

  const selected = pedido.versions.find((v) => String(v.number) === version);

  return (
    <>
      <Card title="Versões do pedido">
        <Select
          label="Versão"
          value={version}
          onChange={setVersion}
          options={[
            { value: 'current', label: 'Versão atual' },
            ...pedido.versions.map((v) => ({
              value: String(v.number),
              label: 'Versão ' + v.number + ' · ' + date(v.date),
            })),
          ]}
        />

        <h3>{selected?.title || pedido.title}</h3>
        <p className="description">{selected?.description || pedido.description}</p>
        <p>Produto: {selected?.product || pedido.product}</p>
      </Card>

      <Card title="Histórico de alterações">
        <Table head={['Data', 'Utilizador', 'Alteração', 'Estado']}>
          {[...pedido.history].reverse().map((h) => (
            <tr key={h.id}>
              <td>{date(h.date)}</td>
              <td>
                {h.user === user.id
                  ? 'Você'
                  : db.users.find((utilizador) => utilizador.id === h.user)?.role === 'customer'
                    ? 'Participante'
                    : 'Equipa do produto'}
              </td>
              <td>{h.action}</td>
              <td>{h.to && <Badge status={h.to} />}</td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  );
}
