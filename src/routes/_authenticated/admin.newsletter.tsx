import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/site/Icon";
import { day, errorText, savedWords } from "@/components/studio/format";
import { useAnnounce, useNow } from "@/components/studio/hooks";
import {
  BackLink,
  ConfirmDialog,
  Empty,
  FormAlert,
  Loading,
  Modal,
  PageHead,
  SelectField,
  TextField,
} from "@/components/studio/kit";
import { MediaField } from "@/components/studio/MediaPicker";
import { RichText } from "@/components/studio/RichText";
import { supabase } from "@/integrations/supabase/client";
import { variantUrl } from "@/lib/media-upload";

/**
 * Letters to subscribers: write a draft (subject, header image, body), choose
 * who it is for, and record it as sent. Sending email itself waits on the
 * Resend key (Settings); until then "Record as sent" only keeps the history.
 */
export const Route = createFileRoute("/_authenticated/admin/newsletter")({
  head: () => ({ meta: [{ title: "Newsletter — Studio" }] }),
  validateSearch: (s: Record<string, unknown>): { item?: string } => ({
    item: typeof s.item === "string" ? s.item : undefined,
  }),
  component: Newsletter,
});

type Letter = {
  id: string;
  subject: string;
  body: string;
  header_image: string | null;
  filter_source: string | null;
  locale_mode: string;
  status: string;
  recipient_count: number;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
};
type Sub = { source: string | null; status: string };

function Newsletter() {
  const { item } = Route.useSearch();
  const nav = useNavigate();
  const [letters, setLetters] = useState<Letter[] | null>(null);
  const [subs, setSubs] = useState<Sub[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [n, s] = await Promise.all([
      supabase.from("newsletters").select("*").order("created_at", { ascending: false }),
      supabase.from("subscribers").select("source, status"),
    ]);
    if (n.error || s.error) return setError(errorText(n.error ?? s.error));
    setLetters((n.data ?? []) as Letter[]);
    setSubs((s.data ?? []) as Sub[]);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const open = (id?: string) => nav({ to: "/admin/newsletter", search: { item: id } });

  async function add() {
    setError(null);
    const { data, error: e } = await supabase
      .from("newsletters")
      .insert({ subject: "", body: "", status: "draft" })
      .select("*")
      .single();
    if (e || !data) return setError(errorText(e, "The draft wasn't started."));
    setLetters((list) => [data as Letter, ...(list ?? [])]);
    open(data.id);
  }

  if (!letters) return error ? <FormAlert>{error}</FormAlert> : <Loading>Loading letters…</Loading>;

  const current = item ? letters.find((l) => l.id === item) : undefined;
  if (item && current)
    return (
      <Editor
        key={current.id}
        letter={current}
        subs={subs}
        onBack={() => open()}
        onSaved={(next) =>
          setLetters((list) => list?.map((l) => (l.id === next.id ? next : l)) ?? null)
        }
        onDeleted={() => {
          setLetters((list) => list?.filter((l) => l.id !== current.id) ?? null);
          open();
        }}
      />
    );

  const sent = letters.filter((l) => l.status === "sent").length;
  return (
    <>
      <PageHead
        title="Newsletter"
        lead={`${sent} sent · ${letters.length - sent} drafts`}
        actions={
          <button className="btn btn-primary" type="button" onClick={add}>
            <Icon name="plus" />
            New letter
          </button>
        }
      />
      {error && <FormAlert>{error}</FormAlert>}
      {item && !current && (
        <FormAlert>That letter wasn't found. It may have been deleted.</FormAlert>
      )}
      {letters.length === 0 ? (
        <Empty
          action={
            <button className="btn btn-quiet" type="button" onClick={add}>
              Write the first letter
            </button>
          }
        >
          No letters yet.
        </Empty>
      ) : (
        <ul className="mgr-list" aria-label="Letters">
          {letters.map((l) => (
            <li key={l.id}>
              <button className="mgr-row mgr-row--plain" type="button" onClick={() => open(l.id)}>
                <span className="mgr-row-text">
                  <span className="mgr-row-name">{l.subject || "Untitled letter"}</span>
                  <span className="mgr-row-meta meta">
                    {l.status === "sent"
                      ? `Sent ${day(l.sent_at)} to ${l.recipient_count}`
                      : `Edited ${day(l.updated_at)}`}
                    {l.filter_source ? ` · ${l.filter_source} only` : ""}
                  </span>
                </span>
                <span className="mgr-row-end">
                  <span className={l.status === "sent" ? "badge" : "badge badge--hidden"}>
                    {l.status === "sent" ? "Sent" : "Draft"}
                  </span>
                  <Icon name="chev-right" />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function Editor({
  letter,
  subs,
  onBack,
  onSaved,
  onDeleted,
}: {
  letter: Letter;
  subs: Sub[];
  onBack: () => void;
  onSaved: (l: Letter) => void;
  onDeleted: () => void;
}) {
  const [draft, setDraft] = useState(letter);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [confirmSend, setConfirmSend] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [announce, say] = useAnnounce();
  const now = useNow();
  const sent = letter.status === "sent";
  const dirty = JSON.stringify(draft) !== JSON.stringify(letter);

  const sources = useMemo(() => {
    const set = new Set<string>();
    for (const s of subs) if (s.status === "active") set.add(s.source ?? "unknown");
    return [...set].sort();
  }, [subs]);
  const recipients = subs.filter(
    (s) =>
      s.status === "active" &&
      (!draft.filter_source || (s.source ?? "unknown") === draft.filter_source),
  ).length;

  async function save(extra: Partial<Letter> = {}) {
    setError(null);
    if (extra.status === "sent" && !draft.subject.trim())
      return setError("Add a subject line first.");
    setBusy(true);
    const { data, error: e } = await supabase
      .from("newsletters")
      .update({
        subject: draft.subject.trim(),
        body: draft.body,
        header_image: draft.header_image,
        filter_source: draft.filter_source,
        locale_mode: draft.locale_mode,
        ...extra,
      })
      .eq("id", letter.id)
      .select("*")
      .single();
    setBusy(false);
    if (e || !data) return setError(errorText(e, "The letter wasn't saved."));
    setDraft(data as Letter);
    onSaved(data as Letter);
    setSavedAt(Date.now());
    say(extra.status === "sent" ? `Recorded as sent to ${recipients}.` : "Draft saved.");
  }

  return (
    <>
      {announce}
      <PageHead
        back={<BackLink onClick={onBack}>All letters</BackLink>}
        title={draft.subject || "Untitled letter"}
        lead={
          sent
            ? `Recorded as sent on ${day(letter.sent_at)} to ${letter.recipient_count} subscribers.`
            : "A draft. Nothing is emailed from here until the Resend key is set in Settings."
        }
      />
      <div className="mgr-form">
        <fieldset className="mgr-group">
          <legend>Letter</legend>
          <TextField
            label="Subject line"
            value={draft.subject}
            onChange={(subject) => setDraft({ ...draft, subject })}
            maxLength={160}
          />
          <MediaField
            label="Header image"
            hint="Optional. Shown above the letter, full width."
            kind="image"
            value={null}
            onChange={(_id, row) =>
              setDraft({ ...draft, header_image: row ? variantUrl(row, 1600) : null })
            }
          />
          {draft.header_image && (
            <div className="news-header">
              <img src={draft.header_image} alt="" />
              <button
                className="btn-text"
                type="button"
                onClick={() => setDraft({ ...draft, header_image: null })}
              >
                Remove header image
              </button>
            </div>
          )}
          <RichText
            label="Letter"
            value={draft.body}
            onChange={(body) => setDraft({ ...draft, body })}
          />
        </fieldset>
        <fieldset className="mgr-group">
          <legend>Who it's for</legend>
          <SelectField
            label="Send to"
            hint={`${recipients} subscribed ${recipients === 1 ? "person" : "people"} would get this.`}
            value={draft.filter_source ?? ""}
            onChange={(v) => setDraft({ ...draft, filter_source: v || null })}
            options={[
              { value: "", label: "Everyone subscribed" },
              ...sources.map((s) => ({ value: s, label: `Only from: ${s}` })),
            ]}
          />
          <SelectField
            label="Language"
            value={draft.locale_mode}
            onChange={(locale_mode) => setDraft({ ...draft, locale_mode })}
            options={[
              { value: "per_subscriber", label: "Each person's own language" },
              { value: "english_to_all", label: "English to everyone" },
            ]}
          />
        </fieldset>
      </div>
      {error && <FormAlert>{error}</FormAlert>}
      <div className="mgr-savebar">
        <p className="meta" aria-live="polite">
          {busy ? "Saving…" : dirty ? "Unsaved changes" : savedAt ? savedWords(savedAt, now) : ""}
        </p>
        <button
          className="btn btn-quiet btn-danger"
          type="button"
          onClick={() => setRemoving(true)}
        >
          <Icon name="trash" />
          Delete
        </button>
        <button
          className="btn btn-quiet"
          type="button"
          onClick={() => save()}
          disabled={busy || !dirty}
        >
          Save draft
        </button>
        {!sent && (
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => setConfirmSend(true)}
            disabled={busy}
          >
            <Icon name="check" />
            Record as sent
          </button>
        )}
      </div>
      <Modal
        open={confirmSend}
        onClose={() => setConfirmSend(false)}
        title="Record this letter as sent?"
      >
        <p>
          It's saved in the history as sent to {recipients} {recipients === 1 ? "person" : "people"}
          . No email goes out from the studio yet; send it from your mail tool.
        </p>
        <div className="confirm-actions">
          <button className="btn btn-quiet" type="button" onClick={() => setConfirmSend(false)}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            type="button"
            onClick={async () => {
              setConfirmSend(false);
              await save({
                status: "sent",
                sent_at: new Date().toISOString(),
                recipient_count: recipients,
              });
            }}
          >
            Record as sent
          </button>
        </div>
      </Modal>
      <ConfirmDialog
        open={removing}
        title={`Delete ${draft.subject ? `"${draft.subject}"` : "this letter"}?`}
        body="It's removed from the history. This can't be undone."
        confirm="Delete letter"
        onConfirm={async () => {
          const { error: e } = await supabase.from("newsletters").delete().eq("id", letter.id);
          if (e) throw new Error(errorText(e));
          onDeleted();
        }}
        onClose={() => setRemoving(false)}
      />
    </>
  );
}
