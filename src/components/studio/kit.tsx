/**
 * The managers' building blocks, on the studio's tokens (DESIGN.md §9–10):
 * page heads, labelled fields with hints and errors linked by
 * aria-describedby, switches, the save line, confirmations as native modal
 * dialogs, and the empty, loading and error states. No toasts: every change
 * is said once through an sr-only status region and stays visible in place.
 */
import {
  useEffect,
  useId,
  useRef,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { Icon } from "@/components/site/Icon";
import { errorText } from "./format";

export function PageHead({
  title,
  lead,
  back,
  actions,
}: {
  title: string;
  lead?: ReactNode;
  back?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="page-head mgr-head">
      {back}
      <div className="mgr-head-row">
        <h1 className="display-m">{title}</h1>
        {actions && <div className="mgr-head-actions">{actions}</div>}
      </div>
      {lead && <p className="lead">{lead}</p>}
    </header>
  );
}

/** "‹ All books": the way back from an editor to its list. */
export function BackLink({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button className="btn-text mgr-back" type="button" onClick={onClick}>
      <Icon name="chev-left" />
      {children}
    </button>
  );
}

type Described = { id: string; "aria-describedby"?: string; "aria-invalid"?: true };

/** A label above, the control, then the hint and the error, linked to the control. */
export function Field({
  label,
  hint,
  error,
  aside,
  lang,
  children,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  aside?: ReactNode;
  lang?: string;
  children: (props: Described) => ReactNode;
}) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div className="field" lang={lang}>
      <div className="field-top">
        <label htmlFor={id}>{label}</label>
        {aside}
      </div>
      {children({
        id,
        "aria-describedby": describedBy,
        ...(error ? { "aria-invalid": true as const } : {}),
      })}
      {hint && (
        <p className="field-hint" id={hintId}>
          {hint}
        </p>
      )}
      {error && (
        <p className="field-error" id={errorId}>
          <Icon name="alert" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

type Common = { label: ReactNode; hint?: ReactNode; error?: string | null; aside?: ReactNode };

export function TextField({
  label,
  hint,
  error,
  aside,
  value,
  onChange,
  ...rest
}: Common & {
  value: string;
  onChange: (value: string) => void;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "id">) {
  return (
    <Field label={label} hint={hint} error={error} aside={aside} lang={rest.lang}>
      {(p) => <input {...rest} {...p} value={value} onChange={(e) => onChange(e.target.value)} />}
    </Field>
  );
}

export function AreaField({
  label,
  hint,
  error,
  aside,
  value,
  onChange,
  rows = 5,
  ...rest
}: Common & {
  value: string;
  onChange: (value: string) => void;
} & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange" | "id">) {
  return (
    <Field label={label} hint={hint} error={error} aside={aside} lang={rest.lang}>
      {(p) => (
        <textarea
          {...rest}
          {...p}
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </Field>
  );
}

export type Option = { value: string; label: string };

export function SelectField({
  label,
  hint,
  error,
  value,
  onChange,
  options,
  ...rest
}: Common & {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, "value" | "onChange" | "id">) {
  return (
    <Field label={label} hint={hint} error={error}>
      {(p) => (
        <select {...rest} {...p} value={value} onChange={(e) => onChange(e.target.value)}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
}

/** The whole 44px row is the label; the hint describes the switch. */
export function Switch({
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  label: ReactNode;
  hint?: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="mgr-switch">
      <label className="switch-row">
        <span className="setting-label">{label}</span>
        <span className="switch">
          <input
            type="checkbox"
            role="switch"
            checked={checked}
            disabled={disabled}
            aria-describedby={hint ? `${id}-hint` : undefined}
            onChange={(e) => onChange(e.target.checked)}
          />
          <span className="switch-track" aria-hidden="true" />
        </span>
      </label>
      {hint && (
        <p className="field-hint" id={`${id}-hint`}>
          {hint}
        </p>
      )}
    </div>
  );
}

/** A segmented control: a fieldset of radios with a legend. */
export function Segmented({
  legend,
  value,
  onChange,
  options,
  hideLegend,
}: {
  legend: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  hideLegend?: boolean;
}) {
  const name = useId();
  return (
    <fieldset className="seg-field">
      <legend className={hideLegend ? "sr-only" : "setting-label"}>{legend}</legend>
      <div className="seg">
        {options.map((o) => (
          <label key={o.value}>
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
            />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function FormAlert({ children }: { children: ReactNode }) {
  return (
    <p className="form-alert" role="alert">
      <Icon name="alert" />
      <span>{children}</span>
    </p>
  );
}

/** Text that appears only once a wait passes 400ms (DESIGN.md: no spinners). */
export function Loading({ children }: { children: ReactNode }) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), 400);
    return () => clearTimeout(timer);
  }, []);
  return (
    <div className="mgr-wait" role="status">
      {slow ? <p className="meta">{children}</p> : null}
    </div>
  );
}

/** Say what is missing and offer the next step. */
export function Empty({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mgr-empty">
      <p>{children}</p>
      {action}
    </div>
  );
}

/** A native modal dialog: focus moves inside, Escape cancels, focus returns. */
export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return (
    <dialog
      className={wide ? "confirm confirm--wide" : "confirm"}
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
    >
      {open ? (
        <>
          <h2 id={titleId}>{title}</h2>
          {children}
        </>
      ) : null}
    </dialog>
  );
}

/** "Delete 'Title'?" with the consequence, Cancel and a Berry confirm. */
export function ConfirmDialog({
  open,
  title,
  body,
  confirm,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  body: ReactNode;
  confirm: string;
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (open) setError(null);
  }, [open]);
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p>{body}</p>
      {error && <FormAlert>{error}</FormAlert>}
      <div className="confirm-actions">
        <button className="btn btn-quiet" type="button" onClick={onClose}>
          Cancel
        </button>
        <button
          className="btn btn-quiet btn-danger"
          type="button"
          aria-busy={busy || undefined}
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onConfirm();
              onClose();
            } catch (e) {
              setError(errorText(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          {confirm}
        </button>
      </div>
    </Modal>
  );
}
