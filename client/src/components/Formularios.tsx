/** Controlos de formulário reutilizáveis. Os valores pertencem ao ecrã; as regras de negócio pertencem aos comandos. */
import { type FormEvent, type ReactNode } from 'react';

export function Button({
  children,
  onClick,
  kind = 'primary',
  type = 'button',
  disabled = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  kind?: 'primary' | 'secondary' | 'danger-button' | 'text-button';
  type?: 'button' | 'submit';
  disabled?: boolean;
}) {
  return (
    <button type={type} className={'button ' + kind} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

/** Campo controlado: o valor pertence ao formulário que o utiliza, incluindo contagem e limite de carateres. */
export function Field({
  label,
  value,
  onChange,
  type = 'text',
  maxLength,
  required = false,
  disabled = false,
  placeholder = '',
  min,
  max,
  error,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  maxLength?: number;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  min?: string;
  max?: string;
  /** Mensagem mostrada por baixo do campo (validação junto ao campo). */
  error?: string;
  autoComplete?: string;
}) {
  return (
    <label className="field">
      {label}

      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onInput={type === 'date' ? (e) => onChange(e.currentTarget.value) : undefined}
        maxLength={maxLength}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        min={min}
        max={max}
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
      />

      {maxLength && (
        <span className="counter">
          {value.length}/{maxLength}
        </span>
      )}

      {error && (
        <span className="field-error" role="alert">
          {error}
        </span>
      )}
    </label>
  );
}

export function Area({
  label,
  value,
  onChange,
  maxLength = 2000,
  required = false,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <label className="field">
      {label}

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={maxLength}
        required={required}
        disabled={disabled}
        rows={4}
      />

      <span className="counter">
        {value.length}/{maxLength}
      </span>
    </label>
  );
}

export function Select({
  label,
  value,
  onChange,
  options,
  disabled = false,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: (string | { value: string; label: string })[];
  disabled?: boolean;
  required?: boolean;
}) {
  return (
    <label className="field">
      {label}

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        required={required}
      >
        {options.map((o) => {
          const v = typeof o === 'string' ? o : o.value;

          return (
            <option key={v} value={v}>
              {typeof o === 'string' ? o : o.label}
            </option>
          );
        })}
      </select>
    </label>
  );
}

export function Check({
  label,
  checked,
  onChange,
  disabled = false,
}: {
  label: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="check">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
      />
      <span>{label}</span>
    </label>
  );
}

/** Evita o recarregamento da página e entrega a submissão à função do ecrã. */
export function Form({ onSubmit, children }: { onSubmit: () => void; children: ReactNode }) {
  return (
    <form
      className="stack"
      onSubmit={(event: FormEvent) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      {children}
    </form>
  );
}
