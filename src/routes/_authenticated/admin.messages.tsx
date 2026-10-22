import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  PillButton,
  Field,
  inputCls,
  textareaCls,
  cardCls,
  ConfirmButton,
  Chip,
  Toast,
} from "@/components/admin/ui";
import { Trash2, Mail } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/messages")({
  component: Messages,
});

type Msg = {
  id: string;
  name: string;
  email: string;
  enquiry_type: string;
  message: string;
  read: boolean;
  created_at: string;
};
const TYPES = ["All", "General", "Speaking", "Media", "Partnerships"];

function Messages() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [filter, setFilter] = useState("All");
  const [toast, setToast] = useState("");

  async function load() {
    const { data } = await supabase
      .from("contact_messages")
      .select("*")
      .order("created_at", { ascending: false });
    setMsgs((data ?? []) as Msg[]);
  }
  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2000);
    return () => clearTimeout(t);
  }, [toast]);

  async function toggleRead(m: Msg) {
    await supabase.from("contact_messages").update({ read: !m.read }).eq("id", m.id);
    await load();
  }
  async function del(id: string) {
    await supabase.from("contact_messages").delete().eq("id", id);
    setToast("Deleted");
    await load();
  }

  const filtered = msgs.filter((m) => filter === "All" || m.enquiry_type === filter);
  const unread = msgs.filter((m) => !m.read).length;

  return (
    <div className="space-y-10">
      <header>
        <h1 className="font-display text-4xl text-plum md:text-5xl">Messages</h1>
        <p className="mt-2 text-sm text-ink">
          {unread} unread · {msgs.length} total
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {TYPES.map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`rounded-full px-4 py-2 text-[10px] uppercase tracking-[0.24em] ${filter === t ? "bg-plum text-ivory" : "bg-plum/8 text-plum"}`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((m) => (
          <div
            key={m.id}
            className={`rounded-3xl border p-6 soft-shadow transition ${m.read ? "border-plum/10 bg-bone/50" : "border-burgundy/40 bg-burgundy/5"}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-display text-xl text-plum">{m.name}</span>
                  <span className="text-xs text-plum/60">{m.email}</span>
                  <Chip>{m.enquiry_type}</Chip>
                  {!m.read && <Chip tone="coral">New</Chip>}
                </div>
                <p className="mt-3 whitespace-pre-wrap text-ink">{m.message}</p>
                <div className="mt-2 text-[10px] uppercase tracking-[0.22em] text-plum/50">
                  {new Date(m.created_at).toLocaleString()}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <PillButton size="sm" variant="outline" onClick={() => toggleRead(m)}>
                  {m.read ? "Mark unread" : "Mark read"}
                </PillButton>
                <a
                  href={`mailto:${m.email}`}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-plum/20 px-4 py-2 text-[10px] uppercase tracking-[0.22em] text-plum hover:bg-plum/5"
                >
                  <Mail className="h-3.5 w-3.5" /> Reply
                </a>
                <ConfirmButton onConfirm={() => del(m.id)} message="Delete this message?">
                  <Trash2 className="h-3.5 w-3.5" />
                </ConfirmButton>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="rounded-3xl border border-plum/10 bg-bone/40 p-8 text-center text-plum/60">
            No messages here.
          </p>
        )}
      </div>
      <Toast show={!!toast}>{toast}</Toast>
      {/* stray import guards */}
      <div className="hidden">
        <Field label="_">
          <input className={inputCls} />
        </Field>
        <textarea className={textareaCls} />
        <section className={cardCls} />
      </div>
    </div>
  );
}
