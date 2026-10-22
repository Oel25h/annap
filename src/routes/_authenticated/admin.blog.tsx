import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, Plus, Edit3, ChevronUp, ChevronDown, Eye, EyeOff } from "lucide-react";
import {
  PillButton,
  Field,
  inputCls,
  cardCls,
  ConfirmButton,
  EmptyState,
  Chip,
} from "@/components/admin/ui";
import { ImageUploader } from "@/components/admin/ImageUpload";
import { RichEditor } from "@/components/admin/RichEditor";
import { GreekTranslationPanel } from "@/components/admin/GreekTranslationPanel";

export const Route = createFileRoute("/_authenticated/admin/blog")({
  component: BlogManager,
  validateSearch: (s: Record<string, unknown>) => ({ new: s.new === "1" ? "1" : undefined }),
});

type Post = {
  id: string;
  slug: string;
  title: string;
  category: string;
  cover_url: string | null;
  excerpt: string | null;
  body: string;
  read_time: string | null;
  publish_date: string;
  status: string;
};
type Cat = { id: string; name: string; slug: string; sort_order: number };

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function BlogManager() {
  const search = useSearch({ from: "/_authenticated/admin/blog" });
  const [posts, setPosts] = useState<Post[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [editing, setEditing] = useState<Partial<Post> | null>(null);
  const [busy, setBusy] = useState(false);
  const [newCat, setNewCat] = useState("");

  async function load() {
    const [{ data: p }, { data: c }] = await Promise.all([
      supabase.from("blog_posts").select("*").order("publish_date", { ascending: false }),
      supabase.from("blog_categories").select("*").order("sort_order"),
    ]);
    setPosts((p ?? []) as Post[]);
    setCats((c ?? []) as Cat[]);
  }
  useEffect(() => {
    load();
  }, []);

  function neu() {
    setEditing({
      title: "",
      slug: "",
      category: cats[0]?.name ?? "Personal Stories",
      excerpt: "",
      body: "",
      read_time: "5 min read",
      publish_date: new Date().toISOString().slice(0, 10),
      status: "draft",
      cover_url: null,
    });
  }
  useEffect(() => {
    if (search.new === "1" && !editing) neu(); /* eslint-disable-next-line */
  }, [search.new, cats.length]);

  async function save() {
    if (!editing || !editing.title) return;
    setBusy(true);
    try {
      const payload = { ...editing, slug: editing.slug || slugify(editing.title) };
      if (editing.id)
        await supabase
          .from("blog_posts")
          .update(payload as never)
          .eq("id", editing.id);
      else await supabase.from("blog_posts").insert(payload as never);
      setEditing(null);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function del(id: string) {
    await supabase.from("blog_posts").delete().eq("id", id);
    await load();
  }
  async function togglePublish(p: Post) {
    await supabase
      .from("blog_posts")
      .update({ status: p.status === "published" ? "draft" : "published" })
      .eq("id", p.id);
    await load();
  }

  async function addCat() {
    const n = newCat.trim();
    if (!n) return;
    await supabase
      .from("blog_categories")
      .insert({ name: n, slug: slugify(n) || `cat-${Date.now()}`, sort_order: cats.length });
    setNewCat("");
    await load();
  }
  async function renameCat(id: string, name: string) {
    await supabase.from("blog_categories").update({ name }).eq("id", id);
    await load();
  }
  async function moveCat(id: string, dir: -1 | 1) {
    const i = cats.findIndex((c) => c.id === id);
    const j = i + dir;
    if (j < 0 || j >= cats.length) return;
    await Promise.all([
      supabase
        .from("blog_categories")
        .update({ sort_order: cats[j].sort_order })
        .eq("id", cats[i].id),
      supabase
        .from("blog_categories")
        .update({ sort_order: cats[i].sort_order })
        .eq("id", cats[j].id),
    ]);
    await load();
  }
  async function delCat(id: string) {
    await supabase.from("blog_categories").delete().eq("id", id);
    await load();
  }

  if (editing) {
    return (
      <div className="max-w-3xl space-y-6">
        <button
          onClick={() => setEditing(null)}
          className="text-xs uppercase tracking-[0.22em] text-plum/60 hover:text-plum"
        >
          ← Back to blog
        </button>
        <h1 className="font-display text-4xl text-plum">{editing.id ? "Edit post" : "New post"}</h1>

        <section className={cardCls + " space-y-5"}>
          <Field label="Title">
            <input
              value={editing.title ?? ""}
              onChange={(e) => setEditing({ ...editing, title: e.target.value })}
              className={inputCls}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Category">
              <select
                value={editing.category ?? cats[0]?.name}
                onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                className={inputCls}
              >
                {cats.map((c) => (
                  <option key={c.id}>{c.name}</option>
                ))}
              </select>
            </Field>
            <Field label="URL slug" hint="Auto-generated if blank">
              <input
                value={editing.slug ?? ""}
                onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
                className={inputCls}
              />
            </Field>
          </div>
          <Field label="Cover image">
            <div className="flex flex-wrap items-center gap-3">
              <ImageUploader
                folder="blog"
                label={editing.cover_url ? "Replace image" : "Upload cover"}
                onUploaded={(urls) => setEditing({ ...editing, cover_url: urls[0] })}
              />
              {editing.cover_url && (
                <img src={editing.cover_url} alt="" className="h-24 rounded-2xl object-cover" />
              )}
            </div>
          </Field>
          <Field label="Excerpt" hint="A short summary shown in blog lists">
            <textarea
              rows={3}
              value={editing.excerpt ?? ""}
              onChange={(e) => setEditing({ ...editing, excerpt: e.target.value })}
              className="w-full rounded-3xl border border-plum/15 bg-ivory px-5 py-4 text-plum focus:border-burgundy focus:outline-none"
            />
          </Field>
        </section>

        <section>
          <span className="text-[11px] uppercase tracking-[0.24em] text-plum/70">Body</span>
          <div className="mt-2">
            <RichEditor
              value={editing.body ?? ""}
              onChange={(html) => setEditing({ ...editing, body: html })}
              folder="blog"
            />
          </div>
        </section>

        <section className={cardCls + " grid gap-5 sm:grid-cols-3"}>
          <Field label="Publish date">
            <input
              type="date"
              value={editing.publish_date ?? ""}
              onChange={(e) => setEditing({ ...editing, publish_date: e.target.value })}
              className={inputCls}
            />
          </Field>
          <Field label="Read time">
            <input
              value={editing.read_time ?? ""}
              onChange={(e) => setEditing({ ...editing, read_time: e.target.value })}
              className={inputCls}
            />
          </Field>
          <Field label="Status">
            <select
              value={editing.status}
              onChange={(e) => setEditing({ ...editing, status: e.target.value })}
              className={inputCls}
            >
              <option value="draft">Draft (hidden)</option>
              <option value="published">Published (live)</option>
            </select>
          </Field>
        </section>

        <div className="flex gap-3 pt-2">
          <PillButton onClick={save} disabled={busy}>
            {busy ? "Saving…" : "Save post"}
          </PillButton>
          <PillButton variant="outline" onClick={() => setEditing(null)}>
            Cancel
          </PillButton>
        </div>

        <GreekTranslationPanel
          entityType="blog_post"
          entityId={editing.id}
          englishPreview={{
            title: editing.title ?? "",
            excerpt: editing.excerpt ?? "",
            category: editing.category ?? "",
            body: (editing.body ?? "").slice(0, 400),
          }}
          fields={[
            { key: "title", label: "Greek title", type: "text" },
            { key: "category", label: "Greek category", type: "text" },
            { key: "excerpt", label: "Greek excerpt", type: "textarea" },
            { key: "body", label: "Greek body", type: "rich", folder: "blog" },
          ]}
        />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl text-plum md:text-5xl">Blog</h1>
          <p className="mt-2 text-sm text-ink">
            {posts.length} post{posts.length === 1 ? "" : "s"} · {cats.length} categories
          </p>
        </div>
        <PillButton onClick={neu}>
          <Plus className="h-4 w-4" /> New post
        </PillButton>
      </div>

      <section className={cardCls}>
        <h2 className="font-display text-xl text-plum">Categories</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          <input
            value={newCat}
            onChange={(e) => setNewCat(e.target.value)}
            placeholder="New category name"
            className={`${inputCls} max-w-sm`}
            onKeyDown={(e) => e.key === "Enter" && addCat()}
          />
          <PillButton onClick={addCat}>
            <Plus className="h-4 w-4" /> Add
          </PillButton>
        </div>
        <ul className="mt-4 space-y-2">
          {cats.map((c, i) => (
            <li
              key={c.id}
              className="flex flex-wrap items-center gap-2 rounded-3xl bg-ivory px-4 py-2 sm:rounded-full sm:flex-nowrap sm:gap-3"
            >
              <input
                defaultValue={c.name}
                onBlur={(e) =>
                  e.target.value.trim() &&
                  e.target.value !== c.name &&
                  renameCat(c.id, e.target.value.trim())
                }
                className="w-full min-w-0 flex-1 bg-transparent text-plum focus:outline-none sm:w-auto"
              />
              <div className="ml-auto flex items-center gap-1 sm:ml-0">
                <button
                  onClick={() => moveCat(c.id, -1)}
                  disabled={i === 0}
                  className="grid h-9 w-9 place-items-center rounded-full text-plum/60 disabled:opacity-30"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  onClick={() => moveCat(c.id, 1)}
                  disabled={i === cats.length - 1}
                  className="grid h-9 w-9 place-items-center rounded-full text-plum/60 disabled:opacity-30"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
                <ConfirmButton onConfirm={() => delCat(c.id)} message="Delete this category?">
                  Delete
                </ConfirmButton>
              </div>
            </li>
          ))}
          {cats.length === 0 && <li className="text-sm text-plum/50">No categories yet.</li>}
        </ul>
      </section>

      <div className="grid gap-3">
        {posts.map((p) => (
          <div
            key={p.id}
            className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 rounded-3xl border border-plum/10 bg-bone/50 p-3 soft-shadow sm:flex sm:items-center sm:gap-4 sm:p-4"
          >
            {p.cover_url ? (
              <img
                src={p.cover_url}
                className="h-16 w-16 shrink-0 rounded-2xl object-cover sm:h-20 sm:w-20"
                alt=""
              />
            ) : (
              <div className="h-16 w-16 shrink-0 rounded-2xl bg-plum/8 sm:h-20 sm:w-20" />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <div className="truncate font-display text-base text-plum sm:text-lg">
                  {p.title}
                </div>
                <Chip tone={p.status === "published" ? "success" : "warn"}>{p.status}</Chip>
              </div>
              <div className="mt-1 text-[10px] uppercase tracking-[0.22em] text-plum/50 sm:text-[11px]">
                {p.category} · {new Date(p.publish_date).toLocaleDateString()}
              </div>
            </div>
            <div className="col-span-2 flex flex-wrap items-center gap-2 sm:col-span-1 sm:flex-nowrap">
              <button
                onClick={() => togglePublish(p)}
                className="grid h-9 w-9 place-items-center rounded-full border border-plum/15 text-plum hover:border-burgundy hover:text-burgundy"
                title={p.status === "published" ? "Unpublish" : "Publish"}
              >
                {p.status === "published" ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
              <button
                onClick={() => setEditing(p)}
                className="grid h-9 w-9 place-items-center rounded-full border border-plum/15 text-plum hover:border-burgundy hover:text-burgundy"
              >
                <Edit3 className="h-4 w-4" />
              </button>
              <ConfirmButton onConfirm={() => del(p.id)} message="Delete this post permanently?">
                <Trash2 className="h-3.5 w-3.5" />
              </ConfirmButton>
            </div>
          </div>
        ))}

        {posts.length === 0 && (
          <EmptyState
            title="No posts yet"
            sub="Write your first blog post."
            action={
              <PillButton onClick={neu}>
                <Plus className="h-4 w-4" /> New post
              </PillButton>
            }
          />
        )}
      </div>
    </div>
  );
}
