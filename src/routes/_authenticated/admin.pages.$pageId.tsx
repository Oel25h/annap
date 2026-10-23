import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@/components/studio/Canvas";
import { AddSectionDialog, DeleteDialog, PublishDialog } from "@/components/studio/Dialogs";
import { newSection } from "@/components/studio/fields";
import { Inspector } from "@/components/studio/Inspector";
import {
  sectionName,
  type DraftSection,
  type GreekStatus,
  type StudioPage,
} from "@/components/studio/model";
import type { Lang } from "@/components/studio/parts";
import { SectionsPane } from "@/components/studio/SectionsPane";
import { TopBar } from "@/components/studio/TopBar";
import { useStudioEditing } from "@/components/studio/useStudioEditing";
import { getStudioPage, publishStudioPage } from "@/lib/studio.functions";

/**
 * The page builder (DESIGN.md §10–11): the Sections list, the live preview
 * and the Inspector under one top bar from 1180; one column with a section
 * picker and a Sections sheet below. Edits save themselves as a draft;
 * Publish makes them live through publish_draft.
 */
export const Route = createFileRoute("/_authenticated/admin/pages/$pageId")({
  head: () => ({ meta: [{ title: "Studio — Anastasia Patience" }] }),
  component: Builder,
});

function Builder() {
  const { pageId } = Route.useParams();
  const [data, setData] = useState<StudioPage | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    setData(null);
    setError(null);
    getStudioPage({ data: { pageId } }).then(
      (page) => live && setData(page),
      (e: unknown) =>
        live && setError(e instanceof Error ? e.message : "This page didn't load. Try again."),
    );
    return () => {
      live = false;
    };
  }, [pageId]);

  if (error) {
    return (
      <main className="studio-app studio-auth" id="main">
        <div className="studio-auth-card">
          <h1 className="title">This page didn't load</h1>
          <p className="form-alert" role="alert">
            {error}
          </p>
          <Link className="link" to="/admin/pages">
            All pages
          </Link>
        </div>
      </main>
    );
  }
  if (!data) return <div className="studio-wait" aria-busy="true" />;
  return <Studio key={pageId} data={data} />;
}

function useMedia(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const list = window.matchMedia(query);
    const change = () => setMatches(list.matches);
    list.addEventListener("change", change);
    return () => list.removeEventListener("change", change);
  }, [query]);
  return matches;
}

/** The current time, every half minute, for "Saved 3 min ago". */
function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

function Studio({ data }: { data: StudioPage }) {
  const { page } = data;
  const frameRef = useRef<HTMLIFrameElement>(null);
  const pickerRef = useRef<HTMLButtonElement>(null);
  const refreshPreview = useCallback(() => {
    frameRef.current?.contentWindow?.postMessage({ type: "ap:refresh" }, window.location.origin);
  }, []);
  const editing = useStudioEditing(data, refreshPreview);
  const [lang, setLang] = useState<Lang>("en");
  const desktop = useMedia("(min-width: 1180px)");
  const now = useNow();
  const [sheet, setSheet] = useState(false);
  const [focusRow, setFocusRow] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<DraftSection | null>(null);

  const { counts, firstWith, stale, missing } = useMemo(() => {
    const counts: Record<GreekStatus, number> = { approved: 0, draft: 0, stale: 0, missing: 0 };
    const first: Partial<Record<GreekStatus, string>> = {};
    const names: Record<GreekStatus, string[]> = {
      approved: [],
      draft: [],
      stale: [],
      missing: [],
    };
    for (const section of editing.sections) {
      const status = editing.statusOf(section);
      if (!status) continue;
      counts[status]++;
      first[status] ??= section.id;
      if (!section.settings.hidden) names[status].push(sectionName(section));
    }
    return {
      counts,
      firstWith: (status: GreekStatus) => first[status] ?? null,
      stale: names.stale,
      missing: names.missing,
    };
  }, [editing]);

  const closeSheet = useCallback(() => {
    setSheet(false);
    requestAnimationFrame(() => pickerRef.current?.focus());
  }, []);
  const clearFocus = useCallback(() => setFocusRow(null), []);

  const select = (id: string) => {
    editing.select(id);
    if (sheet) closeSheet();
  };

  // A badge jumps to its row; on phones the sheet opens on it.
  const onBadge = (id: string) => {
    if (!desktop) setSheet(true);
    setFocusRow(id);
  };

  // The sheet is a phone and tablet affordance; widening the window closes it.
  useEffect(() => {
    if (desktop && sheet) setSheet(false);
  }, [desktop, sheet]);

  const publish = async (): Promise<string[] | null> => {
    await editing.saveNow();
    const result = await publishStudioPage({ data: { pageId: page.id } });
    if (!result.ok) return result.problems;
    editing.published();
    editing.setStatus(`Published. ${page.title} is live in English and Greek.`);
    refreshPreview();
    return null;
  };

  const src = `${lang === "el" ? "/el" : ""}/preview/page/${page.id}`;

  return (
    <div className="studio-app studio-builder">
      <a className="skip" href="#inspector">
        Skip to section settings
      </a>
      <div className="panes" inert={sheet}>
        <TopBar
          title={page.title}
          editing={editing}
          lang={lang}
          onLang={setLang}
          counts={counts}
          firstWith={firstWith}
          onBadge={onBadge}
          previewHref={src}
          onPublish={() => setPublishing(true)}
          now={now}
        />
      </div>
      <main className="studio" id="main">
        <h1 className="sr-only">Studio: editing {page.title}</h1>
        <p className="sr-only" role="status">
          {editing.status}
        </p>
        <p className="sr-only" aria-live="assertive">
          {editing.moveNote}
        </p>
        <SectionsPane
          pageTitle={page.title}
          editing={editing}
          counts={counts}
          isHome={page.kind === "home"}
          sheetOpen={sheet}
          onCloseSheet={closeSheet}
          onSelect={select}
          onAdd={() => setAdding(true)}
          focusId={focusRow}
          onFocused={clearFocus}
        />
        <div className="panes" inert={sheet}>
          <Canvas
            editing={editing}
            pageTitle={page.title}
            lang={lang}
            src={src}
            frameRef={frameRef}
            desktop={desktop}
            onOpenSheet={() => setSheet(true)}
            pickerRef={pickerRef}
            onAdd={() => setAdding(true)}
            onDelete={setDeleting}
          />
          <Inspector
            editing={editing}
            lang={lang}
            onLang={setLang}
            options={data}
            onDelete={setDeleting}
          />
        </div>
      </main>
      <PublishDialog
        open={publishing}
        onClose={() => setPublishing(false)}
        pageTitle={page.title}
        changes={editing.changes}
        stale={stale}
        missing={missing}
        onPublish={publish}
      />
      <AddSectionDialog
        open={adding}
        onClose={() => setAdding(false)}
        onAdd={(type) => editing.insert(newSection(type), editing.selected?.id ?? null)}
      />
      <DeleteDialog
        name={deleting ? sectionName(deleting) : null}
        onClose={() => setDeleting(null)}
        onDelete={() => deleting && editing.remove(deleting.id)}
      />
    </div>
  );
}
