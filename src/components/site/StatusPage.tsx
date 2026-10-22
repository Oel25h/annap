import type { ReactNode } from "react";
import { caps } from "@/lib/i18n/caps";

/**
 * The quiet page used for not found, errors, downloads, confirmations and
 * receipts: a label, one heading, then whatever the moment needs.
 */
export function StatusPage({
  label,
  title,
  alert,
  children,
}: {
  label?: string;
  title: string;
  /** Announce the page at once (errors). */
  alert?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      className="chapter status-page"
      aria-labelledby="status-title"
      role={alert ? "alert" : undefined}
    >
      <div className="wrap">
        {label && <p className="label label--accent">{caps(label)}</p>}
        <h1 id="status-title" className="display-l">
          {title}
        </h1>
        {children}
      </div>
    </section>
  );
}
