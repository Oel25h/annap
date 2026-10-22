import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PillButton, Field, inputCls, textareaCls, cardCls, Toast } from "@/components/admin/ui";
import { ImageUploader } from "@/components/admin/ImageUpload";
import { RichEditor } from "@/components/admin/RichEditor";
import { GreekTranslationPanel } from "@/components/admin/GreekTranslationPanel";

export const Route = createFileRoute("/_authenticated/admin/pages")({
  component: PagesManager,
});

type BlockDef = {
  key: string;
  label: string;
  type: "text" | "textarea" | "rich" | "image";
  hint?: string;
};
type PageDef = { id: "home" | "about"; label: string; blocks: BlockDef[] };

const PAGES: PageDef[] = [
  {
    id: "home",
    label: "Home",
    blocks: [
      { key: "hero_eyebrow", label: "Hero eyebrow (small text above headline)", type: "text" },
      {
        key: "hero_headline",
        label: "Hero headline",
        type: "textarea",
        hint: "Wrap an italic word with *asterisks*, e.g. Turn your pain into *purpose*.",
      },
      { key: "hero_sub", label: "Hero sub-headline", type: "textarea" },
      { key: "hero_image", label: "Hero image", type: "image" },
      { key: "featured_quote", label: "Featured testimonial", type: "textarea" },
      { key: "featured_author", label: "Testimonial author", type: "text" },
    ],
  },
  {
    id: "about",
    label: "About",
    blocks: [
      { key: "portrait_image", label: "Portrait image", type: "image" },
      { key: "intro", label: "Intro paragraph", type: "rich" },
      { key: "bio", label: "Full bio", type: "rich" },
      { key: "belief_1", label: "Belief 1", type: "textarea" },
      { key: "belief_2", label: "Belief 2", type: "textarea" },
      { key: "belief_3", label: "Belief 3", type: "textarea" },
    ],
  },
];

type Row = { page: string; block_key: string; value: { v?: string } };

function PagesManager() {
  const [active, setActive] = useState<PageDef["id"]>("home");
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const page = PAGES.find((p) => p.id === active)!;

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("page_content")
        .select("page, block_key, value")
        .eq("page", active);
      const map: Record<string, string> = {};
      for (const r of (data ?? []) as Row[]) map[r.block_key] = r.value?.v ?? "";
      setValues(map);
    })();
  }, [active]);

  function set(k: string, v: string) {
    setValues((prev) => ({ ...prev, [k]: v }));
  }

  async function save() {
    setBusy(true);
    try {
      const rows = page.blocks.map((b) => ({
        page: active,
        block_key: b.key,
        value: { v: values[b.key] ?? "" },
      }));
      await supabase.from("page_content").upsert(rows, { onConflict: "page,block_key" });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-10">
      <header>
        <h1 className="font-display text-4xl text-plum md:text-5xl">Page content</h1>
        <p className="mt-2 text-sm text-ink">
          Edit Home and About page blocks (English), then generate and approve Greek drafts below.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {PAGES.map((p) => (
          <button
            key={p.id}
            onClick={() => setActive(p.id)}
            className={`rounded-full px-5 py-2 text-[11px] uppercase tracking-[0.24em] ${active === p.id ? "bg-plum text-ivory" : "bg-plum/8 text-plum"}`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <section className={cardCls + " space-y-6"}>
        {page.blocks.map((b) => (
          <Field key={b.key} label={b.label} hint={b.hint}>
            {b.type === "text" && (
              <input
                value={values[b.key] ?? ""}
                onChange={(e) => set(b.key, e.target.value)}
                className={inputCls}
              />
            )}
            {b.type === "textarea" && (
              <textarea
                rows={4}
                value={values[b.key] ?? ""}
                onChange={(e) => set(b.key, e.target.value)}
                className={textareaCls}
              />
            )}
            {b.type === "rich" && (
              <RichEditor
                value={values[b.key] ?? ""}
                onChange={(html) => set(b.key, html)}
                folder="pages"
                minHeight={200}
              />
            )}
            {b.type === "image" && (
              <div className="flex flex-wrap items-center gap-3">
                <ImageUploader
                  folder="pages"
                  label={values[b.key] ? "Replace image" : "Upload image"}
                  onUploaded={(urls) => set(b.key, urls[0])}
                />
                {values[b.key] && (
                  <img src={values[b.key]} alt="" className="h-28 rounded-2xl object-cover" />
                )}
              </div>
            )}
          </Field>
        ))}
      </section>

      <PillButton onClick={save} disabled={busy}>
        {busy ? "Saving…" : `Save ${page.label} page`}
      </PillButton>
      <Toast show={saved}>Saved ✓</Toast>

      <div className="space-y-6">
        {page.blocks
          .filter((b) => b.type !== "image")
          .map((b) => (
            <GreekTranslationPanel
              key={`${active}:${b.key}`}
              entityType="page_content"
              entityId={`${active}:${b.key}`}
              englishPreview={{ value: values[b.key] ?? "" }}
              fields={[
                {
                  key: "value",
                  label: `Greek — ${b.label}`,
                  type: b.type === "rich" ? "rich" : b.type === "textarea" ? "textarea" : "text",
                  folder: "pages",
                },
              ]}
            />
          ))}
      </div>
    </div>
  );
}
