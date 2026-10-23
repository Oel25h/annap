import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/site/Icon";
import { GreekPanel } from "@/components/studio/GreekPanel";
import {
  AreaField,
  BackLink,
  ConfirmDialog,
  Empty,
  FormAlert,
  Loading,
  PageHead,
  Segmented,
  TextField,
} from "@/components/studio/kit";
import { Thumb } from "@/components/studio/MediaPicker";
import { supabase } from "@/integrations/supabase/client";
import {
  ACCEPT,
  kindOf,
  objectPaths,
  publicUrl,
  signedUrl,
  uploadToLibrary,
  variantUrl,
  type Access,
  type MediaRow,
} from "@/lib/media-upload";
import { errorText, mediaMeta, mediaName, savedWords } from "@/components/studio/format";
import { useNow, useAnnounce } from "@/components/studio/hooks";

/**
 * The media library: upload images, audio and eBooks to the right bucket,
 * edit alt text and captions (English here, Greek drafts beside them), set
 * the focal point, see where each item is used, and delete only what nothing
 * uses (the database refuses the rest).
 */
export const Route = createFileRoute("/_authenticated/admin/media")({
  head: () => ({ meta: [{ title: "Media — Studio" }] }),
  validateSearch: (s: Record<string, unknown>): { item?: string } => ({
    item: typeof s.item === "string" ? s.item : undefined,
  }),
  component: MediaLibrary,
});

type Usage = { media_id: string; kind: string; item_id: string; label: string; field: string };

const FILTERS = [
  { value: "all", label: "All" },
  { value: "image", label: "Images" },
  { value: "audio", label: "Audio" },
  { value: "document", label: "eBooks" },
  { value: "video", label: "Video" },
];

/** Where a use is edited in the studio. */
function usageHref(u: Usage): string | null {
  switch (u.kind) {
    case "page":
      return `/admin/pages/${u.item_id}`;
    case "book":
      return `/admin/books?item=${u.item_id}`;
    case "audiobook":
      return `/admin/audiobooks?item=${u.item_id}`;
    case "blog_post":
      return `/admin/blog?item=${u.item_id}`;
    case "product":
      return `/admin/products?item=${u.item_id}`;
    case "masterclass":
      return `/admin/masterclass?item=${u.item_id}`;
    case "event":
      return `/admin/events?item=${u.item_id}`;
    case "foundation_story":
      return `/admin/foundation?item=${u.item_id}`;
    case "press":
      return `/admin/press?item=${u.item_id}`;
    case "testimonial":
      return `/admin/testimonials?item=${u.item_id}`;
    case "gallery":
      return `/admin/gallery`;
    case "settings":
      return `/admin/settings`;
    default:
      return null;
  }
}

function MediaLibrary() {
  const { item } = Route.useSearch();
  const nav = useNavigate({ from: "/admin/media" });
  const [rows, setRows] = useState<MediaRow[] | null>(null);
  const [usage, setUsage] = useState<Usage[]>([]);
  const [greek, setGreek] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [announce, say] = useAnnounce();

  const load = useCallback(async () => {
    const { data, error: loadError } = await supabase
      .from("media_assets")
      .select("*")
      .eq("status", "ready")
      .order("created_at", { ascending: false });
    if (loadError) return setError(errorText(loadError));
    const list = (data ?? []) as MediaRow[];
    const [uses, translations] = await Promise.all([
      list.length
        ? supabase.rpc("media_usage", { _ids: list.map((r) => r.id) })
        : Promise.resolve({ data: [] as Usage[] }),
      supabase
        .from("content_translations")
        .select("entity_id, status, fields, draft_fields")
        .eq("entity_type", "media_asset")
        .eq("locale", "el"),
    ]);
    setRows(list);
    setUsage((uses.data ?? []) as Usage[]);
    setGreek(
      Object.fromEntries(
        (translations.data ?? []).map((t) => {
          const live = Object.keys((t.fields as object) ?? {}).length > 0;
          const drafted = Object.keys((t.draft_fields as object) ?? {}).length > 0;
          return [
            t.entity_id,
            t.status === "approved" && live ? "approved" : drafted || live ? "draft" : "missing",
          ];
        }),
      ),
    );
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const byId = useMemo(() => new Map((rows ?? []).map((r) => [r.id, r])), [rows]);
  const current = item ? byId.get(item) : undefined;

  if (error)
    return (
      <>
        <PageHead title="Media" />
        <FormAlert>{error} Reload the page to try again.</FormAlert>
      </>
    );
  if (!rows) return <Loading>Loading the library…</Loading>;

  if (item) {
    if (!current)
      return (
        <>
          <BackLink onClick={() => nav({ search: {} })}>All media</BackLink>
          <Empty>This file is no longer in the library.</Empty>
        </>
      );
    return (
      <MediaDetail
        key={current.id}
        row={current}
        uses={usage.filter((u) => u.media_id === current.id)}
        onBack={() => nav({ search: {} })}
        onSaved={(next) =>
          setRows((list) => list?.map((r) => (r.id === next.id ? next : r)) ?? null)
        }
        onDeleted={() => {
          setRows((list) => list?.filter((r) => r.id !== current.id) ?? null);
          say(`${mediaName(current)} deleted.`);
          nav({ search: {} });
        }}
      />
    );
  }

  return (
    <>
      {announce}
      <LibraryList
        rows={rows}
        usage={usage}
        greek={greek}
        onUploaded={(added) => {
          setRows((list) => [...added, ...(list ?? [])]);
          say(`${added.length} ${added.length === 1 ? "file" : "files"} uploaded.`);
        }}
      />
    </>
  );
}

function LibraryList({
  rows,
  usage,
  greek,
  onUploaded,
}: {
  rows: MediaRow[];
  usage: Usage[];
  greek: Record<string, string>;
  onUploaded: (rows: MediaRow[]) => void;
}) {
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const searchId = useId();
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const u of usage) m.set(u.media_id, (m.get(u.media_id) ?? 0) + 1);
    return m;
  }, [usage]);
  const shown = rows.filter(
    (r) =>
      (filter === "all" || r.kind === filter) &&
      `${r.alt} ${r.caption} ${r.original_name}`.toLowerCase().includes(q.trim().toLowerCase()),
  );

  return (
    <>
      <PageHead
        title="Media"
        lead="Photos, audio and eBooks for the whole site. Paid chapters and eBooks are kept private: only a buyer's link can open them."
      />
      <Uploader onUploaded={onUploaded} />
      <div className="mgr-tools">
        <Segmented legend="Show" value={filter} onChange={setFilter} options={FILTERS} />
        <div className="field mgr-search">
          <label htmlFor={searchId}>Search</label>
          <input id={searchId} type="search" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>
      {shown.length === 0 ? (
        <Empty>
          {rows.length
            ? "Nothing matches. Try another word or show all files."
            : "The library is empty. Upload the first photo above."}
        </Empty>
      ) : (
        <ul className="mgrid" aria-label="Files">
          {shown.map((r) => {
            const used = counts.get(r.id) ?? 0;
            const g = r.kind === "image" && r.alt.trim() ? (greek[r.id] ?? "missing") : null;
            return (
              <li key={r.id}>
                <Link className="mcard" to="/admin/media" search={{ item: r.id }}>
                  <Thumb row={r} size={480} />
                  <span className="mcard-name">{mediaName(r)}</span>
                  <span className="meta">{mediaMeta(r)}</span>
                  <span className="mcard-tags">
                    {r.bucket === "downloads" && (
                      <span className="badge badge--quiet">
                        <Icon name="lock" />
                        Private
                      </span>
                    )}
                    {r.kind === "image" && !r.alt.trim() && (
                      <span className="badge badge--missing">
                        <Icon name="alert" />
                        No alt text
                      </span>
                    )}
                    {g && g !== "approved" && (
                      <span className={`badge badge--${g}`}>
                        <Icon name={g === "draft" ? "pencil" : "missing"} />
                        <span className="sr-only">Greek: </span>
                        {g === "draft" ? "Draft" : "Missing"}
                      </span>
                    )}
                    <span className="meta">{used ? `Used ${used}×` : "Not used"}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

/** Upload by button or by dropping files; audio asks who may listen. */
function Uploader({ onUploaded }: { onUploaded: (rows: MediaRow[]) => void }) {
  const [access, setAccess] = useState<Access>("public");
  const [busy, setBusy] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [over, setOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function upload(files: FileList | File[] | null) {
    const list = Array.from(files ?? []);
    if (!list.length) return;
    setErrors([]);
    const done: MediaRow[] = [];
    const failed: string[] = [];
    for (const [i, file] of list.entries()) {
      setBusy(`Uploading ${i + 1} of ${list.length}…`);
      try {
        done.push(await uploadToLibrary(file, kindOf(file) === "audio" ? access : "public"));
      } catch (e) {
        failed.push(errorText(e, `${file.name} didn't upload.`));
      }
    }
    setBusy(null);
    setErrors(failed);
    if (done.length) onUploaded(done);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <section
      className={over ? "mup is-over" : "mup"}
      aria-labelledby="mup-title"
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        void upload(e.dataTransfer.files);
      }}
    >
      <h2 className="title" id="mup-title">
        Upload
      </h2>
      <p className="meta">
        Drop files here or choose them. Photos get sizes from 160 to 2400 pixels wide. eBooks and
        PDFs always go to private downloads.
      </p>
      <Segmented
        legend="Audio you upload is"
        value={access}
        onChange={(v) => setAccess(v as Access)}
        options={[
          { value: "public", label: "Free to stream" },
          { value: "private", label: "Paid (private)" },
        ]}
      />
      <div className="mup-actions">
        <button
          className="btn btn-primary"
          type="button"
          disabled={!!busy}
          aria-busy={!!busy || undefined}
          onClick={() => fileRef.current?.click()}
        >
          <Icon name="plus" />
          Choose files
        </button>
        <span className="meta" role="status">
          {busy ?? ""}
        </span>
      </div>
      <input
        ref={fileRef}
        className="sr-only"
        type="file"
        multiple
        tabIndex={-1}
        aria-hidden="true"
        accept={ACCEPT.any}
        data-testid="media-upload"
        onChange={(e) => upload(e.target.files)}
      />
      {errors.map((e) => (
        <FormAlert key={e}>{e}</FormAlert>
      ))}
    </section>
  );
}

function MediaDetail({
  row,
  uses,
  onBack,
  onSaved,
  onDeleted,
}: {
  row: MediaRow;
  uses: Usage[];
  onBack: () => void;
  onSaved: (row: MediaRow) => void;
  onDeleted: () => void;
}) {
  const [alt, setAlt] = useState(row.alt);
  const [caption, setCaption] = useState(row.caption);
  const [credit, setCredit] = useState(row.credit);
  const [focal, setFocal] = useState({ x: Number(row.focal_x), y: Number(row.focal_y) });
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [version, setVersion] = useState(0);
  const [preview, setPreview] = useState<string | null>(null);
  const now = useNow();
  const isImage = row.kind === "image";
  const dirty =
    alt !== row.alt ||
    caption !== row.caption ||
    credit !== row.credit ||
    focal.x !== Number(row.focal_x) ||
    focal.y !== Number(row.focal_y);

  useEffect(() => {
    if (row.bucket === "downloads") signedUrl(row.bucket, row.path).then(setPreview);
    else setPreview(publicUrl(row.bucket, row.path));
  }, [row]);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const { data, error: saveError } = await supabase
        .from("media_assets")
        .update({
          alt: alt.trim(),
          caption: caption.trim(),
          credit: credit.trim(),
          focal_x: Math.round(focal.x * 1000) / 1000,
          focal_y: Math.round(focal.y * 1000) / 1000,
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id)
        .select("*")
        .single();
      if (saveError || !data) throw saveError ?? new Error("The changes didn't save.");
      onSaved(data as MediaRow);
      setSavedAt(Date.now());
      setVersion((v) => v + 1);
    } catch (e) {
      setError(errorText(e, "The changes didn't save. Try again."));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    const { error: rowError } = await supabase.from("media_assets").delete().eq("id", row.id);
    if (rowError) throw new Error(errorText(rowError));
    await supabase.storage.from(row.bucket).remove(objectPaths(row));
    await supabase
      .from("content_translations")
      .delete()
      .eq("entity_type", "media_asset")
      .eq("entity_id", row.id);
    onDeleted();
  }

  return (
    <>
      <PageHead
        back={<BackLink onClick={onBack}>All media</BackLink>}
        title={mediaName(row)}
        lead={
          <>
            {mediaMeta(row)} · {row.bucket === "downloads" ? "Private download" : "Public"} ·{" "}
            {row.mime}
          </>
        }
      />
      <div className="mdetail">
        <div className="mdetail-preview">
          {isImage ? (
            <FocalPicker row={row} focal={focal} onChange={setFocal} />
          ) : row.kind === "audio" ? (
            preview && <audio controls preload="metadata" src={preview} />
          ) : row.kind === "video" ? (
            preview && <video controls preload="metadata" src={preview} />
          ) : (
            preview && (
              <a className="btn btn-quiet" href={preview} target="_blank" rel="noopener">
                Open the file
                <span className="sr-only"> (opens a new tab)</span>
              </a>
            )
          )}
        </div>
        <div className="mdetail-form">
          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
          >
            <h2 className="title">English</h2>
            {isImage && (
              <TextField
                label="Alt text"
                hint="What the photo shows, for people who can't see it. Leave out “photo of”."
                value={alt}
                maxLength={300}
                aside={<span className="meta">{alt.length} of 300</span>}
                onChange={setAlt}
              />
            )}
            {row.kind !== "image" && (
              <TextField
                label="Title"
                hint="How this file is named in the studio and in readers' downloads."
                value={alt}
                maxLength={200}
                onChange={setAlt}
              />
            )}
            <AreaField label="Caption" rows={2} value={caption} onChange={setCaption} />
            <TextField label="Credit" value={credit} onChange={setCredit} />
            {error && <FormAlert>{error}</FormAlert>}
            <div className="mgr-save">
              <span className="meta" role="status">
                {saving ? "Saving…" : dirty ? "Unsaved changes" : savedWords(savedAt, now)}
              </span>
              <button
                className="btn btn-primary"
                type="submit"
                disabled={!dirty || saving}
                aria-busy={saving || undefined}
              >
                Save
              </button>
            </div>
          </form>

          {isImage && (
            <GreekPanel
              entityType="media_asset"
              entityId={row.id}
              title={mediaName(row)}
              version={version}
            />
          )}

          <section className="muses" aria-labelledby="muses-title">
            <h2 className="title" id="muses-title">
              Where it's used
            </h2>
            {uses.length === 0 ? (
              <p className="meta">Nothing uses this file.</p>
            ) : (
              <ul>
                {uses.map((u, i) => {
                  const href = usageHref(u);
                  return (
                    <li key={`${u.kind}-${u.item_id}-${u.field}-${i}`}>
                      {href ? <a href={href}>{u.label}</a> : <span>{u.label}</span>}
                      <span className="meta">{u.field}</span>
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="mdetail-delete">
              <button
                className="btn btn-quiet btn-danger"
                type="button"
                aria-haspopup="dialog"
                disabled={uses.length > 0}
                aria-describedby={uses.length ? "muses-why" : undefined}
                onClick={() => setDeleting(true)}
              >
                <Icon name="trash" />
                Delete file
              </button>
              {uses.length > 0 && (
                <p className="field-hint" id="muses-why">
                  Remove it from the places above first; a file in use can't be deleted.
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
      <ConfirmDialog
        open={deleting}
        title={`Delete ${mediaName(row)}?`}
        body="The file and all its sizes are removed from the site for good. This can't be undone."
        confirm="Delete file"
        onConfirm={remove}
        onClose={() => setDeleting(false)}
      />
    </>
  );
}

/**
 * Click or tap the photo to set where crops centre; the arrow keys move the
 * point by 5% (Shift: 1%). The two numbers below say where it is.
 */
function FocalPicker({
  row,
  focal,
  onChange,
}: {
  row: MediaRow;
  focal: { x: number; y: number };
  onChange: (f: { x: number; y: number }) => void;
}) {
  const clamp = (n: number) => Math.min(1, Math.max(0, Math.round(n * 1000) / 1000));
  const pct = (n: number) => Math.round(n * 100);
  return (
    <div className="focal">
      <div
        className="focal-frame"
        role="slider"
        tabIndex={0}
        aria-label="Focal point"
        aria-valuetext={`${pct(focal.x)}% across, ${pct(focal.y)}% down`}
        aria-valuenow={pct(focal.x)}
        aria-describedby="focal-help"
        onClick={(e) => {
          const box = e.currentTarget.getBoundingClientRect();
          onChange({
            x: clamp((e.clientX - box.left) / box.width),
            y: clamp((e.clientY - box.top) / box.height),
          });
        }}
        onKeyDown={(e) => {
          const step = e.shiftKey ? 0.01 : 0.05;
          const move: Record<string, [number, number]> = {
            ArrowLeft: [-step, 0],
            ArrowRight: [step, 0],
            ArrowUp: [0, -step],
            ArrowDown: [0, step],
          };
          const d = move[e.key];
          if (!d) return;
          e.preventDefault();
          onChange({ x: clamp(focal.x + d[0]), y: clamp(focal.y + d[1]) });
        }}
      >
        <img
          src={variantUrl(row, 960)}
          alt=""
          width={row.width ?? undefined}
          height={row.height ?? undefined}
          style={{ backgroundColor: row.dominant_color ?? undefined }}
        />
        <span
          className="focal-dot"
          aria-hidden="true"
          style={{ left: `${focal.x * 100}%`, top: `${focal.y * 100}%` }}
        />
      </div>
      <p className="meta" id="focal-help">
        Focal point: {pct(focal.x)}% across, {pct(focal.y)}% down. Click the photo, or use the arrow
        keys, to set where crops centre.
      </p>
      <div className="focal-crops" aria-hidden="true">
        {["1 / 1", "4 / 5", "16 / 9"].map((ratio) => (
          <img
            key={ratio}
            src={variantUrl(row, 480)}
            alt=""
            style={{
              aspectRatio: ratio,
              objectPosition: `${focal.x * 100}% ${focal.y * 100}%`,
              backgroundColor: row.dominant_color ?? undefined,
            }}
          />
        ))}
      </div>
    </div>
  );
}
