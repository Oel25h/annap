import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Save, Plus, Trash2, BookOpen } from "lucide-react";
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
} from "@/components/admin/ui";
import { ImageUploader } from "@/components/admin/ImageUpload";
import { createBook, deleteBook, updateBook } from "@/lib/books.functions";
import { GreekTranslationPanel } from "@/components/admin/GreekTranslationPanel";

export const Route = createFileRoute("/_authenticated/admin/books")({
  component: BooksAdmin,
});

type Book = {
  id: string;
  slug: string;
  title: string;
  tagline: string | null;
  cover_url: string | null;
  amazon_url: string | null;
  ebook_url: string | null;
  description: string | null;
  who_for: string | null;
  status: string;
  sort_order: number;
};

function BooksAdmin() {
  const [rows, setRows] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const save = useServerFn(updateBook);
  const create = useServerFn(createBook);
  const remove = useServerFn(deleteBook);

  function flash(m: string) {
    setToast(m);
    setTimeout(() => setToast(null), 1800);
  }
  async function load() {
    setLoading(true);
    const { data } = await supabase.from("books").select("*").order("sort_order");
    setRows((data ?? []) as Book[]);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  function patch(id: string, p: Partial<Book>) {
    setRows((prev) => prev.map((b) => (b.id === id ? { ...b, ...p } : b)));
  }
  async function persist(b: Book) {
    await save({
      data: {
        id: b.id,
        patch: {
          title: b.title,
          slug: b.slug,
          tagline: b.tagline,
          cover_url: b.cover_url,
          amazon_url: b.amazon_url,
          ebook_url: b.ebook_url,
          description: b.description,
          who_for: b.who_for,
          status: b.status,
        },
      },
    });
    flash("Book saved");
  }
  async function handleAdd() {
    await create();
    await load();
    flash("Book added");
  }
  async function handleDelete(id: string) {
    await remove({ data: { id } });
    await load();
    flash("Book deleted");
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.28em] text-plum/60">Books</div>
          <h1 className="mt-1 font-display text-3xl text-plum">Book library</h1>
          <p className="mt-2 text-sm text-plum/70">
            Add books, upload covers, and update purchase links — changes appear on the public Books
            page instantly.
          </p>
        </div>
        <PillButton onClick={handleAdd}>
          <Plus className="h-3.5 w-3.5" /> Add book
        </PillButton>
      </div>

      {loading && (
        <div
          className="rounded-3xl border border-plum/10 bg-bone/40 px-6 py-16 text-center text-sm text-plum/55"
          aria-live="polite"
        >
          Loading books…
        </div>
      )}

      {!loading && rows.length === 0 && (
        <EmptyState
          title="No books yet"
          sub="Add your first book to start showing it on your public Books page."
          action={
            <PillButton onClick={handleAdd}>
              <Plus className="h-3.5 w-3.5" /> Add your first book
            </PillButton>
          }
        />
      )}

      {!loading &&
        rows.map((b) => (
          <section key={b.id} className={cardCls}>
            <div className="grid gap-6 md:grid-cols-[220px_1fr]">
              <div>
                <div className="aspect-[3/4] w-full overflow-hidden rounded-2xl border border-plum/10 bg-ivory">
                  {b.cover_url ? (
                    <img src={b.cover_url} alt={b.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-plum/40">
                      <BookOpen className="h-8 w-8" />
                    </div>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <ImageUploader
                    folder="books"
                    label={b.cover_url ? "Replace cover" : "Upload cover"}
                    onUploaded={async (urls) => {
                      patch(b.id, { cover_url: urls[0] });
                      await save({ data: { id: b.id, patch: { cover_url: urls[0] } } });
                      flash("Cover updated");
                    }}
                  />
                  {b.cover_url && (
                    <PillButton
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        patch(b.id, { cover_url: null });
                        await save({ data: { id: b.id, patch: { cover_url: null } } });
                        flash("Cover removed");
                      }}
                    >
                      Remove
                    </PillButton>
                  )}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Title">
                  <input
                    className={inputCls}
                    value={b.title}
                    onChange={(e) => patch(b.id, { title: e.target.value })}
                  />
                </Field>
                <Field label="Slug">
                  <input
                    className={inputCls}
                    value={b.slug}
                    onChange={(e) => patch(b.id, { slug: e.target.value })}
                  />
                </Field>
                <Field label="Tagline">
                  <input
                    className={inputCls}
                    value={b.tagline ?? ""}
                    onChange={(e) => patch(b.id, { tagline: e.target.value })}
                  />
                </Field>
                <Field label="Who it's for">
                  <input
                    className={inputCls}
                    value={b.who_for ?? ""}
                    onChange={(e) => patch(b.id, { who_for: e.target.value })}
                  />
                </Field>
                <Field label="Amazon link">
                  <input
                    className={inputCls}
                    value={b.amazon_url ?? ""}
                    onChange={(e) => patch(b.id, { amazon_url: e.target.value })}
                  />
                </Field>
                <Field label="Ebook link">
                  <input
                    className={inputCls}
                    value={b.ebook_url ?? ""}
                    onChange={(e) => patch(b.id, { ebook_url: e.target.value })}
                  />
                </Field>
                <Field label="Status">
                  <select
                    className={inputCls}
                    value={b.status === "draft" ? "hidden" : b.status}
                    onChange={(e) => patch(b.id, { status: e.target.value })}
                  >
                    <option value="published">Published (visible)</option>
                    <option value="hidden">Hidden (not on public site)</option>
                  </select>
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Description">
                    <textarea
                      className={textareaCls}
                      rows={4}
                      value={b.description ?? ""}
                      onChange={(e) => patch(b.id, { description: e.target.value })}
                    />
                  </Field>
                </div>
                <div className="sm:col-span-2 flex flex-wrap justify-end gap-2">
                  <ConfirmButton onConfirm={() => handleDelete(b.id)} message="Delete this book?">
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </ConfirmButton>
                  <PillButton onClick={() => persist(b)}>
                    <Save className="h-3.5 w-3.5" /> Save
                  </PillButton>
                </div>
                <div className="sm:col-span-2">
                  <GreekTranslationPanel
                    entityType="book"
                    entityId={b.id}
                    englishPreview={{
                      title: b.title,
                      tagline: b.tagline ?? "",
                      description: b.description ?? "",
                      who_for: b.who_for ?? "",
                    }}
                    fields={[
                      { key: "title", label: "Greek title", type: "text" },
                      { key: "tagline", label: "Greek tagline", type: "text" },
                      { key: "who_for", label: "Greek who it's for", type: "text" },
                      { key: "description", label: "Greek description", type: "textarea" },
                    ]}
                  />
                </div>
              </div>
            </div>
          </section>
        ))}

      <Toast show={!!toast}>{toast}</Toast>
    </div>
  );
}
