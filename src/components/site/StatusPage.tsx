import type { ReactNode } from "react";
import { useT } from "@/lib/i18n/context";
import { nb } from "@/lib/i18n/rag";
import { TextLink, type HeadLink } from "@/sections/render/SectionShell";

/**
 * The quiet page used for not found, errors, downloads, confirmations and
 * receipts: one h1 in Display XL on ivory, then whatever the moment needs,
 * kept to the text column and starting at column 1.
 */
export function StatusPage({
  title,
  alert,
  children,
}: {
  /** Plain text gets the rag; pass markup to mark English inside a Greek title. */
  title: ReactNode;
  /** Announce the page at once (errors). */
  alert?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      className="section band-ivory status-page"
      aria-labelledby="status-title"
      role={alert ? "alert" : undefined}
    >
      <div className="wrap">
        <h1 id="status-title" className="display-xl">
          {typeof title === "string" ? nb(title) : title}
        </h1>
        {children}
      </div>
    </section>
  );
}

/** Where to go next: standalone links in a row that wraps. */
export function StatusLinks({ links }: { links: HeadLink[] }) {
  return (
    <ul className="status-links">
      {links.map((link) => (
        <li key={link.href}>
          <TextLink link={link} />
        </li>
      ))}
    </ul>
  );
}

/** The 404: what happened, then good places to start again. */
export function NotFoundPage() {
  const t = useT();
  const n = t.site.notFound;
  return (
    <StatusPage title={n.title}>
      <p className="lead">{nb(n.body)}</p>
      <StatusLinks
        links={[
          { label: n.home, href: "/" },
          { label: n.books, href: "/books" },
          { label: n.stories, href: "/blog" },
          { label: n.contact, href: "/contact" },
        ]}
      />
    </StatusPage>
  );
}
