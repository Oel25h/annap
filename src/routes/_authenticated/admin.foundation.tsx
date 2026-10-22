import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Plus,
  Edit3,
  Trash2,
  ChevronUp,
  ChevronDown,
  Star,
  HeartHandshake,
  Eye,
  EyeOff,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  PillButton,
  Field,
  inputCls,
  textareaCls,
  cardCls,
  Toast,
  ConfirmButton,
  EmptyState,
  Chip,
} from "@/components/admin/ui";
import { ImageUploader } from "@/components/admin/ImageUpload";
import { RichEditor } from "@/components/admin/RichEditor";
import { GreekTranslationPanel } from "@/components/admin/GreekTranslationPanel";

export const Route = createFileRoute("/_authenticated/admin/foundation")({
  component: FoundationAdmin,
});

type Tab = "stories" | "page" | "categories";

type Settings = {
  id: string;
  eyebrow: string;
  headline: string;
  subheadline: string | null;
  mission: string | null;
  vision: string | null;
  hero_image_url: string | null;
  cta_label: string | null;
  cta_href: string | null;
  donate_label: string | null;
  donate_href: string | null;
};

type Cat = { id: string; name: string; slug: string; sort_order: number };

type Story = {
  id: string;
  slug: string;
  person_name: string;
  title: string;
  summary: string | null;
  body: string;
  cover_url: string | null;
  location: string | null;
  category: string;
  status: string;
  featured: boolean;
  sort_order: number;
};

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function FoundationAdmin() {
  const [tab, setTab] = useState<Tab>("stories");
  const [settings, setSettings] = useState<Settings | null>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [editing, setEditing] = useState<Partial<Story> | null>(null);
  const [newCat, setNewCat] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function flash(m: string) {
    setToast(m);
    setTimeout(() => setToast(null), 2000);
  }

  async function load() {
    setLoading(true);
    setErr(null);
    const [{ data: s, error: se }, { data: st, error: ste }, { data: c, error: ce }] =
      await Promise.all([
        supabase.from("foundation_settings" as never).select("*").limit(1).maybeSingle(),
        supabase
          .from("foundation_stories" as never)
          .select("*")
          .order("featured", { ascending: false })
          .order("sort_order", { ascending: true })
          .order("updated_at", { ascending: false }),
        supabase
          .from("foundation_categories" as never)
          .select("*")
          .order("sort_order", { ascending: true }),
      ]);
    if (se || ste || ce) setErr(se?.message || ste?.message || ce?.message || "Load failed");
    setSettings((s as Settings | null) ?? null);
    setStories((st as Story[] | null) ?? []);
    setCats((c as Cat[] | null) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  function neu() {
    setTab("stories");
    setEditing({
      title: "",
      slug: "",
      person_name: "",
      summary: "",
      body: "<p></p>",
      cover_url: null,
      location: "",
      category: cats[0]?.name ?? "Community support",
      status: "draft",
      featured: false,
      sort_order: (stories[stories.length - 1]?.sort_order ?? 0) + 10,
    });
  }

  async function saveStory() {
    if (!editing?.title?.trim()) {
      setErr("Title is required");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const slug =
        slugify(editing.slug || editing.title) || `story-${Date.now().toString(36)}`;
      const payload = {
        slug,
        person_name: editing.person_name?.trim() || "—",
        title: editing.title.trim(),
        summary: editing.summary ?? "",
        body: editing.body ?? "<p></p>",
        cover_url: editing.cover_url,
        location: editing.location || null,
        category: editing.category || cats[0]?.name || "",
        status: editing.status || "draft",
        featured: !!editing.featured,
        sort_order: editing.sort_order ?? 0,
        published_at:
          (editing.status || "draft") === "published" ? new Date().toISOString() : null,
      };
      if (editing.id) {
        const { error } = await supabase
          .from("foundation_stories" as never)
          .update(payload as never)
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("foundation_stories" as never)
          .insert(payload as never);
        if (error) throw error;
      }
      setEditing(null);
      flash(editing.id ? "Story saved" : "Story added");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function delStory(id: string) {
    setErr(null);
    const { error } = await supabase.from("foundation_stories" as never).delete().eq("id", id);
    if (error) setErr(error.message);
    else {
      flash("Story deleted");
      await load();
    }
  }

  async function togglePublish(s: Story) {
    const next = s.status === "published" ? "draft" : "published";
    await supabase
      .from("foundation_stories" as never)
      .update({
        status: next,
        published_at: next === "published" ? new Date().toISOString() : null,
      } as never)
      .eq("id", s.id);
    await load();
  }

  async function toggleTop(s: Story) {
    await supabase
      .from("foundation_stories" as never)
      .update({ featured: !s.featured } as never)
      .eq("id", s.id);
    await load();
  }

  function patchSettings(p: Partial<Settings>) {
    setSettings((prev) => (prev ? { ...prev, ...p } : prev));
  }

  async function saveSettings() {
    if (!settings) return;
    setErr(null);
    const { error } = await supabase
      .from("foundation_settings" as never)
      .update({
        eyebrow: settings.eyebrow,
        headline: settings.headline,
        subheadline: settings.subheadline,
        mission: settings.mission,
        vision: settings.vision,
        hero_image_url: settings.hero_image_url,
        cta_label: settings.cta_label,
        cta_href: settings.cta_href,
        donate_label: settings.donate_label,
        donate_href: settings.donate_href,
      } as never)
      .eq("id", settings.id);
    if (error) setErr(error.message);
    else flash("Page settings saved");
  }

  async function addCat() {
    const name = newCat.trim();
    if (!name) return;
    const nextOrder = (cats[cats.length - 1]?.sort_order ?? 0) + 10;
    const { error } = await supabase.from("foundation_categories" as never).insert({
      name,
      slug: slugify(name) || `cat-${Date.now().toString(36)}`,
      sort_order: nextOrder,
    } as never);
    if (error) setErr(error.message);
    else {
      setNewCat("");
      flash("Category added");
      await load();
    }
  }

  async function renameCat(id: string, name: string) {
    const { error } = await supabase
      .from("foundation_categories" as never)
      .update({ name, slug: slugify(name) } as never)
      .eq("id", id);
    if (error) setErr(error.message);
    else await load();
  }

  async function moveCat(id: string, dir: -1 | 1) {
    const i = cats.findIndex((c) => c.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= cats.length) return;
    const a = cats[i];
    const b = cats[j];
    await Promise.all([
      supabase
        .from("foundation_categories" as never)
        .update({ sort_order: b.sort_order } as never)
        .eq("id", a.id),
      supabase
        .from("foundation_categories" as never)
        .update({ sort_order: a.sort_order } as never)
        .eq("id", b.id),
    ]);
    await load();
  }

  async function delCat(id: string) {
    const { error } = await supabase.from("foundation_categories" as never).delete().eq("id", id);
    if (error) setErr(error.message);
    else {
      flash("Category deleted");
      await load();
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "stories", label: "Stories" },
    { id: "page", label: "Page settings" },
    { id: "categories", label: "Categories" },
  ];

  /* ── New / Edit story (full screen like Blog) ── */
  if (editing) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <button
          type="button"
          onClick={() => setEditing(null)}
          className="text-xs uppercase tracking-[0.22em] text-plum/60 hover:text-plum"
        >
          ← Back to stories
        </button>
        <h1 className="font-display text-3xl text-plum md:text-4xl">
          {editing.id ? "Edit story" : "New story"}
        </h1>
        <p className="text-sm text-plum/60">
          Pick a category, add a photo, write the case, then publish. Same flow as Blog.
        </p>

        {err && (
          <div
            className="rounded-2xl border border-terracotta/40 bg-terracotta/10 p-4 text-sm text-terracotta"
            role="alert"
          >
            {err}
          </div>
        )}

        <section className={`${cardCls} space-y-5`}>
          <Field label="Story title">
            <input
              className={inputCls}
              value={editing.title ?? ""}
              onChange={(e) => setEditing({ ...editing, title: e.target.value })}
              placeholder="e.g. A lantern for the journey"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Category">
              <select
                className={inputCls}
                value={editing.category ?? cats[0]?.name ?? ""}
                onChange={(e) => setEditing({ ...editing, category: e.target.value })}
              >
                {cats.length === 0 && <option value="">Add categories first</option>}
                {cats.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Person / case name">
              <input
                className={inputCls}
                value={editing.person_name ?? ""}
                onChange={(e) => setEditing({ ...editing, person_name: e.target.value })}
                placeholder="Name or case label"
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Location (optional)">
              <input
                className={inputCls}
                value={editing.location ?? ""}
                onChange={(e) => setEditing({ ...editing, location: e.target.value })}
              />
            </Field>
            <Field label="URL slug" hint="Auto from title if blank">
              <input
                className={inputCls}
                value={editing.slug ?? ""}
                onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Photo">
            <div className="flex flex-wrap items-center gap-3">
              <ImageUploader
                folder="foundation"
                label={editing.cover_url ? "Replace photo" : "Upload photo"}
                onUploaded={(urls) => setEditing({ ...editing, cover_url: urls[0] })}
              />
              {editing.cover_url && (
                <img
                  src={editing.cover_url}
                  alt=""
                  className="h-24 w-20 rounded-2xl object-cover"
                />
              )}
            </div>
          </Field>
          <Field label="Short summary" hint="Shown on cards and top lead">
            <textarea
              className={textareaCls}
              rows={3}
              value={editing.summary ?? ""}
              onChange={(e) => setEditing({ ...editing, summary: e.target.value })}
            />
          </Field>
        </section>

        <section>
          <span className="text-[11px] uppercase tracking-[0.24em] text-plum/70">Full story</span>
          <div className="mt-2">
            <RichEditor
              value={editing.body ?? ""}
              onChange={(html) => setEditing({ ...editing, body: html })}
              folder="foundation"
            />
          </div>
        </section>

        <section className={`${cardCls} grid gap-5 sm:grid-cols-2`}>
          <Field label="Status">
            <select
              className={inputCls}
              value={editing.status ?? "draft"}
              onChange={(e) => setEditing({ ...editing, status: e.target.value })}
            >
              <option value="draft">Draft (hidden)</option>
              <option value="published">Published (live)</option>
              <option value="hidden">Hidden</option>
            </select>
          </Field>
          <Field label="Top story">
            <select
              className={inputCls}
              value={editing.featured ? "yes" : "no"}
              onChange={(e) => setEditing({ ...editing, featured: e.target.value === "yes" })}
            >
              <option value="no">No — in the grid</option>
              <option value="yes">Yes — pin under hero</option>
            </select>
          </Field>
        </section>

        <div className="flex flex-wrap gap-3 pt-2">
          <PillButton onClick={() => void saveStory()} disabled={busy}>
            {busy ? "Saving…" : editing.id ? "Save story" : "Add story"}
          </PillButton>
          <PillButton variant="outline" onClick={() => setEditing(null)}>
            Cancel
          </PillButton>
        </div>

        {editing.id && (
          <GreekTranslationPanel
            entityType="foundation_story"
            entityId={editing.id}
            englishPreview={{
              person_name: editing.person_name ?? "",
              title: editing.title ?? "",
              summary: editing.summary ?? "",
              body: editing.body ?? "",
              location: editing.location ?? "",
              category: editing.category ?? "",
            }}
            fields={[
              { key: "person_name", label: "Greek name", type: "text" },
              { key: "title", label: "Greek title", type: "text" },
              { key: "category", label: "Greek category", type: "text" },
              { key: "summary", label: "Greek summary", type: "textarea" },
              { key: "location", label: "Greek location", type: "text" },
              { key: "body", label: "Greek story", type: "rich", folder: "foundation" },
            ]}
          />
        )}

        <Toast show={!!toast}>{toast}</Toast>
      </div>
    );
  }

  /* ── List / tabs ── */
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.28em] text-plum/60">Foundation</div>
          <h1 className="mt-1 font-display text-3xl text-plum md:text-4xl">Impact & stories</h1>
          <p className="mt-2 max-w-xl text-sm text-plum/70">
            Everyday path: <strong>Stories</strong> → New story (category + photo). Page hero &
            mission live under <strong>Page settings</strong>.
          </p>
        </div>
        {tab === "stories" && (
          <PillButton onClick={neu}>
            <Plus className="h-3.5 w-3.5" /> New story
          </PillButton>
        )}
      </div>

      <div
        className="inline-flex flex-wrap gap-1 rounded-full bg-bone/80 p-1.5"
        role="tablist"
        aria-label="Foundation admin"
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-full px-4 py-2 text-[11px] font-medium uppercase tracking-[0.18em] transition ${
              tab === t.id
                ? "bg-burgundy text-ivory shadow-sm"
                : "text-plum/65 hover:bg-ivory hover:text-plum"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {err && (
        <div
          className="rounded-2xl border border-terracotta/40 bg-terracotta/10 p-4 text-sm text-terracotta"
          role="alert"
        >
          {err}
        </div>
      )}

      {loading && <p className="text-sm text-plum/50">Loading…</p>}

      {/* STORIES LIST */}
      {tab === "stories" && !loading && (
        <div className="space-y-4">
          {stories.length === 0 ? (
            <EmptyState
              title="No stories yet"
              sub="Create a story with a category and photo — it shows under the hero once published."
              action={
                <PillButton onClick={neu}>
                  <Plus className="h-3.5 w-3.5" /> New story
                </PillButton>
              }
            />
          ) : (
            <div className="grid gap-3">
              {stories.map((s) => (
                <div
                  key={s.id}
                  className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 rounded-3xl border border-plum/10 bg-bone/50 p-3 soft-shadow sm:flex sm:items-center sm:gap-4 sm:p-4"
                >
                  {s.cover_url ? (
                    <img
                      src={s.cover_url}
                      alt=""
                      className="h-16 w-14 shrink-0 rounded-2xl object-cover sm:h-20 sm:w-16"
                    />
                  ) : (
                    <div className="grid h-16 w-14 shrink-0 place-items-center rounded-2xl bg-plum/8 sm:h-20 sm:w-16">
                      <HeartHandshake className="h-5 w-5 text-plum/30" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="truncate font-display text-base text-plum sm:text-lg">
                        {s.title}
                      </div>
                      <Chip tone={s.status === "published" ? "success" : "warn"}>{s.status}</Chip>
                      {s.featured && (
                        <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.16em] text-burgundy">
                          <Star className="h-3 w-3" /> Top
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-plum/50 sm:text-[11px]">
                      {s.category || "—"}
                      {s.person_name ? ` · ${s.person_name}` : ""}
                    </div>
                  </div>
                  <div className="col-span-2 flex flex-wrap items-center gap-2 sm:col-span-1 sm:flex-nowrap">
                    <PillButton size="sm" variant="outline" onClick={() => setEditing(s)}>
                      <Edit3 className="h-3.5 w-3.5" /> Edit
                    </PillButton>
                    <PillButton size="sm" variant="ghost" onClick={() => void toggleTop(s)}>
                      <Star className="h-3.5 w-3.5" />
                      {s.featured ? "Unpin" : "Top"}
                    </PillButton>
                    <PillButton size="sm" variant="ghost" onClick={() => void togglePublish(s)}>
                      {s.status === "published" ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                      {s.status === "published" ? "Unpublish" : "Publish"}
                    </PillButton>
                    <ConfirmButton onConfirm={() => void delStory(s.id)} message="Delete this story?">
                      <Trash2 className="h-3.5 w-3.5" />
                    </ConfirmButton>
                  </div>
                </div>
              ))}
            </div>
          )}
          {stories.length > 0 && (
            <div className="pt-2">
              <PillButton onClick={neu}>
                <Plus className="h-3.5 w-3.5" /> New story
              </PillButton>
            </div>
          )}
        </div>
      )}

      {/* PAGE SETTINGS */}
      {tab === "page" && settings && (
        <section className={cardCls}>
          <div className="mb-6 flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-burgundy/12 text-burgundy">
              <HeartHandshake className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-display text-2xl text-plum">Page settings</h2>
              <p className="text-xs text-plum/55">Hero, mission, vision, CTAs — not everyday stories</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Eyebrow">
              <input
                className={inputCls}
                value={settings.eyebrow}
                onChange={(e) => patchSettings({ eyebrow: e.target.value })}
              />
            </Field>
            <Field label="Headline">
              <input
                className={inputCls}
                value={settings.headline}
                onChange={(e) => patchSettings({ headline: e.target.value })}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Subheadline">
                <textarea
                  className={textareaCls}
                  rows={2}
                  value={settings.subheadline ?? ""}
                  onChange={(e) => patchSettings({ subheadline: e.target.value })}
                />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Mission">
                <textarea
                  className={textareaCls}
                  rows={3}
                  value={settings.mission ?? ""}
                  onChange={(e) => patchSettings({ mission: e.target.value })}
                />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Vision">
                <textarea
                  className={textareaCls}
                  rows={3}
                  value={settings.vision ?? ""}
                  onChange={(e) => patchSettings({ vision: e.target.value })}
                />
              </Field>
            </div>
            <Field label="CTA label">
              <input
                className={inputCls}
                value={settings.cta_label ?? ""}
                onChange={(e) => patchSettings({ cta_label: e.target.value })}
              />
            </Field>
            <Field label="CTA link">
              <input
                className={inputCls}
                value={settings.cta_href ?? ""}
                onChange={(e) => patchSettings({ cta_href: e.target.value })}
              />
            </Field>
            <Field label="Donate label (optional)">
              <input
                className={inputCls}
                value={settings.donate_label ?? ""}
                onChange={(e) => patchSettings({ donate_label: e.target.value })}
              />
            </Field>
            <Field label="Donate link">
              <input
                className={inputCls}
                value={settings.donate_href ?? ""}
                onChange={(e) => patchSettings({ donate_href: e.target.value })}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Hero image">
                <div className="flex flex-wrap items-center gap-3">
                  {settings.hero_image_url && (
                    <img
                      src={settings.hero_image_url}
                      alt=""
                      className="h-24 w-36 rounded-2xl border border-plum/10 object-cover"
                    />
                  )}
                  <ImageUploader
                    folder="foundation"
                    label={settings.hero_image_url ? "Replace hero" : "Upload hero"}
                    onUploaded={async (urls) => {
                      patchSettings({ hero_image_url: urls[0] });
                      await supabase
                        .from("foundation_settings" as never)
                        .update({ hero_image_url: urls[0] } as never)
                        .eq("id", settings.id);
                      flash("Hero updated");
                    }}
                  />
                </div>
              </Field>
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <PillButton onClick={() => void saveSettings()}>Save page</PillButton>
          </div>
          <div className="mt-8">
            <GreekTranslationPanel
              entityType="foundation_settings"
              entityId={settings.id}
              englishPreview={{
                eyebrow: settings.eyebrow,
                headline: settings.headline,
                subheadline: settings.subheadline ?? "",
                mission: settings.mission ?? "",
                vision: settings.vision ?? "",
                cta_label: settings.cta_label ?? "",
                donate_label: settings.donate_label ?? "",
              }}
              fields={[
                { key: "eyebrow", label: "Greek eyebrow", type: "text" },
                { key: "headline", label: "Greek headline", type: "text" },
                { key: "subheadline", label: "Greek subheadline", type: "textarea" },
                { key: "mission", label: "Greek mission", type: "textarea" },
                { key: "vision", label: "Greek vision", type: "textarea" },
                { key: "cta_label", label: "Greek CTA", type: "text" },
                { key: "donate_label", label: "Greek donate", type: "text" },
              ]}
            />
          </div>
        </section>
      )}

      {/* CATEGORIES */}
      {tab === "categories" && (
        <section className={cardCls}>
          <h2 className="font-display text-xl text-plum">Story categories</h2>
          <p className="mt-1 text-sm text-plum/60">
            Pillars for filters (food, care, community, animals…). Pick one when creating a story.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <input
              value={newCat}
              onChange={(e) => setNewCat(e.target.value)}
              placeholder="New category name"
              className={`${inputCls} max-w-sm`}
              onKeyDown={(e) => e.key === "Enter" && void addCat()}
            />
            <PillButton onClick={() => void addCat()}>
              <Plus className="h-4 w-4" /> Add
            </PillButton>
          </div>
          <ul className="mt-4 space-y-2">
            {cats.map((c, i) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center gap-2 rounded-3xl bg-ivory px-4 py-2 sm:flex-nowrap sm:rounded-full sm:gap-3"
              >
                <input
                  defaultValue={c.name}
                  onBlur={(e) =>
                    e.target.value.trim() &&
                    e.target.value !== c.name &&
                    void renameCat(c.id, e.target.value.trim())
                  }
                  className="w-full min-w-0 flex-1 bg-transparent text-plum focus:outline-none sm:w-auto"
                />
                <div className="ml-auto flex items-center gap-1 sm:ml-0">
                  <button
                    type="button"
                    onClick={() => void moveCat(c.id, -1)}
                    disabled={i === 0}
                    className="grid h-9 w-9 place-items-center rounded-full text-plum/60 disabled:opacity-30"
                    aria-label="Move up"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void moveCat(c.id, 1)}
                    disabled={i === cats.length - 1}
                    className="grid h-9 w-9 place-items-center rounded-full text-plum/60 disabled:opacity-30"
                    aria-label="Move down"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <ConfirmButton onConfirm={() => void delCat(c.id)} message="Delete this category?">
                    Delete
                  </ConfirmButton>
                </div>
              </li>
            ))}
            {cats.length === 0 && !loading && (
              <li className="text-sm text-plum/50">No categories yet.</li>
            )}
          </ul>
        </section>
      )}

      <Toast show={!!toast}>{toast}</Toast>
    </div>
  );
}
