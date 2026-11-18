/** Elementos visuais comuns: títulos, cartões, estados, estatísticas e mensagens de lista vazia. */
import { type ReactNode } from 'react';
import { type Status } from '../domain';

export function Heading({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="heading">
      <h1>{title}</h1>
      {children && <p>{children}</p>}
    </div>
  );
}

export function Card({
  title,
  children,
  className = '',
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={'card ' + className}>
      {title && <h2>{title}</h2>}
      {children}
    </section>
  );
}

export function Actions({ children }: { children: ReactNode }) {
  return <div className="actions">{children}</div>;
}

export function Badge({ status }: { status: Status | string }) {
  const kind =
    status === 'Concluído'
      ? 'success'
      : ['Priorizado', 'Aprovado'].includes(status)
        ? 'purple'
        : ['Rejeitado', 'Duplicado'].includes(status)
          ? 'danger'
          : status === 'Devolvido'
            ? 'warning'
            : ['Em progresso', 'Atribuído'].includes(status)
              ? 'blue'
              : 'neutral';

  return <span className={'badge ' + kind}>{status}</span>;
}

export function Empty({
  title = 'Sem resultados',
  children,
}: {
  title?: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      {children && <p>{children}</p>}
    </div>
  );
}

export function Stats({ items }: { items: { label: string; value: ReactNode; hint?: string }[] }) {
  return (
    <div className="stats">
      {items.map((i) => (
        <div className="stat" key={i.label}>
          <p>{i.label}</p>
          <strong>{i.value}</strong>
          {i.hint && <small>{i.hint}</small>}
        </div>
      ))}
    </div>
  );
}
