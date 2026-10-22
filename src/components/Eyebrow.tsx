import type { ReactNode } from "react";

export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`flex items-center gap-3 text-[11px] uppercase tracking-[0.28em] text-burgundy ${className}`}
    >
      <span className="h-px w-8 bg-burgundy" />
      <span>{children}</span>
    </div>
  );
}
