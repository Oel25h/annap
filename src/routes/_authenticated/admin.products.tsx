import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, Plus, Edit3, ChevronUp, ChevronDown, Star, StarOff } from "lucide-react";
import {
  PillButton,
  Field,
  inputCls,
  textareaCls,
  cardCls,
  ConfirmButton,
  EmptyState,
  Chip,
} from "@/components/admin/ui";
import { ImageUploader } from "@/components/admin/ImageUpload";
import { GreekTranslationPanel } from "@/components/admin/GreekTranslationPanel";

export const Route = createFileRoute("/_authenticated/admin/products")({
  component: ProductsManager,
  validateSearch: (s: Record<string, unknown>) => ({ new: s.new === "1" ? "1" : undefined }),
});

type Cat = { id: string; name: string; slug: string; sort_order: number };
type P = {
  id: string;
  slug: string;
  name: string;
  image_url: string | null;
  description: string | null;
  who_for: string | null;
  included: string | null;
  price: string | null;
  sale_price: string | null;
  product_type: string;
  checkout_url: string | null;
  status: string;
  sort_order: number;
  category_id: string | null;
  stock_note: string | null;
  featured: boolean;
};
type Img = { id: string; product_id: string; image_url: string; sort_order: number };

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function ProductsManager() {
  const search = useSearch({ from: "/_authenticated/admin/products" });
  const [cats, setCats] = useState<Cat[]>([]);
  const [items, setItems] = useState<P[]>([]);
  const [imagesByProduct, setImagesByProduct] = useState<Record<string, Img[]>>({});
  const [editing, setEditing] = useState<Partial<P> | null>(null);
  const [editImages, setEditImages] = useState<Img[]>([]);
  const [busy, setBusy] = useState(false);
  const [newCat, setNewCat] = useState("");
  const [filterCat, setFilterCat] = useState<string>("all");

  async function load() {
    const [{ data: c }, { data: p }, { data: im }] = await Promise.all([
      supabase.from("product_categories").select("*").order("sort_order"),
      supabase.from("products").select("*").order("sort_order"),
      supabase.from("product_images").select("*").order("sort_order"),
    ]);
    setCats((c ?? []) as Cat[]);
    setItems((p ?? []) as P[]);
    const map: Record<string, Img[]> = {};
    for (const row of (im ?? []) as Img[]) (map[row.product_id] ||= []).push(row);
    setImagesByProduct(map);
  }
  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (search.new === "1" && !editing) neu();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.new]);

  function neu() {
    setEditing({
      name: "",
      slug: "",
      description: "",
      included: "",
      who_for: "",
      price: "",
      sale_price: "",
      product_type: "digital",
      status: "published",
      checkout_url: "",
      sort_order: items.length,
      category_id: cats[0]?.id ?? null,
      stock_note: "",
      featured: false,
      image_url: null,
    });
    setEditImages([]);
  }

  async function edit(p: P) {
    setEditing(p);
    setEditImages(imagesByProduct[p.id] ?? []);
  }

  async function save() {
    if (!editing || !editing.name) return;
    setBusy(true);
    try {
      const slug = editing.slug || slugify(editing.name);
      const payload: Partial<P> = { ...editing, slug };
      let id = editing.id;
      if (id)
        await supabase
          .from("products")
          .update(payload as never)
          .eq("id", id);
      else {
        const { data } = await supabase
          .from("products")
          .insert(payload as never)
          .select("id")
          .single();
        id = data?.id as string | undefined;
      }
      if (id) {
        // Replace product_images if any changes were made
        await supabase.from("product_images").delete().eq("product_id", id);
        if (editImages.length) {
          await supabase.from("product_images").insert(
            editImages.map((im, i) => ({
              product_id: id!,
              image_url: im.image_url,
              sort_order: i,
            })),
          );
        }
      }
      setEditing(null);
      setEditImages([]);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function del(id: string) {
    await supabase.from("product_images").delete().eq("product_id", id);
    await supabase.from("products").delete().eq("id", id);
    await load();
  }

  async function toggleFeatured(p: P) {
    await supabase.from("products").update({ featured: !p.featured }).eq("id", p.id);
    await load();
  }

  async function moveProduct(p: P, dir: -1 | 1) {
    const list = items
      .filter((x) => x.category_id === p.category_id)
      .sort((a, b) => a.sort_order - b.sort_order);
    const i = list.findIndex((x) => x.id === p.id);
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    await Promise.all([
      supabase.from("products").update({ sort_order: list[j].sort_order }).eq("id", p.id),
      supabase.from("products").update({ sort_order: p.sort_order }).eq("id", list[j].id),
    ]);
    await load();
  }

  async function addCat() {
    const name = newCat.trim();
    if (!name) return;
    const slug = slugify(name) || `cat-${Date.now()}`;
    await supabase.from("product_categories").insert({ name, slug, sort_order: cats.length });
    setNewCat("");
    await load();
  }
  async function renameCat(id: string, name: string) {
    await supabase.from("product_categories").update({ name }).eq("id", id);
    await load();
  }
  async function moveCat(id: string, dir: -1 | 1) {
    const i = cats.findIndex((c) => c.id === id);
    const j = i + dir;
    if (j < 0 || j >= cats.length) return;
    const a = cats[i],
      b = cats[j];
    await Promise.all([
      supabase.from("product_categories").update({ sort_order: b.sort_order }).eq("id", a.id),
      supabase.from("product_categories").update({ sort_order: a.sort_order }).eq("id", b.id),
    ]);
    await load();
  }
  async function delCat(id: string) {
    await supabase.from("products").update({ category_id: null }).eq("category_id", id);
    await supabase.from("product_categories").delete().eq("id", id);
    await load();
  }

  const filtered = useMemo(
    () => (filterCat === "all" ? items : items.filter((i) => i.category_id === filterCat)),
    [items, filterCat],
  );

  if (editing) {
    return (
      <div className="max-w-3xl space-y-6">
        <button
          onClick={() => {
            setEditing(null);
            setEditImages([]);
          }}
          className="text-xs uppercase tracking-[0.22em] text-plum/60 hover:text-plum"
        >
          ← Back to shop
        </button>
        <h1 className="font-display text-4xl text-plum">
          {editing.id ? "Edit product" : "New product"}
        </h1>

        <section className={cardCls + " space-y-5"}>
          <Field label="Name">
            <input
              value={editing.name ?? ""}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              className={inputCls}
            />
          </Field>
          <Field label="URL slug" hint="Auto-generated from name if left blank">
            <input
              value={editing.slug ?? ""}
              onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
              className={inputCls}
            />
          </Field>
          <Field label="Category">
            <select
              value={editing.category_id ?? ""}
              onChange={(e) => setEditing({ ...editing, category_id: e.target.value || null })}
              className={inputCls}
            >
              <option value="">— Uncategorised —</option>
              {cats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
        </section>

        <section className={cardCls + " space-y-4"}>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] uppercase tracking-[0.24em] text-plum/70">
                Product images
              </span>
              <p className="text-xs text-plum/50">
                The first image is the main cover. Drag order with the arrows.
              </p>
            </div>
            <ImageUploader
              folder="products"
              multiple
              label="Add images"
              onUploaded={(urls) =>
                setEditImages((prev) => [
                  ...prev,
                  ...urls.map((u, i) => ({
                    id: `new-${Date.now()}-${i}`,
                    product_id: editing.id ?? "",
                    image_url: u,
                    sort_order: prev.length + i,
                  })),
                ])
              }
            />
          </div>
          {editImages.length === 0 && (
            <EmptyState title="No images yet" sub="Add one or more product photos." />
          )}
          <div className="grid gap-3 sm:grid-cols-3">
            {editImages.map((im, i) => (
              <div key={im.id} className="relative rounded-2xl overflow-hidden group">
                <img src={im.image_url} className="aspect-square w-full object-cover" alt="" />
                {i === 0 && (
                  <span className="absolute left-2 top-2">
                    <Chip tone="coral">Cover</Chip>
                  </span>
                )}
                <div className="absolute inset-x-0 bottom-0 flex justify-center gap-1 bg-plum/70 p-2 opacity-0 group-hover:opacity-100 transition">
                  <button
                    className="grid h-8 w-8 place-items-center rounded-full bg-ivory text-plum"
                    onClick={() =>
                      setEditImages((prev) => {
                        if (i === 0) return prev;
                        const cp = [...prev];
                        [cp[i - 1], cp[i]] = [cp[i], cp[i - 1]];
                        return cp;
                      })
                    }
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    className="grid h-8 w-8 place-items-center rounded-full bg-ivory text-plum"
                    onClick={() =>
                      setEditImages((prev) => {
                        if (i === prev.length - 1) return prev;
                        const cp = [...prev];
                        [cp[i + 1], cp[i]] = [cp[i], cp[i + 1]];
                        return cp;
                      })
                    }
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <button
                    className="grid h-8 w-8 place-items-center rounded-full bg-ivory text-terracotta"
                    onClick={() => setEditImages((prev) => prev.filter((_, j) => j !== i))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className={cardCls + " space-y-5"}>
          <Field label="Description">
            <textarea
              rows={5}
              value={editing.description ?? ""}
              onChange={(e) => setEditing({ ...editing, description: e.target.value })}
              className={textareaCls}
            />
          </Field>
          <Field label="Who it's for">
            <textarea
              rows={2}
              value={editing.who_for ?? ""}
              onChange={(e) => setEditing({ ...editing, who_for: e.target.value })}
              className={textareaCls}
            />
          </Field>
          <Field label="What's included" hint="One item per line">
            <textarea
              rows={4}
              value={editing.included ?? ""}
              onChange={(e) => setEditing({ ...editing, included: e.target.value })}
              className={textareaCls}
            />
          </Field>
        </section>

        <section className={cardCls + " grid gap-5 sm:grid-cols-2"}>
          <Field label="Price" hint="e.g. €29 or £19">
            <input
              value={editing.price ?? ""}
              onChange={(e) => setEditing({ ...editing, price: e.target.value })}
              className={inputCls}
            />
          </Field>
          <Field label="Sale price (optional)">
            <input
              value={editing.sale_price ?? ""}
              onChange={(e) => setEditing({ ...editing, sale_price: e.target.value })}
              className={inputCls}
            />
          </Field>
          <Field label="Type">
            <select
              value={editing.product_type}
              onChange={(e) => setEditing({ ...editing, product_type: e.target.value })}
              className={inputCls}
            >
              <option value="digital">Digital</option>
              <option value="physical">Physical</option>
            </select>
          </Field>
          <Field label="Status">
            <select
              value={editing.status}
              onChange={(e) => setEditing({ ...editing, status: e.target.value })}
              className={inputCls}
            >
              <option value="published">Published (live)</option>
              <option value="hidden">Hidden (draft)</option>
            </select>
          </Field>
          <Field label="Checkout link" hint="Gumroad, Payhip, Stripe Payment Link, etc.">
            <input
              value={editing.checkout_url ?? ""}
              onChange={(e) => setEditing({ ...editing, checkout_url: e.target.value })}
              className={inputCls}
            />
          </Field>
          {editing.product_type === "physical" && (
            <Field label="Stock note" hint="e.g. Ships in 3–5 days">
              <input
                value={editing.stock_note ?? ""}
                onChange={(e) => setEditing({ ...editing, stock_note: e.target.value })}
                className={inputCls}
              />
            </Field>
          )}
          <label className="flex items-center gap-3 rounded-2xl bg-ivory px-4 py-3 sm:col-span-2">
            <input
              type="checkbox"
              checked={!!editing.featured}
              onChange={(e) => setEditing({ ...editing, featured: e.target.checked })}
              className="h-4 w-4 accent-burgundy"
            />
            <span className="text-sm text-plum">Featured on shop</span>
          </label>
        </section>

        <div className="flex gap-3 pt-2">
          <PillButton onClick={save} disabled={busy}>
            {busy ? "Saving…" : "Save product"}
          </PillButton>
          <PillButton
            variant="outline"
            onClick={() => {
              setEditing(null);
              setEditImages([]);
            }}
          >
            Cancel
          </PillButton>
        </div>

        <GreekTranslationPanel
          entityType="product"
          entityId={editing.id}
          englishPreview={{
            name: editing.name ?? "",
            description: editing.description ?? "",
            who_for: editing.who_for ?? "",
            included: editing.included ?? "",
          }}
          fields={[
            { key: "name", label: "Greek name", type: "text" },
            { key: "description", label: "Greek description", type: "textarea" },
            { key: "who_for", label: "Greek who it's for", type: "textarea" },
            { key: "included", label: "Greek included", type: "textarea" },
          ]}
        />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl text-plum md:text-5xl">Shop</h1>
          <p className="mt-2 text-sm text-ink">
            {items.length} product{items.length === 1 ? "" : "s"} · {cats.length} categories
          </p>
        </div>
        <PillButton onClick={neu}>
          <Plus className="h-4 w-4" /> Add product
        </PillButton>
      </div>

      <section className={cardCls}>
        <h2 className="font-display text-xl text-plum">Categories</h2>
        <p className="mt-1 text-xs text-plum/60">
          Books, eBooks, Courses, Templates, Merch — anything you'd like. Reorder to change how they
          appear on the shop page.
        </p>
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
        <ul className="mt-5 space-y-2">
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
              <span className="text-[10px] uppercase tracking-[0.22em] text-plum/40">
                {items.filter((p) => p.category_id === c.id).length} items
              </span>
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
                <ConfirmButton
                  onConfirm={() => delCat(c.id)}
                  message="Remove category? Products stay but become uncategorised."
                >
                  Delete
                </ConfirmButton>
              </div>
            </li>
          ))}
          {cats.length === 0 && <li className="text-sm text-plum/50">No categories yet.</li>}
        </ul>
      </section>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterCat("all")}
          className={`rounded-full px-4 py-2 text-[10px] uppercase tracking-[0.24em] ${filterCat === "all" ? "bg-plum text-ivory" : "bg-plum/8 text-plum"}`}
        >
          All
        </button>
        {cats.map((c) => (
          <button
            key={c.id}
            onClick={() => setFilterCat(c.id)}
            className={`rounded-full px-4 py-2 text-[10px] uppercase tracking-[0.24em] ${filterCat === c.id ? "bg-plum text-ivory" : "bg-plum/8 text-plum"}`}
          >
            {c.name}
          </button>
        ))}
      </div>

      <div className="grid gap-3">
        {filtered.map((p, i) => {
          const cat = cats.find((c) => c.id === p.category_id);
          const cover = imagesByProduct[p.id]?.[0]?.image_url || p.image_url;
          return (
            <div
              key={p.id}
              className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 rounded-3xl border border-plum/10 bg-bone/50 p-3 soft-shadow sm:flex sm:items-center sm:gap-4 sm:p-4"
            >
              {cover ? (
                <img
                  src={cover}
                  className="h-16 w-16 shrink-0 rounded-2xl object-cover sm:h-20 sm:w-20"
                  alt=""
                />
              ) : (
                <div className="h-16 w-16 shrink-0 rounded-2xl bg-plum/8 sm:h-20 sm:w-20" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="truncate font-display text-base text-plum sm:text-lg">
                    {p.name}
                  </div>
                  {p.featured && <Chip tone="coral">Featured</Chip>}
                  <Chip tone={p.status === "published" ? "success" : "warn"}>{p.status}</Chip>
                </div>
                <div className="mt-1 text-[10px] uppercase tracking-[0.22em] text-plum/50 sm:text-[11px]">
                  {cat?.name ?? "Uncategorised"} · {p.product_type} ·{" "}
                  {p.sale_price ? (
                    <>
                      <s>{p.price}</s> {p.sale_price}
                    </>
                  ) : (
                    (p.price ?? "no price")
                  )}
                </div>
              </div>
              <div className="col-span-2 flex flex-wrap items-center gap-2 sm:col-span-1 sm:flex-nowrap">
                <button
                  onClick={() => moveProduct(p, -1)}
                  disabled={i === 0}
                  className="hidden md:grid h-9 w-9 place-items-center rounded-full border border-plum/15 text-plum/60 disabled:opacity-30"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  onClick={() => moveProduct(p, 1)}
                  disabled={i === filtered.length - 1}
                  className="hidden md:grid h-9 w-9 place-items-center rounded-full border border-plum/15 text-plum/60 disabled:opacity-30"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
                <button
                  onClick={() => toggleFeatured(p)}
                  className="grid h-9 w-9 place-items-center rounded-full border border-plum/15 text-plum"
                  title="Toggle featured"
                >
                  {p.featured ? (
                    <Star className="h-4 w-4 fill-burgundy text-burgundy" />
                  ) : (
                    <StarOff className="h-4 w-4" />
                  )}
                </button>
                <button
                  onClick={() => edit(p)}
                  className="grid h-9 w-9 place-items-center rounded-full border border-plum/15 text-plum hover:border-burgundy hover:text-burgundy"
                >
                  <Edit3 className="h-4 w-4" />
                </button>
                <ConfirmButton onConfirm={() => del(p.id)} message="Delete this product?">
                  <Trash2 className="h-3.5 w-3.5" />
                </ConfirmButton>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <EmptyState
            title="No products yet"
            sub="Add your first item to open the shop."
            action={
              <PillButton onClick={neu}>
                <Plus className="h-4 w-4" /> Add product
              </PillButton>
            }
          />
        )}
      </div>
    </div>
  );
}
