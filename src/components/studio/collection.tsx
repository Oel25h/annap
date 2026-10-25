/**
 * One way to manage every kind of content in the studio: a list of items
 * (searchable, filterable, in their order), and an editor for one item with
 * its fields in groups, its children (a book's formats, an audiobook's
 * chapters), its Greek beside it, and an explicit Save. Each manager is a
 * config (src/components/studio/collections.ts); this file draws them all
 * the same way, on the studio's tokens.
 *
 * Reads and writes go through the signed-in admin's own Supabase session,
 * so row-level security (the admin role, on a live session) applies to each one.
 */
import { Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useId, useMemo, useState, type ReactNode } from "react";
import { Icon } from "@/components/site/Icon";
import { supabase } from "@/integrations/supabase/client";
import { loadMedia, type Access, type MediaKind, type MediaRow } from "@/lib/media-upload";
import { errorText, savedWords, slugify } from "./format";
import { GreekPanel } from "./GreekPanel";
import { useAnnounce, useNow } from "./hooks";
import {
  AreaField,
  BackLink,
  ConfirmDialog,
  Empty,
  FormAlert,
  Loading,
  PageHead,
  Segmented,
  SelectField,
  Switch,
  TextField,
  type Option,
} from "./kit";
import { MediaField, Thumb } from "./MediaPicker";
import { RichText } from "./RichText";

export type Row = Record<string, unknown> & { id: string };
export type Lookups = Record<string, Option[]>;

type Base = { key: string; label: string; hint?: string };
export type FieldDef =
  | (Base & { kind: "text"; type?: "text" | "url" | "email"; max?: number; required?: boolean })
  | (Base & { kind: "area"; rows?: number })
  | (Base & { kind: "rich" })
  | (Base & { kind: "slug"; from: string })
  | (Base & { kind: "select"; options: Option[] | string; nullable?: string })
  | (Base & { kind: "switch" })
  | (Base & { kind: "number"; min?: number })
  | (Base & { kind: "money" })
  | (Base & { kind: "datetime" })
  | (Base & { kind: "date" })
  | (Base & {
      kind: "media";
      media: MediaKind;
      access?: Access | ((row: Row) => Access);
      /** Copy facts from the chosen file onto the row (a chapter's duration). */
      fill?: (media: MediaRow) => Partial<Row>;
    })
  | {
      kind: "custom";
      key: string;
      render: (p: { row: Row; set: (patch: Partial<Row>) => void; lookups: Lookups }) => ReactNode;
    };

export type Group = { title: string; fields: FieldDef[]; when?: (row: Row) => boolean };

export type Lookup = { table: string; label: string; value?: string; order?: string };

/** A list of rows that belong to the item (or stand alone), edited in place. */
export type ChildConfig = {
  table: string;
  /** The column pointing at the parent; omit for a list that stands alone. */
  fk?: string;
  title: string;
  noun: string;
  hint?: string;
  position?: string;
  name: (row: Row, lookups: Lookups) => string;
  meta?: (row: Row, lookups: Lookups) => string;
  fields: FieldDef[];
  create: (parent: Row | null, rows: Row[]) => Record<string, unknown>;
  /** Runs before a save; may change the patch or refuse it by throwing. */
  beforeSave?: (row: Row, patch: Partial<Row>) => Promise<Partial<Row>>;
  /** Rows that can't exist without a file: Add asks for the file first. */
  addWith?: { key: string; label: string; kind: MediaKind; access: Access };
  validate?: (row: Row) => string | null;
};

export type CollectionConfig = {
  table: string;
  route: string;
  title: string;
  lead: string;
  noun: string;
  name: (row: Row) => string;
  meta?: (row: Row, lookups: Lookups) => string[];
  thumb?: string;
  status?: (row: Row) => { label: string; live: boolean };
  order: { column: string; ascending?: boolean }[];
  position?: string;
  search?: string[];
  filter?: { legend: string; options: Option[]; test: (row: Row, value: string) => boolean };
  groups: Group[];
  create: (rows: Row[]) => Record<string, unknown>;
  validate?: (row: Row) => string | null;
  greek?: string;
  publicHref?: (row: Row) => string | null;
  lookups?: Record<string, Lookup>;
  children?: ChildConfig[];
  /** Small lists managed beside the collection, such as categories. */
  extras?: ChildConfig[];
  /** Extra actions in the editor's save bar. */
  actions?: (p: { row: Row; reload: () => Promise<void> }) => ReactNode;
};

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

type Query = ReturnType<typeof supabase.from>;
const table = (name: string) => supabase.from(name as "books") as unknown as Query;

async function loadLookups(defs: Record<string, Lookup> | undefined): Promise<Lookups> {
  if (!defs) return {};
  const entries = await Promise.all(
    Object.entries(defs).map(async ([name, def]) => {
      const value = def.value ?? "id";
      const { data } = await table(def.table)
        .select(`${value}, ${def.label}`)
        .order(def.order ?? def.label);
      const rows = (data ?? []) as unknown as Record<string, unknown>[];
      return [
        name,
        rows.map((r) => ({ value: String(r[value]), label: String(r[def.label] ?? "") })),
      ] as const;
    }),
  );
  return Object.fromEntries(entries);
}

const nowIso = () => new Date().toISOString();

function hasColumn(row: Row | undefined, key: string) {
  return !!row && key in row;
}

// ---------------------------------------------------------------------------
// The manager
// ---------------------------------------------------------------------------

export function Collection({ config, item }: { config: CollectionConfig; item?: string }) {
  const nav = useNavigate();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [lookups, setLookups] = useState<Lookups>({});
  const [error, setError] = useState<string | null>(null);
  const [announce, say] = useAnnounce();

  const load = useCallback(async () => {
    let query = table(config.table).select("*");
    for (const o of config.order) query = query.order(o.column, { ascending: o.ascending ?? true });
    const [{ data, error: e }, found] = await Promise.all([query, loadLookups(config.lookups)]);
    if (e) return setError(errorText(e));
    setRows((data ?? []) as unknown as Row[]);
    setLookups(found);
  }, [config]);

  useEffect(() => {
    void load();
  }, [load]);

  const go = (id?: string) => nav({ to: config.route, search: id ? { item: id } : {} } as never);

  async function add() {
    setError(null);
    const { data, error: e } = await table(config.table)
      .insert(config.create(rows ?? []) as never)
      .select("*")
      .single();
    if (e || !data) return setError(errorText(e, `The new ${config.noun} wasn't added.`));
    const row = data as unknown as Row;
    setRows((list) => [...(list ?? []), row]);
    say(`New ${config.noun} added.`);
    go(row.id);
  }

  if (error && !rows)
    return (
      <>
        <PageHead title={config.title} />
        <FormAlert>{error} Reload the page to try again.</FormAlert>
      </>
    );
  if (!rows) return <Loading>Loading {config.title.toLowerCase()}…</Loading>;

  if (item) {
    const row = rows.find((r) => r.id === item);
    return row ? (
      <Editor
        key={row.id}
        config={config}
        row={row}
        lookups={lookups}
        onBack={() => go()}
        onSaved={(next) =>
          setRows((list) => list?.map((r) => (r.id === next.id ? next : r)) ?? null)
        }
        onDeleted={() => {
          setRows((list) => list?.filter((r) => r.id !== row.id) ?? null);
          say(`${config.name(row)} deleted.`);
          go();
        }}
        reload={load}
      />
    ) : (
      <>
        <BackLink onClick={() => go()}>All {config.title.toLowerCase()}</BackLink>
        <Empty>This {config.noun} no longer exists.</Empty>
      </>
    );
  }

  return (
    <>
      {announce}
      <ListView
        config={config}
        rows={rows}
        lookups={lookups}
        onAdd={add}
        error={error}
        onReorder={async (next) => {
          setRows(next);
          const column = config.position!;
          await Promise.all(
            next.map((r, i) =>
              table(config.table)
                .update({ [column]: (i + 1) * 10 } as never)
                .eq("id", r.id),
            ),
          );
        }}
        say={say}
      />
      {config.extras?.map((extra) => (
        <section className="mgr-extra" key={extra.table} aria-label={extra.title}>
          <Children config={extra} parent={null} lookups={lookups} />
        </section>
      ))}
    </>
  );
}

function ListView({
  config,
  rows,
  lookups,
  onAdd,
  onReorder,
  error,
  say,
}: {
  config: CollectionConfig;
  rows: Row[];
  lookups: Lookups;
  onAdd: () => void;
  onReorder: (rows: Row[]) => Promise<void>;
  error: string | null;
  say: (m: string) => void;
}) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState(config.filter?.options[0]?.value ?? "");
  const searchId = useId();
  const [media, setMedia] = useState<Record<string, MediaRow>>({});
  useEffect(() => {
    if (!config.thumb) return;
    void loadMedia(rows.map((r) => String(r[config.thumb!] ?? "")).filter(Boolean)).then(setMedia);
  }, [rows, config.thumb]);

  const needle = q.trim().toLowerCase();
  const shown = rows.filter(
    (r) =>
      (!config.filter || config.filter.test(r, filter)) &&
      (!needle ||
        (config.search ?? []).some((k) =>
          String(r[k] ?? "")
            .toLowerCase()
            .includes(needle),
        ) ||
        config.name(r).toLowerCase().includes(needle)),
  );
  const canMove = !!config.position && !needle && shown.length === rows.length;

  function move(index: number, to: number) {
    if (to < 0 || to >= rows.length) return;
    const next = rows.slice();
    const [item] = next.splice(index, 1);
    next.splice(to, 0, item);
    void onReorder(next);
    say(`${config.name(item)} moved to position ${to + 1} of ${rows.length}.`);
  }

  return (
    <>
      <PageHead
        title={config.title}
        lead={config.lead}
        actions={
          <button className="btn btn-primary" type="button" onClick={onAdd}>
            <Icon name="plus" />
            Add {config.noun}
          </button>
        }
      />
      {error && <FormAlert>{error}</FormAlert>}
      {rows.length > 0 && (
        <div className="mgr-tools">
          {config.filter && (
            <Segmented
              legend={config.filter.legend}
              value={filter}
              onChange={setFilter}
              options={config.filter.options}
            />
          )}
          <div className="field mgr-search">
            <label htmlFor={searchId}>Search</label>
            <input id={searchId} type="search" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
      )}
      {shown.length === 0 ? (
        <Empty
          action={
            rows.length === 0 && (
              <button className="btn btn-quiet" type="button" onClick={onAdd}>
                Add the first {config.noun}
              </button>
            )
          }
        >
          {rows.length
            ? "Nothing matches. Try another word."
            : `No ${config.title.toLowerCase()} yet.`}
        </Empty>
      ) : (
        <ul className="mgr-list" aria-label={config.title}>
          {shown.map((row, i) => {
            const status = config.status?.(row);
            const thumb = config.thumb ? media[String(row[config.thumb] ?? "")] : undefined;
            const name = config.name(row);
            return (
              <li key={row.id} className="mgr-li">
                <Link
                  className={config.thumb ? "mgr-row" : "mgr-row mgr-row--plain"}
                  to={config.route}
                  search={{ item: row.id } as never}
                >
                  {config.thumb &&
                    (thumb ? (
                      <Thumb row={thumb} />
                    ) : (
                      <span className="mthumb mthumb--file" aria-hidden="true">
                        <Icon name="book" />
                      </span>
                    ))}
                  <span className="mgr-row-text">
                    <span className="mgr-row-name">{name}</span>
                    {config.meta && (
                      <span className="mgr-row-meta meta">
                        {config
                          .meta(row, lookups)
                          .filter(Boolean)
                          .map((m) => (
                            <span key={m}>{m}</span>
                          ))}
                      </span>
                    )}
                  </span>
                  <span className="mgr-row-end">
                    {status &&
                      (status.live ? (
                        <span className="meta">{status.label}</span>
                      ) : (
                        <span className="badge badge--hidden">
                          <Icon name="eye-off" />
                          {status.label}
                        </span>
                      ))}
                    <Icon name="chev-right" />
                  </span>
                </Link>
                {canMove && (
                  <span className="mgr-move">
                    <button
                      className="icon-btn"
                      type="button"
                      aria-label={`Move ${name} up`}
                      disabled={i === 0}
                      onClick={() => move(i, i - 1)}
                    >
                      <Icon name="arrow-up" />
                    </button>
                    <button
                      className="icon-btn"
                      type="button"
                      aria-label={`Move ${name} down`}
                      disabled={i === rows.length - 1}
                      onClick={() => move(i, i + 1)}
                    >
                      <Icon name="arrow-down" />
                    </button>
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Fields
// ---------------------------------------------------------------------------

function centsText(value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  return (Number(value) / 100).toFixed(2);
}

/** "2026-10-23T18:30" in the browser's own time, for datetime-local. */
function localInput(value: unknown): string {
  if (!value) return "";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function FieldInput({
  def,
  row,
  set,
  lookups,
}: {
  def: FieldDef;
  row: Row;
  set: (patch: Partial<Row>) => void;
  lookups: Lookups;
}) {
  if (def.kind === "custom") return <>{def.render({ row, set, lookups })}</>;
  const value = row[def.key];
  const text = value === null || value === undefined ? "" : String(value);
  switch (def.kind) {
    case "text":
      return (
        <TextField
          label={def.label}
          hint={def.hint}
          type={def.type ?? "text"}
          maxLength={def.max}
          required={def.required}
          spellCheck={def.type === "url" ? false : undefined}
          aside={
            def.max ? (
              <span className="meta">
                {text.length} of {def.max}
              </span>
            ) : undefined
          }
          value={text}
          onChange={(v) => set({ [def.key]: def.type === "url" ? v.trim() || null : v })}
        />
      );
    case "area":
      return (
        <AreaField
          label={def.label}
          hint={def.hint}
          rows={def.rows ?? 4}
          value={text}
          onChange={(v) => set({ [def.key]: v })}
        />
      );
    case "rich":
      return (
        <RichText
          label={def.label}
          hint={def.hint}
          value={text}
          onChange={(v) => set({ [def.key]: v })}
        />
      );
    case "slug":
      return (
        <TextField
          label={def.label}
          hint={def.hint ?? "Lowercase words joined by hyphens; it becomes the page's address."}
          value={text}
          spellCheck={false}
          aside={
            <button
              className="btn-text"
              type="button"
              onClick={() => set({ [def.key]: slugify(String(row[def.from] ?? "")) })}
            >
              Make from title
            </button>
          }
          onChange={(v) => set({ [def.key]: v.toLowerCase().replace(/[^a-z0-9-]/g, "-") })}
        />
      );
    case "select": {
      const options = typeof def.options === "string" ? (lookups[def.options] ?? []) : def.options;
      const all =
        def.nullable !== undefined ? [{ value: "", label: def.nullable }, ...options] : options;
      return (
        <SelectField
          label={def.label}
          hint={def.hint}
          value={text}
          options={all}
          onChange={(v) => set({ [def.key]: v === "" && def.nullable !== undefined ? null : v })}
        />
      );
    }
    case "switch":
      return (
        <Switch
          label={def.label}
          hint={def.hint}
          checked={value === true}
          onChange={(on) => set({ [def.key]: on })}
        />
      );
    case "number":
      return (
        <TextField
          label={def.label}
          hint={def.hint}
          type="number"
          inputMode="numeric"
          min={def.min}
          value={text}
          onChange={(v) => set({ [def.key]: v === "" ? null : Math.round(Number(v)) })}
        />
      );
    case "money":
      return (
        <MoneyField
          label={def.label}
          hint={def.hint}
          cents={value as number | null}
          onChange={(c) => set({ [def.key]: c })}
        />
      );
    case "datetime":
      return (
        <TextField
          label={def.label}
          hint={def.hint ?? "In your own time zone."}
          type="datetime-local"
          value={localInput(value)}
          onChange={(v) => set({ [def.key]: v ? new Date(v).toISOString() : null })}
        />
      );
    case "date":
      return (
        <TextField
          label={def.label}
          hint={def.hint}
          type="date"
          value={text.slice(0, 10)}
          onChange={(v) => set({ [def.key]: v || null })}
        />
      );
    case "media": {
      const access = typeof def.access === "function" ? def.access(row) : (def.access ?? "public");
      return (
        <MediaField
          label={def.label}
          hint={def.hint}
          kind={def.media}
          access={access}
          value={(value as string | null) ?? null}
          onChange={(id, media) =>
            set({ [def.key]: id, ...(media && def.fill ? def.fill(media) : {}) })
          }
        />
      );
    }
  }
}

/** Euros typed as "12.50", kept as cents. */
function MoneyField({
  label,
  hint,
  cents,
  onChange,
}: {
  label: string;
  hint?: string;
  cents: number | null;
  onChange: (cents: number | null) => void;
}) {
  const [text, setText] = useState(centsText(cents));
  const [error, setError] = useState<string | null>(null);
  useEffect(() => setText((t) => (Number(t) * 100 === cents ? t : centsText(cents))), [cents]);
  return (
    <TextField
      label={label}
      hint={hint ?? "In euros, such as 12.50. Leave empty for no price."}
      inputMode="decimal"
      value={text}
      error={error}
      onChange={(v) => {
        setText(v);
        const clean = v.replace(",", ".").trim();
        if (!clean) {
          setError(null);
          return onChange(null);
        }
        if (!/^\d+(\.\d{1,2})?$/.test(clean)) return setError("Use a number such as 12.50.");
        setError(null);
        onChange(Math.round(Number(clean) * 100));
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// The editor
// ---------------------------------------------------------------------------

function Editor({
  config,
  row,
  lookups,
  onBack,
  onSaved,
  onDeleted,
  reload,
}: {
  config: CollectionConfig;
  row: Row;
  lookups: Lookups;
  onBack: () => void;
  onSaved: (row: Row) => void;
  onDeleted: () => void;
  reload: () => Promise<void>;
}) {
  const [patch, setPatch] = useState<Partial<Row>>({});
  const [busy, setBusy] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [version, setVersion] = useState(0);
  const now = useNow();
  const value = useMemo(() => ({ ...row, ...patch }) as Row, [row, patch]);
  const dirty = Object.keys(patch).length > 0;
  const name = config.name(value) || `Untitled ${config.noun}`;
  const href = config.publicHref?.(value);

  // Leaving with unsaved changes asks first.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const problem = config.validate?.(value);
      if (problem) throw new Error(problem);
      const body: Record<string, unknown> = { ...patch };
      if (hasColumn(row, "updated_at")) body.updated_at = nowIso();
      if (hasColumn(row, "published_at") && patch.status === "published" && !row.published_at)
        body.published_at = nowIso();
      const { data, error: e } = await table(config.table)
        .update(body as never)
        .eq("id", row.id)
        .select("*")
        .single();
      if (e || !data) throw e ?? new Error("The changes didn't save.");
      onSaved(data as unknown as Row);
      setPatch({});
      setSavedAt(Date.now());
      setVersion((v) => v + 1);
    } catch (e) {
      setError(errorText(e, "The changes didn't save. Try again."));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    const { error: e } = await table(config.table).delete().eq("id", row.id);
    if (e) throw new Error(errorText(e));
    onDeleted();
  }

  return (
    <>
      <PageHead
        back={<BackLink onClick={onBack}>All {config.title.toLowerCase()}</BackLink>}
        title={name}
        lead={
          href && config.status?.(row).live ? (
            <a className="link" href={href} target="_blank" rel="noopener">
              View on the site<span className="sr-only"> (opens a new tab)</span>
            </a>
          ) : undefined
        }
      />
      <form
        className="mgr-editor"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <div className="mgr-form">
          {config.groups
            .filter((g) => !g.when || g.when(value))
            .map((group) => (
              <fieldset className="mgr-group" key={group.title}>
                <legend>{group.title}</legend>
                {group.fields.map((def) => (
                  <FieldInput
                    key={def.key}
                    def={def}
                    row={value}
                    lookups={lookups}
                    set={(p) => setPatch((all) => ({ ...all, ...p }))}
                  />
                ))}
              </fieldset>
            ))}
        </div>
        {error && <FormAlert>{error}</FormAlert>}
        <div className="mgr-savebar">
          <span className="meta" role="status">
            {busy ? "Saving…" : dirty ? "Unsaved changes" : savedWords(savedAt, now)}
          </span>
          {config.actions?.({ row, reload })}
          <button
            className="btn btn-quiet btn-danger"
            type="button"
            aria-haspopup="dialog"
            onClick={() => setDeleting(true)}
          >
            <Icon name="trash" />
            Delete
          </button>
          <button
            className="btn btn-primary"
            type="submit"
            disabled={!dirty || busy}
            aria-busy={busy || undefined}
          >
            Save
          </button>
        </div>
      </form>

      {config.children?.map((child) => (
        <section className="mgr-group mgr-kids" key={child.table} aria-label={child.title}>
          <Children config={child} parent={row} lookups={lookups} />
        </section>
      ))}

      {config.greek && (
        <section className="mgr-group mgr-greek">
          <GreekPanel entityType={config.greek} entityId={row.id} title={name} version={version} />
        </section>
      )}

      <ConfirmDialog
        open={deleting}
        title={`Delete ${name}?`}
        body={`It is removed from the site straight away, with its ${
          config.children?.map((c) => c.title.toLowerCase()).join(" and ") || "details"
        }. This can't be undone.`}
        confirm={`Delete ${config.noun}`}
        onConfirm={remove}
        onClose={() => setDeleting(false)}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Children: rows edited in place
// ---------------------------------------------------------------------------

export function Children({
  config,
  parent,
  lookups,
}: {
  config: ChildConfig;
  parent: Row | null;
  lookups: Lookups;
}) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<Row | null>(null);
  const [announce, say] = useAnnounce();
  const headingId = useId();

  const load = useCallback(async () => {
    let query = table(config.table).select("*");
    if (config.fk && parent) query = query.eq(config.fk, parent.id);
    if (config.position) query = query.order(config.position);
    const { data, error: e } = await query.order("created_at");
    if (e) setError(errorText(e));
    else setRows((data ?? []) as unknown as Row[]);
  }, [config, parent]);
  useEffect(() => {
    void load();
  }, [load]);

  const [picking, setPicking] = useState(false);

  async function add(extra: Record<string, unknown> = {}) {
    setError(null);
    if (config.addWith && !(config.addWith.key in extra)) return setPicking(true);
    setPicking(false);
    const { data, error: e } = await table(config.table)
      .insert({ ...config.create(parent, rows ?? []), ...extra } as never)
      .select("*")
      .single();
    if (e || !data) return setError(errorText(e, `The new ${config.noun} wasn't added.`));
    const row = data as unknown as Row;
    setRows((list) => [...(list ?? []), row]);
    setOpen(row.id);
    say(`New ${config.noun} added.`);
  }

  async function move(index: number, to: number) {
    if (!rows || !config.position || to < 0 || to >= rows.length) return;
    const next = rows.slice();
    const [item] = next.splice(index, 1);
    next.splice(to, 0, item);
    setRows(next);
    await Promise.all(
      next.map((r, i) =>
        table(config.table)
          .update({ [config.position!]: i } as never)
          .eq("id", r.id),
      ),
    );
    say(`${config.name(item, lookups)} moved to position ${to + 1} of ${next.length}.`);
  }

  return (
    <div className="kids">
      {announce}
      <div className="kids-head">
        <h2 className="title" id={headingId}>
          {config.title}
        </h2>
        <button
          className="btn btn-quiet btn-sm"
          type="button"
          aria-expanded={config.addWith ? picking : undefined}
          onClick={() => (picking ? setPicking(false) : add())}
        >
          <Icon name={picking ? "close" : "plus"} />
          {picking ? "Cancel" : `Add ${config.noun}`}
        </button>
      </div>
      {config.hint && <p className="meta">{config.hint}</p>}
      {picking && config.addWith && (
        <div className="kids-pick">
          <MediaField
            label={config.addWith.label}
            hint={`Upload a new file or choose one from the library; the ${config.noun} is added once it's chosen.`}
            kind={config.addWith.kind}
            access={config.addWith.access}
            value={null}
            onChange={(id) => id && void add({ [config.addWith!.key]: id })}
          />
        </div>
      )}
      {error && <FormAlert>{error}</FormAlert>}
      {!rows ? (
        <Loading>Loading…</Loading>
      ) : rows.length === 0 ? (
        <p className="meta">None yet.</p>
      ) : (
        <ul className="kids-list" aria-labelledby={headingId}>
          {rows.map((row, i) => (
            <Kid
              key={row.id}
              config={config}
              row={row}
              lookups={lookups}
              open={open === row.id}
              onToggle={() => setOpen((o) => (o === row.id ? null : row.id))}
              onSaved={(next) =>
                setRows((list) => list?.map((r) => (r.id === next.id ? next : r)) ?? null)
              }
              onRemove={() => setRemoving(row)}
              move={
                config.position
                  ? {
                      up: i > 0 ? () => move(i, i - 1) : null,
                      down: i < rows.length - 1 ? () => move(i, i + 1) : null,
                    }
                  : null
              }
            />
          ))}
        </ul>
      )}
      <ConfirmDialog
        open={!!removing}
        title={`Delete ${removing ? config.name(removing, lookups) : config.noun}?`}
        body="It is removed from the site straight away. This can't be undone."
        confirm={`Delete ${config.noun}`}
        onConfirm={async () => {
          if (!removing) return;
          const { error: e } = await table(config.table).delete().eq("id", removing.id);
          if (e) throw new Error(errorText(e));
          setRows((list) => list?.filter((r) => r.id !== removing.id) ?? null);
          say(`${config.name(removing, lookups)} deleted.`);
        }}
        onClose={() => setRemoving(null)}
      />
    </div>
  );
}

function Kid({
  config,
  row,
  lookups,
  open,
  onToggle,
  onSaved,
  onRemove,
  move,
}: {
  config: ChildConfig;
  row: Row;
  lookups: Lookups;
  open: boolean;
  onToggle: () => void;
  onSaved: (row: Row) => void;
  onRemove: () => void;
  move: { up: (() => void) | null; down: (() => void) | null } | null;
}) {
  const [patch, setPatch] = useState<Partial<Row>>({});
  const [busy, setBusy] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const now = useNow();
  const value = { ...row, ...patch } as Row;
  const dirty = Object.keys(patch).length > 0;
  const name = config.name(value, lookups) || `Untitled ${config.noun}`;
  const bodyId = useId();

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const problem = config.validate?.(value);
      if (problem) throw new Error(problem);
      const ready = config.beforeSave ? await config.beforeSave(row, patch) : patch;
      const body: Record<string, unknown> = { ...ready };
      if (hasColumn(row, "updated_at")) body.updated_at = nowIso();
      const { data, error: e } = await table(config.table)
        .update(body as never)
        .eq("id", row.id)
        .select("*")
        .single();
      if (e || !data) throw e ?? new Error("The changes didn't save.");
      onSaved(data as unknown as Row);
      setPatch({});
      setSavedAt(Date.now());
    } catch (e) {
      setError(errorText(e, "The changes didn't save. Try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="kid">
      <div className="kid-row">
        <button
          className="kid-toggle"
          type="button"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={onToggle}
        >
          <Icon name={open ? "chev-down" : "chev-right"} />
          <span className="kid-name">
            <span>{name}</span>
            {config.meta && <span className="meta">{config.meta(value, lookups)}</span>}
          </span>
        </button>
        {move && (
          <>
            <button
              className="icon-btn"
              type="button"
              aria-label={`Move ${name} up`}
              disabled={!move.up}
              onClick={() => move.up?.()}
            >
              <Icon name="arrow-up" />
            </button>
            <button
              className="icon-btn"
              type="button"
              aria-label={`Move ${name} down`}
              disabled={!move.down}
              onClick={() => move.down?.()}
            >
              <Icon name="arrow-down" />
            </button>
          </>
        )}
        <button
          className="icon-btn icon-btn--danger"
          type="button"
          aria-label={`Delete ${name}`}
          aria-haspopup="dialog"
          onClick={onRemove}
        >
          <Icon name="trash" />
        </button>
      </div>
      {open && (
        <form
          className="kid-body"
          id={bodyId}
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          {config.fields.map((def) => (
            <FieldInput
              key={def.key}
              def={def}
              row={value}
              lookups={lookups}
              set={(p) => setPatch((all) => ({ ...all, ...p }))}
            />
          ))}
          {error && <FormAlert>{error}</FormAlert>}
          <div className="mgr-save">
            <span className="meta" role="status">
              {busy ? "Saving…" : dirty ? "Unsaved changes" : savedWords(savedAt, now)}
            </span>
            <button
              className="btn btn-quiet"
              type="submit"
              disabled={!dirty || busy}
              aria-busy={busy || undefined}
            >
              Save<span className="sr-only"> {name}</span>
            </button>
          </div>
        </form>
      )}
    </li>
  );
}
