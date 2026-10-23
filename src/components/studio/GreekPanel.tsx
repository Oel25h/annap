/**
 * One item's Greek, beside its English (DESIGN.md §11): the status badge, the
 * Was / Now diff when the English changed after approval, a Greek field under
 * each piece of English, "Save draft", and "Approve", which a person presses
 * and confirms. Nothing here writes Greek on its own or approves it.
 */
import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/site/Icon";
import { approveGreek, getItemGreek, saveGreekDraft } from "@/lib/translations.functions";
import type { QueueItem } from "@/server/studio-translations.server";
import { AreaField, FormAlert, Loading, Modal } from "./kit";
import { GreekBadge } from "./parts";
import { RichText } from "./RichText";
import { errorText, savedWords } from "./format";
import { useNow } from "./hooks";

export type { QueueItem };

const STATUS_NOTE: Record<QueueItem["status"], string> = {
  missing: "No Greek yet. /el shows the English, marked as English, until Greek is approved.",
  draft: "Greek written, not approved. /el still shows the approved Greek, or the English.",
  stale: "The English changed after this Greek was approved. Check the Greek still says the same.",
  approved: "Greek reviewed and live on /el.",
};

export function GreekEditor({
  item,
  onChanged,
  headingLevel = "h2",
}: {
  item: QueueItem;
  onChanged?: (next: QueueItem) => void;
  headingLevel?: "h2" | "h3";
}) {
  const initial = useMemo(
    () => Object.fromEntries(item.fields.map((f) => [f.key, f.draft])),
    [item],
  );
  const [values, setValues] = useState<Record<string, string>>(initial);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [busy, setBusy] = useState<"save" | "approve" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [said, setSaid] = useState("");
  const now = useNow();
  // A fresh read of the same item keeps the save line; another item starts clean.
  const key = `${item.entityType}:${item.entityId}`;
  useEffect(() => setValues(initial), [initial]);
  useEffect(() => {
    setSavedAt(null);
    setError(null);
  }, [key]);

  const dirty = item.fields.some((f) => (values[f.key] ?? "") !== f.draft);
  const empty = item.fields.filter((f) => !values[f.key]?.trim()).length;
  const changed = item.fields.filter((f) => f.was !== null);
  const Heading = headingLevel;

  async function save() {
    setBusy("save");
    setError(null);
    try {
      await saveGreekDraft({
        data: { entityType: item.entityType, entityId: item.entityId, fields: values },
      });
      setSavedAt(Date.now());
      setSaid("Greek draft saved. It is not live until approved.");
      const fresh = await getItemGreek({
        data: { entityType: item.entityType, entityId: item.entityId },
      });
      if (fresh) onChanged?.({ ...item, ...fresh, title: item.title, group: item.group });
    } catch (e) {
      setError(errorText(e, "The Greek didn't save. Try again."));
    } finally {
      setBusy(null);
    }
  }

  async function approve() {
    setBusy("approve");
    setError(null);
    try {
      await approveGreek({
        data: { entityType: item.entityType, entityId: item.entityId, fields: values },
      });
      setSaid("Greek approved. It is live on /el now.");
      const fresh = await getItemGreek({
        data: { entityType: item.entityType, entityId: item.entityId },
      });
      if (fresh) onChanged?.({ ...item, ...fresh, title: item.title, group: item.group });
      setConfirming(false);
    } catch (e) {
      setConfirming(false);
      setError(errorText(e, "The Greek wasn't approved. Try again."));
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="greek" aria-labelledby={`greek-${item.entityId}`}>
      <div className="greek-head">
        <Heading className="title" id={`greek-${item.entityId}`}>
          Greek
        </Heading>
        <GreekBadge status={item.status} />
      </div>
      <p className="meta">{STATUS_NOTE[item.status]}</p>

      {item.status === "stale" && (
        <div className="greek-alert">
          {changed.length ? (
            changed.map((f) => (
              <div className="greek-diff" key={f.key}>
                <p className="label">{f.label}</p>
                <dl className="diff">
                  <div>
                    <dt>Was</dt>
                    <dd>
                      <del>{f.was}</del>
                    </dd>
                  </div>
                  <div>
                    <dt>Now</dt>
                    <dd>
                      <ins>{f.english}</ins>
                    </dd>
                  </div>
                  {f.greek && (
                    <div>
                      <dt>Greek</dt>
                      <dd lang="el">«{f.greek}»</dd>
                    </div>
                  )}
                </dl>
              </div>
            ))
          ) : (
            <p className="meta">
              The English this Greek was approved against wasn't recorded, so the old words can't be
              shown. Compare each field below.
            </p>
          )}
        </div>
      )}

      <div className="greek-fields">
        {item.fields.map((f) => (
          <div className="greek-field" key={f.key}>
            <p className="greek-en">
              <span className="label">English · {f.label}</span>
              <span className="source-text" lang="en">
                {f.rich ? stripHtml(f.english) : f.english}
              </span>
            </p>
            {f.rich ? (
              <RichText
                label={`Greek · ${f.label}`}
                lang="el"
                value={values[f.key] ?? ""}
                onChange={(v) => setValues((s) => ({ ...s, [f.key]: v }))}
              />
            ) : (
              <AreaField
                label={`Greek · ${f.label}`}
                lang="el"
                rows={f.english.length > 140 ? 5 : 2}
                value={values[f.key] ?? ""}
                onChange={(v) => setValues((s) => ({ ...s, [f.key]: v }))}
              />
            )}
          </div>
        ))}
      </div>

      {error && <FormAlert>{error}</FormAlert>}
      <div className="greek-actions">
        <span className="meta">
          {busy === "save" ? "Saving…" : dirty ? "Unsaved changes" : savedWords(savedAt, now)}
        </span>
        <button
          className="btn btn-quiet"
          type="button"
          disabled={!dirty || !!busy}
          aria-busy={busy === "save" || undefined}
          onClick={save}
        >
          Save Greek draft
        </button>
        <button
          className="btn btn-quiet greek-approve"
          type="button"
          aria-haspopup="dialog"
          disabled={!!busy || empty > 0 || (item.status === "approved" && !dirty)}
          aria-describedby={empty > 0 ? `greek-empty-${item.entityId}` : undefined}
          onClick={() => setConfirming(true)}
        >
          <Icon name="check" />
          Approve Greek
        </button>
      </div>
      {empty > 0 && (
        <p className="field-hint" id={`greek-empty-${item.entityId}`}>
          Approve becomes available once every field has Greek ({empty} still empty).
        </p>
      )}
      <p className="sr-only" role="status">
        {said}
      </p>

      <Modal open={confirming} onClose={() => setConfirming(false)} title="Approve this Greek?">
        <p>
          The Greek for <b>{item.title || item.group}</b> goes live on /el straight away, recorded
          as approved by you, against the English as it reads now.
        </p>
        <div className="confirm-actions">
          <button className="btn btn-quiet" type="button" onClick={() => setConfirming(false)}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            type="button"
            aria-busy={busy === "approve" || undefined}
            disabled={!!busy}
            onClick={approve}
          >
            Approve now
          </button>
        </div>
      </Modal>
    </section>
  );
}

function stripHtml(html: string): string {
  return html
    .replace(/<\/(p|h\d|li|blockquote)>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** The Greek panel for one item in a manager; loads its own state. */
export function GreekPanel({
  entityType,
  entityId,
  title,
  version = 0,
}: {
  entityType: string;
  entityId: string;
  title: string;
  /** Bump after the English is saved, so the panel re-reads it. */
  version?: number;
}) {
  const [item, setItem] = useState<QueueItem | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    getItemGreek({ data: { entityType, entityId } }).then(
      (data) => live && setItem(data ? { ...data, title } : null),
      (e) => live && setError(errorText(e)),
    );
    return () => {
      live = false;
    };
  }, [entityType, entityId, title, version]);
  if (error) return <FormAlert>{error}</FormAlert>;
  if (item === undefined) return <Loading>Loading the Greek…</Loading>;
  if (item === null)
    return (
      <section className="greek">
        <h2 className="title">Greek</h2>
        <p className="meta">Add English text first; its Greek is written here afterwards.</p>
      </section>
    );
  return <GreekEditor item={item} onChanged={setItem} />;
}
