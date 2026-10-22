import { forwardRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";

/** Admin form controls — higher contrast than public ivory/bone wash */
export const inputCls =
  "w-full rounded-full border border-plum/25 bg-[#f7f1e8] px-5 py-3 text-plum placeholder:text-plum/45 focus:border-burgundy focus:outline-none focus:ring-4 focus:ring-burgundy/15 transition";
export const textareaCls =
  "w-full rounded-3xl border border-plum/25 bg-[#f7f1e8] px-5 py-4 text-plum placeholder:text-plum/45 focus:border-burgundy focus:outline-none focus:ring-4 focus:ring-burgundy/15 transition";
export const cardCls =
  "rounded-3xl border border-plum/15 bg-[#f3ebe1] p-6 md:p-8 shadow-[0_8px_24px_-16px_rgba(26,26,26,0.35)]";

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "outline" | "danger";
  size?: "sm" | "md";
};

export const PillButton = forwardRef<HTMLButtonElement, BtnProps>(function PillButton(
  { variant = "primary", size = "md", className = "", children, ...p },
  ref,
) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-full font-medium uppercase tracking-[0.22em] transition disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-burgundy/20 focus-visible:ring-offset-2 focus-visible:ring-offset-[#e8dccf]";
  const sizes = size === "sm" ? "px-4 py-2 text-[10px]" : "px-6 py-3 text-[11px]";
  const styles: Record<string, string> = {
    primary:
      "bg-burgundy text-ivory shadow-[0_10px_24px_-14px_rgba(232,93,58,0.65)] hover:-translate-y-0.5 hover:bg-terracotta",
    outline: "border border-plum/30 bg-[#f7f1e8] text-plum hover:border-plum hover:bg-plum/5",
    ghost: "text-plum/80 hover:text-plum hover:bg-plum/8",
    danger: "border border-terracotta/50 text-terracotta hover:bg-terracotta/10",
  };
  return (
    <button ref={ref} className={`${base} ${sizes} ${styles[variant]} ${className}`} {...p}>
      {children}
    </button>
  );
});

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-plum/85">
        {label}
      </span>
      <div className="mt-2">{children}</div>
      {hint && <span className="mt-1.5 block text-xs font-medium text-plum/65">{hint}</span>}
    </label>
  );
}

export function ConfirmButton({
  onConfirm,
  message,
  children,
  className = "",
  variant = "danger",
  size = "sm",
}: {
  onConfirm: () => void | Promise<void>;
  message: string;
  children: ReactNode;
  className?: string;
  variant?: BtnProps["variant"];
  size?: BtnProps["size"];
}) {
  const [armed, setArmed] = useState(false);
  return (
    <PillButton
      variant={armed ? "primary" : variant}
      size={size}
      className={className}
      onClick={() => {
        if (armed) {
          setArmed(false);
          onConfirm();
        } else {
          setArmed(true);
          setTimeout(() => setArmed(false), 3500);
        }
      }}
      title={armed ? "Click again to confirm" : message}
    >
      {armed ? "Confirm?" : children}
    </PillButton>
  );
}

export function Toast({ show, children }: { show: boolean; children: ReactNode }) {
  if (!show) return null;
  return (
    <div className="fixed bottom-8 left-1/2 z-50 -translate-x-1/2 rounded-full bg-plum px-6 py-3 text-xs uppercase tracking-[0.24em] text-ivory soft-shadow-lg">
      {children}
    </div>
  );
}

export function EmptyState({
  title,
  sub,
  action,
}: {
  title: string;
  sub?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-plum/25 bg-[#efe6db] px-6 py-16 text-center">
      <h3 className="font-display text-2xl text-plum">{title}</h3>
      {sub && <p className="mx-auto mt-2 max-w-md text-sm font-medium text-ink">{sub}</p>}
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  );
}

export function Chip({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "coral" | "success" | "warn";
}) {
  const tones: Record<string, string> = {
    default: "bg-plum/12 text-plum",
    coral: "bg-burgundy/15 text-burgundy",
    success: "bg-emerald-200/80 text-emerald-900",
    warn: "bg-amber-200/80 text-amber-950",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
