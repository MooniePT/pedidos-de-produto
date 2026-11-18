import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Actions } from './Apresentacao';
import { Button } from './Formularios';

/** Confirmação acessível: abre um diálogo nativo e devolve o foco ao elemento anterior ao fechar. */
export function Confirm({
  title,
  children,
  onConfirm,
  onClose,
  label = 'Confirmar',
  kind = 'danger-button',
}: {
  title: string;
  children: ReactNode;
  onConfirm: () => void;
  onClose: () => void;
  label?: string;
  kind?: 'primary' | 'danger-button';
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const element = dialog.current;
    const before = document.activeElement as HTMLElement;

    element?.showModal();

    return () => {
      element?.close();
      before?.focus();
    };
  }, []);

  return (
    <dialog
      ref={dialog}
      className="confirm-dialog"
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <h2 id={titleId}>{title}</h2>
      <div>{children}</div>

      <Actions>
        <Button kind={kind} onClick={onConfirm}>
          {label}
        </Button>
        <Button kind="secondary" onClick={onClose}>
          Cancelar
        </Button>
      </Actions>
    </dialog>
  );
}
