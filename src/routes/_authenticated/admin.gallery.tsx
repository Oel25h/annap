import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, Plus, ChevronUp, ChevronDown, MoveRight, GripVertical } from "lucide-react";
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
import { GreekTranslationPanel } from "@/components/admin/GreekTranslationPanel";

export const Route = createFileRoute("/_authenticated/admin/gallery")({
  component: GalleryManager,
});

type Section = { id: string; name: string; slug: string; sort_order: number };
type Img = {
  id: string;
  section_id: string | null;
  chapter: string;
  image_url: string;
  caption: string | null;
  sort_order: number;
};

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

function GalleryManager() {
  const [sections, setSections] = useState<Section[]>([]);
  const [images, setImages] = useState<Img[]>([]);
  const [newSection, setNewSection] = useState("");
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    const [{ data: s, error: se }, { data: i, error: ie }] = await Promise.all([
      supabase.from("gallery_sections").select("*").order("sort_order"),
      supabase.from("gallery_images").select("*").order("sort_order"),
    ]);
    if (se || ie) setErr(se?.message || ie?.message || "Failed to load gallery");
    else setErr(null);
    setSections((s ?? []) as Section[]);
    setImages((i ?? []) as Img[]);
  }
  useEffect(() => {
    load();
  }, []);

  async function addSection() {
    const name = newSection.trim();
    if (!name) {
      setErr("Enter a section name before adding (e.g. Family Moments).");
      return;
    }
    setErr(null);
    const slug = slugify(name) || `section-${Date.now()}`;
    const sort_order = sections.length;
    const { error } = await supabase.from("gallery_sections").insert({ name, slug, sort_order });
    if (error) {
      setErr(error.message);
      return;
    }
    setNewSection("");
    await load();
  }

  async function renameSection(id: string, name: string) {
    await supabase.from("gallery_sections").update({ name }).eq("id", id);
    await load();
  }

  async function moveSection(id: string, dir: -1 | 1) {
    const idx = sections.findIndex((s) => s.id === id);
    const j = idx + dir;
    if (j < 0 || j >= sections.length) return;
    const a = sections[idx],
      b = sections[j];
    await Promise.all([
      supabase.from("gallery_sections").update({ sort_order: b.sort_order }).eq("id", a.id),
      supabase.from("gallery_sections").update({ sort_order: a.sort_order }).eq("id", b.id),
    ]);
    await load();
  }

  async function deleteSection(id: string) {
    // Delete photos in section first (cascade would need FK; here we detach and remove images too for a section deletion)
    await supabase.from("gallery_images").delete().eq("section_id", id);
    await supabase.from("gallery_sections").delete().eq("id", id);
    await load();
  }

  async function uploadTo(sectionId: string, urls: string[]) {
    const section = sections.find((s) => s.id === sectionId);
    if (!section) return;
    setErr(null);
    let n = images.filter((i) => i.section_id === sectionId).length;
    const rows = urls.map((u) => ({
      section_id: sectionId,
      chapter: section.name,
      image_url: u,
      sort_order: n++,
    }));
    const { error } = await supabase.from("gallery_images").insert(rows);
    if (error) {
      setErr(error.message);
      return;
    }
    await load();
  }

  async function updateImage(id: string, patch: Partial<Img>) {
    await supabase.from("gallery_images").update(patch).eq("id", id);
    await load();
  }

  async function moveImage(img: Img, dir: -1 | 1) {
    const list = images
      .filter((i) => i.section_id === img.section_id)
      .sort((a, b) => a.sort_order - b.sort_order);
    const idx = list.findIndex((i) => i.id === img.id);
    const j = idx + dir;
    if (j < 0 || j >= list.length) return;
    await Promise.all([
      supabase.from("gallery_images").update({ sort_order: list[j].sort_order }).eq("id", img.id),
      supabase.from("gallery_images").update({ sort_order: img.sort_order }).eq("id", list[j].id),
    ]);
    await load();
  }

  async function moveImageToSection(img: Img, newSectionId: string) {
    const section = sections.find((s) => s.id === newSectionId);
    if (!section) return;
    const nextOrder = images.filter((i) => i.section_id === newSectionId).length;
    await supabase
      .from("gallery_images")
      .update({ section_id: newSectionId, chapter: section.name, sort_order: nextOrder })
      .eq("id", img.id);
    await load();
  }

  async function delImage(id: string) {
    await supabase.from("gallery_images").delete().eq("id", id);
    await load();
  }

  return (
    <div className="space-y-10">
      <header>
        <h1 className="font-display text-4xl text-plum md:text-5xl">Gallery</h1>
        <p className="mt-2 text-sm text-ink">
          {sections.length} section{sections.length === 1 ? "" : "s"} · {images.length} photo
          {images.length === 1 ? "" : "s"}
        </p>
        {err && (
          <p
            className="mt-3 rounded-2xl border border-terracotta/30 bg-terracotta/10 px-4 py-3 text-sm text-terracotta"
            role="alert"
          >
            {err}
          </p>
        )}
      </header>

      <section className={cardCls}>
        <h2 className="font-display text-xl text-plum">Sections</h2>
        <p className="mt-1 text-xs text-plum/60">
          Create the chapters your gallery is organised by. Drag order with the arrows.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <input
            value={newSection}
            onChange={(e) => setNewSection(e.target.value)}
            placeholder="e.g. My Journey, Family, Speaking"
            className={`${inputCls} max-w-sm`}
            onKeyDown={(e) => e.key === "Enter" && addSection()}
          />
          <PillButton onClick={addSection}>
            <Plus className="h-4 w-4" /> Add section
          </PillButton>
        </div>
        <ul className="mt-5 space-y-2">
          {sections.map((s, i) => (
            <li key={s.id} className="flex items-center gap-3 rounded-full bg-ivory px-4 py-2">
              <GripVertical className="h-4 w-4 text-plum/30" />
              <input
                defaultValue={s.name}
                onBlur={(e) =>
                  e.target.value.trim() &&
                  e.target.value !== s.name &&
                  renameSection(s.id, e.target.value.trim())
                }
                className="flex-1 bg-transparent text-plum focus:outline-none"
              />
              <span className="text-[10px] uppercase tracking-[0.22em] text-plum/40">
                {images.filter((i2) => i2.section_id === s.id).length} photos
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => moveSection(s.id, -1)}
                  disabled={i === 0}
                  className="grid h-8 w-8 place-items-center rounded-full text-plum/60 hover:bg-plum/5 disabled:opacity-30"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  onClick={() => moveSection(s.id, 1)}
                  disabled={i === sections.length - 1}
                  className="grid h-8 w-8 place-items-center rounded-full text-plum/60 hover:bg-plum/5 disabled:opacity-30"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
                <ConfirmButton
                  onConfirm={() => deleteSection(s.id)}
                  message="Delete this section and all its photos?"
                >
                  Delete
                </ConfirmButton>
              </div>
            </li>
          ))}
          {sections.length === 0 && (
            <li className="text-sm text-plum/50">No sections yet. Add your first one above.</li>
          )}
        </ul>
      </section>

      {sections.length === 0 ? null : (
        <div className="space-y-10">
          {sections.map((sec) => {
            const imgs = images
              .filter((i) => i.section_id === sec.id)
              .sort((a, b) => a.sort_order - b.sort_order);
            return (
              <section key={sec.id}>
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <Chip tone="coral">Section</Chip>
                    <h2 className="mt-2 font-display text-3xl text-plum">{sec.name}</h2>
                  </div>
                  <ImageUploader
                    folder="gallery"
                    multiple
                    onUploaded={(urls) => uploadTo(sec.id, urls)}
                    label="Upload photos"
                  />
                </div>
                {imgs.length === 0 ? (
                  <div className="mt-4">
                    <EmptyState
                      title="No photos in this section yet"
                      sub="Upload one or more images with the button above."
                    />
                  </div>
                ) : (
                  <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {imgs.map((img, i) => (
                      <div
                        key={img.id}
                        className="rounded-3xl border border-plum/10 bg-bone/50 p-3 soft-shadow"
                      >
                        <img
                          src={img.image_url}
                          alt={img.caption ?? ""}
                          className="aspect-square w-full rounded-2xl object-cover"
                          loading="lazy"
                        />
                        <Field label="Caption">
                          <input
                            defaultValue={img.caption ?? ""}
                            placeholder="Optional"
                            onBlur={(e) => updateImage(img.id, { caption: e.target.value })}
                            className={inputCls}
                          />
                        </Field>
                        <div className="mt-3">
                          <GreekTranslationPanel
                            entityType="gallery_image"
                            entityId={img.id}
                            englishPreview={{
                              caption: img.caption ?? "",
                              chapter: img.chapter ?? "",
                            }}
                            fields={[
                              { key: "caption", label: "Greek caption", type: "text" },
                              { key: "chapter", label: "Greek chapter", type: "text" },
                            ]}
                          />
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <select
                            value={img.section_id ?? ""}
                            onChange={(e) => moveImageToSection(img, e.target.value)}
                            className="flex-1 min-w-[8rem] rounded-full border border-plum/15 bg-ivory px-3 py-2 text-xs text-plum"
                            title="Move to section"
                          >
                            {sections.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => moveImage(img, -1)}
                            disabled={i === 0}
                            className="grid h-8 w-8 place-items-center rounded-full border border-plum/15 text-plum/60 disabled:opacity-30"
                          >
                            <ChevronUp className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => moveImage(img, 1)}
                            disabled={i === imgs.length - 1}
                            className="grid h-8 w-8 place-items-center rounded-full border border-plum/15 text-plum/60 disabled:opacity-30"
                          >
                            <ChevronDown className="h-4 w-4" />
                          </button>
                          <ConfirmButton
                            onConfirm={() => delImage(img.id)}
                            message="Delete this photo?"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </ConfirmButton>
                        </div>
                        <MoveRight className="hidden" />
                      </div>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
