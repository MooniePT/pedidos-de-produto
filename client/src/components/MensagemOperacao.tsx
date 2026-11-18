import { useApp } from '../state';

/** Apresenta o resultado ou erro devolvido pela operação. Não guarda nem altera pedidos. */
export function Toast() {
  const { toast, clearToast } = useApp();

  if (!toast) return null;

  return (
    <div
      className={'toast notice ' + (toast.error ? 'notice-error' : '')}
      role={toast.error ? 'alert' : 'status'}
    >
      <span>{toast.text}</span>
      <button onClick={clearToast} aria-label="Fechar mensagem">
        ×
      </button>
    </div>
  );
}
