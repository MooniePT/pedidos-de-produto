/** Apresentação tabular dos pedidos, com seleção opcional e colunas adequadas ao perfil. */
import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { type Request } from '../domain';
import { useApp } from '../state';
import { Badge, Empty } from './Apresentacao';
import { Button, Check } from './Formularios';

export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

/** Tabela reutilizável; adapta as colunas ao perfil e permite a seleção na preparação do sprint. */
export function RequestsTable({
  requests,
  selection,
  onSelect,
  actionLabel = 'Consultar',
  action,
  emptyTitle = 'Nenhum pedido encontrado',
  emptyText = 'Experimente alterar os filtros ou volte mais tarde.',
}: {
  emptyTitle?: string;
  emptyText?: string;
  requests: Request[];
  selection?: string[];
  onSelect?: (id: string) => void;
  actionLabel?: string;
  action?: (r: Request) => void;
}) {
  const { db, user } = useApp();

  return requests.length ? (
    <Table
      head={[
        ...(selection ? ['Selecionar'] : []),
        'Pedido',
        'Estado',
        'Prioridade',
        ...(user?.role === 'customer' ? ['Autor', 'Votos'] : ['Responsável', 'Critérios']),
        'Ação',
      ]}
    >
      {requests.map((r) => (
        <tr key={r.id}>
          {selection && (
            <td>
              <Check
                label={<span className="sr-only">Selecionar {r.code}</span>}
                checked={selection.includes(r.id)}
                onChange={() => onSelect?.(r.id)}
              />
            </td>
          )}

          <td>
            {r.code} · {r.title}
          </td>

          <td>
            <Badge status={r.status} />
          </td>

          <td>{r.priority || '—'}</td>

          {user?.role === 'customer' ? (
            <>
              <td>{r.author}</td>
              <td>{r.voteOffset + r.votes.length}</td>
            </>
          ) : (
            <>
              <td>{db.users.find((u) => u.id === r.assignee)?.name || 'Sem responsável'}</td>
              <td>{r.criteria.length || 'Sem critérios'}</td>
            </>
          )}

          <td>
            {action ? (
              <Button kind="secondary" onClick={() => action(r)}>
                {actionLabel}
                <span className="sr-only"> {r.code}</span>
              </Button>
            ) : (
              <Link className="button secondary" to={'/app/pedidos/' + r.id}>
                Consultar<span className="sr-only"> {r.code}</span>
              </Link>
            )}
          </td>
        </tr>
      ))}
    </Table>
  ) : (
    <Empty title={emptyTitle}>{emptyText}</Empty>
  );
}
