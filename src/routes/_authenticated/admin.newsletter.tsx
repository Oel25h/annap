import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, Edit3, Send } from "lucide-react";
import {
  PillButton,
  Field,
  inputCls,
  cardCls,
  ConfirmButton,
  EmptyState,
  Chip,
  Toast,
} from "@/components/admin/ui";
import { ImageUploader } from "@/components/admin/ImageUpload";
import { RichEditor } from "@/components/admin/RichEditor";

export const Route = createFileRoute("/_authenticated/admin/newsletter")({
  component: NewsletterPage,
  validateSearch: (s: Record<string, unknown>) => ({ new: s.new === "1" ? "1" : undefined }),
});

type N = {
  id: string;
  subject: string;
  body: string;
  header_image: string | null;
  filter_source: string | null;
  status: string;
  recipient_count: number;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
};
type Sub = { source: string | null; status: string };

function NewsletterPage() {
  const search = useSearch({ from: "/_authenticated/admin/newsletter" });
  const [items, setItems] = useState<N[]>([]);
  const [subs, setSubs] = useState<Sub[]>([]);
  const [editing, setEditing] = useState<Partial<N> | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");

  async function load() {
    const [{ data: n }, { data: s }] = await Promise.all([
      supabase.from("newsletters").select("*").order("created_at", { ascending: false }),
      supabase.from("subscribers").select("source,status"),
    ]);
    setItems((n ?? []) as N[]);
    setSubs((s ?? []) as Sub[]);
  }
  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    if (search.new === "1" && !editing)
      setEditing({
        subject: "",
        body: "",
        header_image: null,
        filter_source: null,
        status: "draft",
      }); /* eslint-disable-next-line */
  }, [search.new]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2000);
    return () => clearTimeout(t);
  }, [toast]);

  const sources = useMemo(() => {
    const set = new Set<string>();
    for (const s of subs) if (s.status === "active") set.add(s.source ?? "unknown");
    return [...set];
  }, [subs]);

  function countRecipients(source: string | null) {
    return subs.filter(
      (s) => s.status === "active" && (source ? (s.source ?? "unknown") === source : true),
    ).length;
  }

  async function saveDraft() {
    if (!editing || !editing.subject) return;
    setBusy(true);
    try {
      const base = {
        subject: editing.subject,
        body: editing.body ?? "",
        header_image: editing.header_image ?? null,
        filter_source: editing.filter_source ?? null,
        status: "draft",
      };
      if (editing.id) await supabase.from("newsletters").update(base).eq("id", editing.id);
      else {
        const { data } = await supabase.from("newsletters").insert(base).select().single();
        if (data) setEditing(data as N);
      }
      setToast("Draft saved");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function markSent() {
    if (!editing || !editing.subject) return;
    if (
      !confirm(
        "Mark this newsletter as sent? (Note: no email will actually be delivered until Resend is wired up.)",
      )
    )
      return;
    setBusy(true);
    try {
      const rc = countRecipients(editing.filter_source ?? null);
      const base = {
        subject: editing.subject,
        body: editing.body ?? "",
        header_image: editing.header_image ?? null,
        filter_source: editing.filter_source ?? null,
        status: "sent",
        sent_at: new Date().toISOString(),
        recipient_count: rc,
      };
      if (editing.id) await supabase.from("newsletters").update(base).eq("id", editing.id);
      else await supabase.from("newsletters").insert(base);
      setEditing(null);
      setToast(`Recorded — ${rc} recipients`);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function del(id: string) {
    await supabase.from("newsletters").delete().eq("id", id);
    await load();
  }

  if (editing) {
    const rc = countRecipients(editing.filter_source ?? null);
    return (
      <div className="max-w-3xl space-y-6">
        <button
          onClick={() => setEditing(null)}
          className="text-xs uppercase tracking-[0.22em] text-plum/60 hover:text-plum"
        >
          ← Back to newsletters
        </button>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h1 className="font-display text-4xl text-plum">
            {editing.id ? "Edit newsletter" : "New newsletter"}
          </h1>
          {editing.status && (
            <Chip tone={editing.status === "sent" ? "success" : "warn"}>{editing.status}</Chip>
          )}
        </div>

        <section className={cardCls + " space-y-5"}>
          <Field label="Subject line">
            <input
              value={editing.subject ?? ""}
              onChange={(e) => setEditing({ ...editing, subject: e.target.value })}
              className={inputCls}
            />
          </Field>
          <Field label="Header image (optional)">
            <div className="flex flex-wrap items-center gap-3">
              <ImageUploader
                folder="newsletters"
                label={editing.header_image ? "Replace image" : "Upload image"}
                onUploaded={(urls) => setEditing({ ...editing, header_image: urls[0] })}
              />
              {editing.header_image && (
                <img src={editing.header_image} alt="" className="h-24 rounded-2xl object-cover" />
              )}
            </div>
          </Field>
        </section>

        <section>
          <span className="text-[11px] uppercase tracking-[0.24em] text-plum/70">Body</span>
          <div className="mt-2">
            <RichEditor
              value={editing.body ?? ""}
              onChange={(html) => setEditing({ ...editing, body: html })}
              folder="newsletters"
            />
          </div>
        </section>

        <section className={cardCls + " space-y-4"}>
          <Field label="Send to" hint="Choose 'Everyone' or filter to one signup source">
            <select
              value={editing.filter_source ?? ""}
              onChange={(e) => setEditing({ ...editing, filter_source: e.target.value || null })}
              className={inputCls}
            >
              <option value="">Everyone (all active subscribers)</option>
              {sources.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <div className="rounded-2xl bg-burgundy/8 px-5 py-3 text-sm text-plum">
            This will go to <strong className="text-burgundy">{rc}</strong> active subscriber
            {rc === 1 ? "" : "s"}.
          </div>
          <p className="text-xs text-plum/50">
            Email delivery (Resend) is not wired up yet. These buttons only save a draft or record a
            send in your history — no email goes out. Add a Resend API key later to send for real.
          </p>
        </section>

        <div className="flex flex-wrap gap-3 pt-2">
          <PillButton variant="outline" onClick={saveDraft} disabled={busy}>
            Save draft
          </PillButton>
          <PillButton onClick={markSent} disabled={busy || !editing.subject}>
            <Send className="h-4 w-4" /> Save draft / Mark as sent (no email)
          </PillButton>
        </div>
        <Toast show={!!toast}>{toast}</Toast>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl text-plum md:text-5xl">Newsletter</h1>
          <p className="mt-2 text-sm text-ink">
            {items.filter((n) => n.status === "sent").length} sent ·{" "}
            {items.filter((n) => n.status === "draft").length} drafts
          </p>
        </div>
        <PillButton
          onClick={() =>
            setEditing({
              subject: "",
              body: "",
              header_image: null,
              filter_source: null,
              status: "draft",
            })
          }
        >
          <Plus className="h-4 w-4" /> Compose
        </PillButton>
      </div>

      <div className="grid gap-3">
        {items.map((n) => (
          <div
            key={n.id}
            className="flex items-center gap-4 rounded-3xl border border-plum/10 bg-bone/50 p-5 soft-shadow"
          >
            {n.header_image ? (
              <img src={n.header_image} className="h-16 w-16 rounded-2xl object-cover" alt="" />
            ) : (
              <div className="h-16 w-16 rounded-2xl bg-plum/8" />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <div className="truncate font-display text-lg text-plum">
                  {n.subject || "(no subject)"}
                </div>
                <Chip tone={n.status === "sent" ? "success" : "warn"}>{n.status}</Chip>
                {n.filter_source && <Chip>{n.filter_source}</Chip>}
              </div>
              <div className="mt-1 text-[10px] uppercase tracking-[0.22em] text-plum/50">
                {n.status === "sent" && n.sent_at
                  ? `Sent ${new Date(n.sent_at).toLocaleDateString()} · ${n.recipient_count} recipients`
                  : `Updated ${new Date(n.updated_at).toLocaleDateString()}`}
              </div>
            </div>
            <button
              onClick={() => setEditing(n)}
              className="grid h-9 w-9 place-items-center rounded-full border border-plum/15 text-plum hover:border-burgundy hover:text-burgundy"
            >
              <Edit3 className="h-4 w-4" />
            </button>
            <ConfirmButton onConfirm={() => del(n.id)} message="Delete this newsletter?">
              <Trash2 className="h-3.5 w-3.5" />
            </ConfirmButton>
          </div>
        ))}
        {items.length === 0 && (
          <EmptyState
            title="No newsletters yet"
            sub="Compose your first newsletter — save as a draft or record it as sent."
            action={
              <PillButton
                onClick={() =>
                  setEditing({
                    subject: "",
                    body: "",
                    header_image: null,
                    filter_source: null,
                    status: "draft",
                  })
                }
              >
                <Plus className="h-4 w-4" /> Compose
              </PillButton>
            }
          />
        )}
      </div>
    </div>
  );
}
