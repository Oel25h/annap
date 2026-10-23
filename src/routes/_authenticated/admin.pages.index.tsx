import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Icon } from "@/components/site/Icon";
import type { StudioPageSummary } from "@/components/studio/model";
import { listStudioPages } from "@/lib/studio.functions";

/** Every page of the site, each opening in the page builder. */
export const Route = createFileRoute("/_authenticated/admin/pages/")({
  head: () => ({ meta: [{ title: "Pages — Studio" }] }),
  component: PagesIndex,
});

const KIND: Record<string, string> = {
  home: "Home page",
  standard: "Page",
  collection: "List page",
  legal: "Legal page",
  links: "Link page",
  system: "Fixed page",
};

function PagesIndex() {
  const [pages, setPages] = useState<StudioPageSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), 400);
    listStudioPages().then(setPages, (e: unknown) =>
      setError(e instanceof Error ? e.message : "The pages didn't load."),
    );
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <header className="page-head">
        <h1 className="display-m">Pages</h1>
        <p className="lead">
          Open a page to arrange its sections, edit them in English and Greek, and publish.
        </p>
      </header>
      {error ? (
        <p className="form-alert" role="alert">
          <Icon name="alert" />
          <span>{error} Reload the page to try again.</span>
        </p>
      ) : !pages ? (
        slow && <p className="meta">Loading pages…</p>
      ) : (
        <ul className="page-list">
          {pages.map((p) => (
            <li key={p.id}>
              <Link className="page-row" to="/admin/pages/$pageId" params={{ pageId: p.id }}>
                <span className="page-row-name">{p.title}</span>
                <span className="page-row-meta meta">
                  <span>{p.path}</span>
                  <span>{KIND[p.kind] ?? p.kind}</span>
                  <span>
                    {p.sectionCount} {p.sectionCount === 1 ? "section" : "sections"}
                  </span>
                </span>
                <span className="page-row-end">
                  {p.hasDraft ? (
                    <span className="state">Draft</span>
                  ) : p.status === "published" ? (
                    <span className="meta">Live</span>
                  ) : (
                    <span className="badge badge--hidden">
                      <Icon name="eye-off" />
                      <span>{p.status === "hidden" ? "Hidden" : "Not published"}</span>
                    </span>
                  )}
                  <Icon name="chev-right" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
