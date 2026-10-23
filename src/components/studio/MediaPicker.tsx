/**
 * Choosing a file from the media library, or uploading a new one, for a
 * manager's field (a cover, a chapter's audio, an eBook). Private files (paid
 * audio, eBooks) are offered only where a private file belongs.
 */
import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "@/components/site/Icon";
import { supabase } from "@/integrations/supabase/client";

import {
  ACCEPT,
  bucketFor,
  loadMedia,
  uploadToLibrary,
  variantUrl,
  type Access,
  type MediaKind,
  type MediaRow,
} from "@/lib/media-upload";
import { FormAlert, Loading, Modal } from "./kit";
import { clock, errorText, fileSize, mediaMeta, mediaName } from "./format";

const COLUMNS =
  "id, kind, bucket, path, mime, bytes, width, height, duration_seconds, variants, dominant_color, focal_x, focal_y, alt, caption, credit, original_name, status, created_at, created_by, updated_at";

/** A square thumbnail: the 160 rung for images, an icon for the rest. */
export function Thumb({ row, size = 160 }: { row: MediaRow; size?: number }) {
  if (row.kind === "image")
    return (
      <img
        className="mthumb"
        src={variantUrl(row, size)}
        alt=""
        loading="lazy"
        style={{
          objectPosition: `${Number(row.focal_x) * 100}% ${Number(row.focal_y) * 100}%`,
          backgroundColor: row.dominant_color ?? undefined,
        }}
      />
    );
  return (
    <span className="mthumb mthumb--file" aria-hidden="true">
      <Icon name={row.kind === "audio" ? "headphones" : row.kind === "video" ? "play" : "book"} />
    </span>
  );
}

/**
 * A field holding one media id. `access` decides where an upload goes and
 * which files are offered: "private" for paid audio and eBooks.
 */
export function MediaField({
  label,
  hint,
  kind,
  access = "public",
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  kind: MediaKind;
  access?: Access;
  value: string | null;
  onChange: (id: string | null, row?: MediaRow) => void;
}) {
  const id = useId();
  const [row, setRow] = useState<MediaRow | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const bucket = bucketFor(kind, access);

  useEffect(() => {
    let live = true;
    if (!value) setRow(null);
    else loadMedia([value]).then((m) => live && setRow(m[value] ?? null));
    return () => {
      live = false;
    };
  }, [value]);

  async function upload(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const uploaded = await uploadToLibrary(file, access);
      if (uploaded.kind !== kind) throw new Error(`Choose ${KIND_WORD[kind]} here.`);
      setRow(uploaded);
      onChange(uploaded.id, uploaded);
    } catch (e) {
      setError(errorText(e, "The upload didn't finish. Try again."));
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="field mfield" role="group" aria-labelledby={`${id}-label`}>
      <p className="field-label" id={`${id}-label`}>
        {label}
      </p>
      <div className="mfield-row">
        {row ? (
          <>
            <Thumb row={row} />
            <span className="mfield-name">
              <span>{mediaName(row)}</span>
              <span className="meta">
                {mediaMeta(row)}
                {row.bucket === "downloads" ? " · Private" : ""}
              </span>
            </span>
          </>
        ) : (
          <span className="mfield-name meta">{value ? "Loading…" : "None chosen"}</span>
        )}
      </div>
      <div className="mfield-actions">
        <button className="btn btn-quiet btn-sm" type="button" onClick={() => setOpen(true)}>
          Choose from library
        </button>
        <button
          className="btn btn-quiet btn-sm"
          type="button"
          aria-busy={busy || undefined}
          disabled={busy}
          onClick={() => fileRef.current?.click()}
        >
          <Icon name="plus" />
          {busy ? "Uploading…" : "Upload"}
        </button>
        {value && (
          <button className="btn-text" type="button" onClick={() => onChange(null)}>
            Remove<span className="sr-only"> {label.toLowerCase()}</span>
          </button>
        )}
        <input
          ref={fileRef}
          className="sr-only"
          type="file"
          tabIndex={-1}
          aria-hidden="true"
          accept={ACCEPT[kind]}
          onChange={(e) => upload(e.target.files?.[0])}
        />
      </div>
      {hint && <p className="field-hint">{hint}</p>}
      {error && <FormAlert>{error}</FormAlert>}
      <LibraryDialog
        open={open}
        kind={kind}
        bucket={bucket}
        title={`Choose ${KIND_WORD[kind]}`}
        onClose={() => setOpen(false)}
        onPick={(picked) => {
          setRow(picked);
          onChange(picked.id, picked);
          setOpen(false);
        }}
      />
    </div>
  );
}

const KIND_WORD: Record<MediaKind, string> = {
  image: "an image",
  audio: "an audio file",
  video: "a video",
  document: "an eBook or PDF",
};

function LibraryDialog({
  open,
  kind,
  bucket,
  title,
  onClose,
  onPick,
}: {
  open: boolean;
  kind: MediaKind;
  bucket: string;
  title: string;
  onClose: () => void;
  onPick: (row: MediaRow) => void;
}) {
  const [rows, setRows] = useState<MediaRow[] | null>(null);
  const [q, setQ] = useState("");
  const searchId = useId();
  useEffect(() => {
    if (!open) return;
    setRows(null);
    supabase
      .from("media_assets")
      .select(COLUMNS)
      .eq("kind", kind)
      .eq("bucket", bucket)
      .eq("status", "ready")
      .order("created_at", { ascending: false })
      .limit(500)
      .then(({ data }) => setRows((data ?? []) as MediaRow[]));
  }, [open, kind, bucket]);
  const shown = (rows ?? []).filter((r) =>
    `${r.alt} ${r.original_name} ${r.caption}`.toLowerCase().includes(q.trim().toLowerCase()),
  );
  return (
    <Modal open={open} onClose={onClose} title={title} wide>
      <div className="field">
        <label htmlFor={searchId}>Search</label>
        <input id={searchId} type="search" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {!rows ? (
        <Loading>Loading the library…</Loading>
      ) : shown.length === 0 ? (
        <p className="meta mpick-empty">
          {rows.length ? "Nothing matches that search." : "Nothing here yet. Upload one instead."}
        </p>
      ) : (
        <ul className="mpick">
          {shown.map((r) => (
            <li key={r.id}>
              <button type="button" onClick={() => onPick(r)}>
                <Thumb row={r} />
                <span className="mpick-name">{mediaName(r)}</span>
                <span className="meta">{mediaMeta(r)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="confirm-actions">
        <button className="btn btn-quiet" type="button" onClick={onClose}>
          Cancel
        </button>
      </div>
    </Modal>
  );
}
