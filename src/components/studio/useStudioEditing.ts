/**
 * The page builder's editing state: the draft sections and Greek drafts,
 * undo and redo, autosave, the selection, keyboard reordering and the live
 * announcements (DESIGN.md §10, "Editing behaviour").
 *
 * - Every change saves itself after a short pause. Offline, the draft is kept
 *   on this device and saved once the connection is back.
 * - Ctrl/Cmd+Z undoes, Shift+Ctrl/Cmd+Z (or Ctrl+Y) redoes. Typing into one
 *   field is one step, not one per letter.
 * - Locked sections (the home page's hero and player) never move, hide or go.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { keepStudioGreek, saveStudioDraft, saveStudioGreek } from "@/lib/studio.functions";
import {
  draftChanges,
  englishOf,
  greekStatus,
  isLocked,
  moveSection,
  moveTarget,
  needsGreek,
  sectionName,
  type DraftSection,
  type Fields,
  type GreekRow,
  type GreekStatus,
  type StudioPage,
} from "./model";

type Snapshot = { sections: DraftSection[]; greek: Record<string, Fields> };
type Step = { snapshot: Snapshot; label: string };

export type SaveState =
  | { kind: "saved"; at: number | null }
  | { kind: "saving" }
  | { kind: "local" }
  | { kind: "error"; message: string };

const MERGE_MS = 1200;
const SAVE_DELAY = 700;
const localKey = (pageId: string) => `studio-draft:${pageId}`;

function readLocal(pageId: string): (Snapshot & { at: number }) | null {
  try {
    const raw = localStorage.getItem(localKey(pageId));
    return raw ? (JSON.parse(raw) as Snapshot & { at: number }) : null;
  } catch {
    return null;
  }
}

function writeLocal(pageId: string, snapshot: Snapshot | null) {
  try {
    if (snapshot)
      localStorage.setItem(localKey(pageId), JSON.stringify({ ...snapshot, at: Date.now() }));
    else localStorage.removeItem(localKey(pageId));
  } catch {
    // Private windows may refuse storage; the server copy still holds.
  }
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export function useStudioEditing(data: StudioPage, onSaved: () => void) {
  const pageId = data.page.id;
  const kind = data.page.kind;
  const [live, setLive] = useState(data.live);
  const [rows, setRows] = useState<Record<string, GreekRow>>(data.greek);

  const initial = useMemo<Snapshot>(() => {
    const server: Snapshot = { sections: data.draft ?? data.live, greek: {} };
    const local = readLocal(pageId);
    const serverAt = data.draftUpdatedAt ? Date.parse(data.draftUpdatedAt) : 0;
    return local && local.at > serverAt ? { sections: local.sections, greek: local.greek } : server;
    // Read once per page load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageId]);

  const [history, setHistory] = useState<{ past: Step[]; present: Snapshot; future: Step[] }>({
    past: [],
    present: initial,
    future: [],
  });
  const { past, present, future } = history;
  const lastEdit = useRef<{ key: string; at: number } | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(
    () =>
      initial.sections.find((_, i) => !isLocked(kind, initial.sections, i))?.id ??
      initial.sections[0]?.id ??
      null,
  );
  const [status, setStatus] = useState("");
  const [moveNote, setMoveNote] = useState("");
  const [held, setHeld] = useState<{ id: string; before: DraftSection[] } | null>(null);

  // ---------------------------------------------------------------- history

  /** Apply a change. Edits that share `mergeKey` within a moment are one undo step. */
  const commit = useCallback((next: Snapshot, label: string, mergeKey?: string) => {
    const now = Date.now();
    const merge =
      !!mergeKey && lastEdit.current?.key === mergeKey && now - lastEdit.current.at < MERGE_MS;
    lastEdit.current = mergeKey ? { key: mergeKey, at: now } : null;
    setHistory((h) => ({
      past: merge ? h.past : [...h.past.slice(-99), { snapshot: h.present, label }],
      present: next,
      future: [],
    }));
  }, []);

  /** Sections changed without an undo step of their own (a held section moving). */
  const setSectionsQuietly = useCallback((sections: DraftSection[]) => {
    setHistory((h) => ({ ...h, present: { ...h.present, sections } }));
  }, []);

  const undo = useCallback(() => {
    const step = past.at(-1);
    if (!step) return;
    lastEdit.current = null;
    setHistory((h) => ({
      past: h.past.slice(0, -1),
      present: step.snapshot,
      future: [...h.future, { snapshot: h.present, label: step.label }],
    }));
    setStatus(`Undone: ${step.label}`);
  }, [past]);

  const redo = useCallback(() => {
    const step = future.at(-1);
    if (!step) return;
    lastEdit.current = null;
    setHistory((h) => ({
      past: [...h.past, { snapshot: h.present, label: step.label }],
      present: step.snapshot,
      future: h.future.slice(0, -1),
    }));
    setStatus(`Redone: ${step.label}`);
  }, [future]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey) return;
      const key = e.key.toLowerCase();
      if (key !== "z" && key !== "y") return;
      e.preventDefault();
      if (key === "y" || e.shiftKey) redo();
      else undo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  // --------------------------------------------------------------- autosave

  const saved = useRef<Snapshot>({ sections: data.draft ?? data.live, greek: {} });
  const [save, setSave] = useState<SaveState>({
    kind: "saved",
    at: data.draftUpdatedAt ? Date.parse(data.draftUpdatedAt) : null,
  });
  const [online, setOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const pending = useRef<Promise<void> | null>(null);

  const flush = useCallback(async () => {
    const target = present;
    if (same(target, saved.current)) return;
    if (!navigator.onLine) {
      writeLocal(pageId, target);
      setSave({ kind: "local" });
      return;
    }
    setSave({ kind: "saving" });
    try {
      const jobs: Promise<unknown>[] = [];
      if (!same(target.sections, saved.current.sections))
        jobs.push(saveStudioDraft({ data: { pageId, sections: target.sections } }));
      for (const [sectionId, fields] of Object.entries(target.greek)) {
        if (!same(fields, saved.current.greek[sectionId]))
          jobs.push(saveStudioGreek({ data: { sectionId, fields } }));
      }
      await Promise.all(jobs);
      saved.current = target;
      writeLocal(pageId, null);
      setSave({ kind: "saved", at: Date.now() });
      onSaved();
    } catch (error) {
      writeLocal(pageId, target);
      setSave({
        kind: "error",
        message: error instanceof Error ? error.message : "The draft didn't save.",
      });
    }
  }, [present, pageId, onSaved]);

  useEffect(() => {
    if (same(present, saved.current)) return;
    const timer = setTimeout(() => {
      pending.current = flush();
    }, SAVE_DELAY);
    return () => clearTimeout(timer);
  }, [present, flush]);

  useEffect(() => {
    const up = () => {
      setOnline(true);
      pending.current = flush();
    };
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, [flush]);

  /** Save now and wait, before publishing. */
  const saveNow = useCallback(async () => {
    await pending.current;
    await flush();
  }, [flush]);

  // ------------------------------------------------------------- derived

  const sections = present.sections;
  const liveById = useMemo(() => new Map(live.map((s) => [s.id, s])), [live]);

  const greekRow = useCallback(
    (id: string): GreekRow | undefined => {
      const row = rows[id];
      const draft = present.greek[id];
      if (!draft) return row;
      return {
        status: row?.status ?? "draft",
        fields: row?.fields ?? {},
        draftFields: draft,
        sourceFields: row?.sourceFields ?? null,
      };
    },
    [rows, present.greek],
  );

  const statusOf = useCallback(
    (section: DraftSection): GreekStatus | null => {
      if (!needsGreek(section)) return null;
      const before = liveById.get(section.id);
      return greekStatus(
        englishOf(section),
        greekRow(section.id),
        before ? englishOf(before) : englishOf(section),
      );
    },
    [liveById, greekRow],
  );

  const changes = useMemo(() => draftChanges(live, sections), [live, sections]);
  const selectedIndex = sections.findIndex((s) => s.id === selectedId);
  const selected = selectedIndex >= 0 ? sections[selectedIndex] : null;

  // ---------------------------------------------------------------- edits

  const replaceSection = useCallback(
    (id: string, next: DraftSection, label: string, mergeKey?: string) => {
      commit(
        { ...present, sections: present.sections.map((s) => (s.id === id ? next : s)) },
        label,
        mergeKey,
      );
    },
    [commit, present],
  );

  const setGreek = useCallback(
    (id: string, key: string, value: string) => {
      const row = rows[id];
      const base = present.greek[id] ?? { ...row?.fields, ...row?.draftFields };
      commit(
        { ...present, greek: { ...present.greek, [id]: { ...base, [key]: value } } },
        "Greek change",
        `el:${id}:${key}`,
      );
    },
    [commit, present, rows],
  );

  const move = useCallback(
    (id: string, by: number) => {
      const from = present.sections.findIndex((s) => s.id === id);
      const to = moveTarget(kind, present.sections, from, from + by);
      if (to === null) return false;
      const name = sectionName(present.sections[from]);
      commit({ ...present, sections: moveSection(present.sections, from, to) }, `move ${name}`);
      setStatus(`${name} moved to position ${to + 1} of ${present.sections.length}`);
      return true;
    },
    [commit, present, kind],
  );

  const toggleHidden = useCallback(
    (id: string) => {
      const index = present.sections.findIndex((s) => s.id === id);
      const section = present.sections[index];
      if (!section || isLocked(kind, present.sections, index)) return;
      const hidden = !section.settings.hidden;
      const name = sectionName(section);
      commit(
        {
          ...present,
          sections: present.sections.map((s) =>
            s.id === id ? { ...s, settings: { ...s.settings, hidden } } : s,
          ),
        },
        `${hidden ? "hide" : "show"} ${name}`,
      );
      setStatus(`${name} ${hidden ? "hidden" : "shown"} in English and Greek`);
    },
    [commit, present, kind],
  );

  const duplicate = useCallback(
    (id: string) => {
      const index = present.sections.findIndex((s) => s.id === id);
      const section = present.sections[index];
      if (!section || isLocked(kind, present.sections, index)) return;
      const copy = structuredClone(section);
      copy.id = crypto.randomUUID();
      // Repeated items need ids of their own, so their Greek never mixes.
      for (const value of Object.values(copy.props)) {
        if (Array.isArray(value))
          for (const item of value)
            if (item && typeof item === "object" && "id" in item)
              (item as { id: string }).id = crypto.randomUUID();
      }
      copy.settings = { ...copy.settings, anchor: "" };
      const next = present.sections.slice();
      next.splice(index + 1, 0, copy);
      commit({ ...present, sections: next }, `duplicate ${sectionName(section)}`);
      setSelectedId(copy.id);
      setStatus(`${sectionName(section)} duplicated below`);
    },
    [commit, present, kind],
  );

  const remove = useCallback(
    (id: string) => {
      const index = present.sections.findIndex((s) => s.id === id);
      const section = present.sections[index];
      if (!section || isLocked(kind, present.sections, index)) return;
      const next = present.sections.filter((s) => s.id !== id);
      commit({ ...present, sections: next }, `delete ${sectionName(section)}`);
      setSelectedId(next[Math.min(index, next.length - 1)]?.id ?? null);
      setStatus(`${sectionName(section)} deleted. Undo restores it.`);
    },
    [commit, present, kind],
  );

  const insert = useCallback(
    (section: DraftSection, afterId: string | null) => {
      const next = present.sections.slice();
      const index = afterId ? next.findIndex((s) => s.id === afterId) + 1 : next.length;
      // Never between the home page's pinned rows.
      let at = Math.max(index, 0);
      while (at < next.length && isLocked(kind, next, at)) at++;
      next.splice(at, 0, section);
      commit({ ...present, sections: next }, `add ${sectionName(section)}`);
      setSelectedId(section.id);
      setStatus(`${sectionName(section)} added at position ${at + 1}`);
    },
    [commit, present, kind],
  );

  const revert = useCallback(
    (id: string) => {
      const before = liveById.get(id);
      const section = present.sections.find((s) => s.id === id);
      if (!before || !section) return;
      replaceSection(id, before, `revert ${sectionName(section)}`);
      setStatus(`${sectionName(section)} is back to what is live`);
    },
    [liveById, present.sections, replaceSection],
  );

  // --------------------------------------------------- keyboard reordering

  /** One undo step for a whole pick-up-move-drop, back to where it was picked up. */
  const drop = useCallback(
    (index: number) => {
      if (!held) return;
      const before = held.before;
      setHeld(null);
      setMoveNote(`Dropped at position ${index + 1}`);
      if (
        !same(
          before.map((s) => s.id),
          present.sections.map((s) => s.id),
        )
      ) {
        const name = sectionName(present.sections[index]);
        setHistory((h) => ({
          past: [
            ...h.past,
            { snapshot: { ...h.present, sections: before }, label: `move ${name}` },
          ],
          present: h.present,
          future: [],
        }));
      }
    },
    [held, present.sections],
  );

  /** Space picks up and drops, the arrows move, Escape puts it back. */
  const gripKey = useCallback(
    (id: string, e: React.KeyboardEvent) => {
      const index = present.sections.findIndex((s) => s.id === id);
      const total = present.sections.length;
      const name = sectionName(present.sections[index]);
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (held?.id === id) drop(index);
        else {
          setHeld({ id, before: present.sections });
          setMoveNote(`${name} picked up, position ${index + 1} of ${total}`);
        }
      } else if (held?.id === id && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
        e.preventDefault();
        const by = e.key === "ArrowUp" ? -1 : 1;
        const to = moveTarget(kind, present.sections, index, index + by);
        if (to !== null) {
          setSectionsQuietly(moveSection(present.sections, index, to));
          setMoveNote(`Moved to position ${to + 1} of ${total}`);
        } else setMoveNote(`Can't move further. Position ${index + 1} of ${total}`);
      } else if (held?.id === id && e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        setSectionsQuietly(held.before);
        setHeld(null);
        setMoveNote("Move cancelled");
      }
    },
    [present.sections, held, kind, drop, setSectionsQuietly],
  );

  /** Leaving the grip while holding drops the section where it is. */
  const gripBlur = useCallback(() => {
    if (!held) return;
    drop(present.sections.findIndex((s) => s.id === held.id));
  }, [held, drop, present.sections]);

  // ---------------------------------------------------------------- Greek

  const keepGreek = useCallback(
    async (id: string) => {
      const section = present.sections.find((s) => s.id === id);
      if (!section) return;
      const english = englishOf(section);
      await keepStudioGreek({ data: { sectionId: id, english } });
      setRows((r) => (r[id] ? { ...r, [id]: { ...r[id], sourceFields: english } } : r));
      setStatus(`The Greek of ${sectionName(section)} is kept as it is`);
    },
    [present.sections],
  );

  /** After a publish: what was the draft is now live. */
  const published = useCallback(() => {
    setLive(present.sections);
    setRows((r) => {
      const next = { ...r };
      for (const s of present.sections) {
        const row = next[s.id];
        if (row && row.status === "approved" && !row.sourceFields) {
          const before = liveById.get(s.id);
          next[s.id] = { ...row, sourceFields: before ? englishOf(before) : englishOf(s) };
        }
      }
      return next;
    });
  }, [present.sections, liveById]);

  return {
    sections,
    live,
    rows,
    greekDrafts: present.greek,
    selected,
    selectedIndex,
    select: setSelectedId,
    changes,
    statusOf,
    greekRow,
    replaceSection,
    setGreek,
    move,
    toggleHidden,
    duplicate,
    remove,
    insert,
    revert,
    keepGreek,
    published,
    gripKey,
    gripBlur,
    heldId: held?.id ?? null,
    undo,
    redo,
    undoLabel: past.at(-1)?.label ?? null,
    canRedo: future.length > 0,
    save,
    saveNow,
    online,
    status,
    setStatus,
    moveNote,
    isLocked: (index: number) => isLocked(kind, sections, index),
  };
}

export type StudioEditing = ReturnType<typeof useStudioEditing>;

/** "Saved just now", "Saved 3 min ago", "Saving…", "Saved on this device". */
export function saveText(save: SaveState, now: number): string {
  switch (save.kind) {
    case "saving":
      return "Saving…";
    case "local":
      return "Saved on this device";
    case "error":
      return "Not saved yet. Retrying when you next edit";
    case "saved": {
      if (!save.at) return "Up to date";
      const minutes = Math.floor((now - save.at) / 60_000);
      if (minutes < 1) return "Saved just now";
      if (minutes < 60) return `Saved ${minutes} min ago`;
      const hours = Math.floor(minutes / 60);
      return hours < 24 ? `Saved ${hours} h ago` : "Saved earlier";
    }
  }
}
