import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PillButton, Field, inputCls, textareaCls, cardCls, Toast } from "@/components/admin/ui";
import { GreekTranslationPanel } from "@/components/admin/GreekTranslationPanel";

export const Route = createFileRoute("/_authenticated/admin/masterclass")({
  component: MasterclassEditor,
});

type M = {
  id?: string;
  title: string;
  description: string;
  included: string;
  dates: string;
  price: string;
  enroll_url: string | null;
  status: string;
};

function MasterclassEditor() {
  const [m, setM] = useState<M | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("masterclass").select("*").limit(1).maybeSingle();
      setM(
        data
          ? (data as M)
          : {
              title: "",
              description: "",
              included: "",
              dates: "",
              price: "",
              enroll_url: "",
              status: "open",
            },
      );
    })();
  }, []);
  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 2000);
    return () => clearTimeout(t);
  }, [saved]);

  async function save() {
    if (!m) return;
    setBusy(true);
    try {
      if (m.id) await supabase.from("masterclass").update(m).eq("id", m.id);
      else {
        const { data } = await supabase.from("masterclass").insert(m).select().single();
        if (data) setM(data as M);
      }
      setSaved(true);
    } finally {
      setBusy(false);
    }
  }

  if (!m) return <p className="text-plum/60">Loading…</p>;

  return (
    <div className="max-w-3xl space-y-6">
      <header>
        <h1 className="font-display text-4xl text-plum md:text-5xl">Masterclass</h1>
        <p className="mt-2 text-sm text-ink">
          Update details shown on the public Masterclass page.
        </p>
      </header>
      <section className={cardCls + " space-y-5"}>
        <Field label="Title">
          <input
            value={m.title}
            onChange={(e) => setM({ ...m, title: e.target.value })}
            className={inputCls}
          />
        </Field>
        <Field label="Description">
          <textarea
            rows={5}
            value={m.description}
            onChange={(e) => setM({ ...m, description: e.target.value })}
            className={textareaCls}
          />
        </Field>
        <Field label="What's included" hint="One item per line">
          <textarea
            rows={6}
            value={m.included}
            onChange={(e) => setM({ ...m, included: e.target.value })}
            className={textareaCls}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Dates / cohort">
            <input
              value={m.dates}
              onChange={(e) => setM({ ...m, dates: e.target.value })}
              className={inputCls}
            />
          </Field>
          <Field label="Price">
            <input
              value={m.price}
              onChange={(e) => setM({ ...m, price: e.target.value })}
              className={inputCls}
            />
          </Field>
        </div>
        <Field label="Enrollment link">
          <input
            value={m.enroll_url ?? ""}
            onChange={(e) => setM({ ...m, enroll_url: e.target.value })}
            className={inputCls}
          />
        </Field>
        <Field label="Status">
          <select
            value={m.status}
            onChange={(e) => setM({ ...m, status: e.target.value })}
            className={inputCls}
          >
            <option value="open">Open (accepting enrollments)</option>
            <option value="closed">Closed (waitlist only)</option>
          </select>
        </Field>
      </section>
      <PillButton onClick={save} disabled={busy}>
        {busy ? "Saving…" : "Save changes"}
      </PillButton>
      <Toast show={saved}>Saved ✓</Toast>

      <GreekTranslationPanel
        entityType="masterclass"
        entityId={m.id}
        englishPreview={{
          title: m.title,
          description: m.description,
          included: m.included,
          dates: m.dates,
          price: m.price,
        }}
        fields={[
          { key: "title", label: "Greek title", type: "text" },
          { key: "description", label: "Greek description", type: "textarea" },
          { key: "included", label: "Greek included list", type: "textarea" },
          { key: "dates", label: "Greek dates", type: "text" },
          { key: "price", label: "Greek price label", type: "text" },
        ]}
      />
    </div>
  );
}
