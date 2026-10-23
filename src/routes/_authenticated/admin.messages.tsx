import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { Icon } from "@/components/site/Icon";
import { errorText } from "@/components/studio/format";
import { useAnnounce } from "@/components/studio/hooks";
import {
  ConfirmDialog,
  Empty,
  FormAlert,
  Loading,
  PageHead,
  Segmented,
  SelectField,
} from "@/components/studio/kit";
import { supabase } from "@/integrations/supabase/client";

/**
 * Messages sent through the contact form: newest first, filtered by kind,
 * unread ones in bold. Reply opens the owner's own mail app; archived
 * messages leave the inbox but are kept; delete is permanent.
 */
export const Route = createFileRoute("/_authenticated/admin/messages")({
  head: () => ({ meta: [{ title: "Messages — Studio" }] }),
  component: Messages,
});

type Msg = {
  id: string;
  name: string;
  email: string;
  enquiry_type: string;
  message: string;
  locale: string;
  read: boolean;
  read_at: string | null;
  archived_at: string | null;
  created_at: string;
};

const KINDS = [
  { value: "all", label: "Every kind" },
  { value: "general", label: "General" },
  { value: "speaking", label: "Speaking" },
  { value: "media", label: "Media" },
  { value: "partnerships", label: "Partnerships" },
  { value: "volunteering", label: "Volunteering" },
];
/** Older messages stored the kind capitalised; compare without case. */
const kindOf = (m: { enquiry_type: string }) => m.enquiry_type.toLowerCase();
const kindWord = (m: { enquiry_type: string }) =>
  KINDS.find((k) => k.value === kindOf(m))?.label ?? m.enquiry_type;
const BOXES = [
  { value: "inbox", label: "Inbox" },
  { value: "unread", label: "Unread" },
  { value: "archived", label: "Archived" },
];

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });

function Messages() {
  const [msgs, setMsgs] = useState<Msg[] | null>(null);
  const [kind, setKind] = useState("all");
  const [box, setBox] = useState("inbox");
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<Msg | null>(null);
  const [announce, say] = useAnnounce();
  const searchId = useId();

  const load = useCallback(async () => {
    const { data, error: e } = await supabase
      .from("contact_messages")
      .select("*")
      .order("created_at", { ascending: false });
    if (e) setError(errorText(e));
    else setMsgs((data ?? []) as Msg[]);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  async function patch(m: Msg, change: Partial<Msg>, words: string) {
    setError(null);
    const { error: e } = await supabase.from("contact_messages").update(change).eq("id", m.id);
    if (e) return setError(errorText(e));
    setMsgs((list) => list?.map((x) => (x.id === m.id ? { ...x, ...change } : x)) ?? null);
    say(words);
  }

  const shown = useMemo(() => {
    const words = q.trim().toLowerCase();
    return (msgs ?? []).filter(
      (m) =>
        (kind === "all" || kindOf(m) === kind) &&
        (box === "archived" ? !!m.archived_at : !m.archived_at) &&
        (box !== "unread" || !m.read) &&
        (!words || `${m.name} ${m.email} ${m.message}`.toLowerCase().includes(words)),
    );
  }, [msgs, kind, box, q]);

  const unread = (msgs ?? []).filter((m) => !m.read && !m.archived_at).length;

  return (
    <>
      {announce}
      <PageHead
        title="Messages"
        lead={
          msgs
            ? `${unread} unread · ${msgs.filter((m) => !m.archived_at).length} in the inbox`
            : "Messages sent through the contact form."
        }
      />
      {error && <FormAlert>{error}</FormAlert>}
      {!msgs ? (
        <Loading>Loading messages…</Loading>
      ) : (
        <>
          <div className="mgr-tools">
            <Segmented legend="Show" value={box} onChange={setBox} options={BOXES} />
            <SelectField label="Kind" value={kind} onChange={setKind} options={KINDS} />
            <div className="field mgr-search">
              <label htmlFor={searchId}>Search</label>
              <input id={searchId} type="search" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
          </div>
          {shown.length === 0 ? (
            <Empty>
              {msgs.length === 0 ? "No messages yet." : "Nothing here. Try another filter."}
            </Empty>
          ) : (
            <ul className="mgr-list" aria-label="Messages">
              {shown.map((m) => (
                <li key={m.id} className={m.read ? "msg" : "msg is-unread"}>
                  <div className="msg-head">
                    <p>
                      <span className="msg-from">{m.name}</span>{" "}
                      <span className="meta">{m.email}</span>
                    </p>
                    <p className="meta">
                      {!m.read && <span className="badge">New</span>} {kindWord(m)}
                      {m.locale === "el" ? " · Greek" : ""} · {when(m.created_at)}
                    </p>
                  </div>
                  <p className="msg-body">{m.message}</p>
                  <div className="msg-actions">
                    <a
                      className="btn btn-quiet btn-sm"
                      href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: your message (${kindWord(m)})`)}`}
                    >
                      <Icon name="arrow-ext" />
                      Reply by email
                    </a>
                    <button
                      className="btn btn-quiet btn-sm"
                      type="button"
                      onClick={() =>
                        patch(
                          m,
                          m.read
                            ? { read: false, read_at: null }
                            : { read: true, read_at: new Date().toISOString() },
                          m.read ? `Marked unread: ${m.name}.` : `Marked read: ${m.name}.`,
                        )
                      }
                    >
                      <Icon name={m.read ? "eye-off" : "eye"} />
                      {m.read ? "Mark unread" : "Mark read"}
                    </button>
                    <button
                      className="btn btn-quiet btn-sm"
                      type="button"
                      onClick={() =>
                        patch(
                          m,
                          m.archived_at
                            ? { archived_at: null }
                            : { archived_at: new Date().toISOString(), read: true },
                          m.archived_at ? "Moved back to the inbox." : "Archived.",
                        )
                      }
                    >
                      <Icon name={m.archived_at ? "undo" : "check"} />
                      {m.archived_at ? "Back to inbox" : "Archive"}
                    </button>
                    <button
                      className="btn btn-quiet btn-sm btn-danger"
                      type="button"
                      onClick={() => setRemoving(m)}
                    >
                      <Icon name="trash" />
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      <ConfirmDialog
        open={!!removing}
        title={`Delete the message from ${removing?.name ?? ""}?`}
        body="It's removed for good. Archive keeps it out of the inbox instead."
        confirm="Delete message"
        onConfirm={async () => {
          if (!removing) return;
          const { error: e } = await supabase
            .from("contact_messages")
            .delete()
            .eq("id", removing.id);
          if (e) throw new Error(errorText(e));
          setMsgs((list) => list?.filter((x) => x.id !== removing.id) ?? null);
          say("Message deleted.");
        }}
        onClose={() => setRemoving(null)}
      />
    </>
  );
}
