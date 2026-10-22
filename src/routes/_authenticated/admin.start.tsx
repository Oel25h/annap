import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, Eye, EyeOff, Save, GripVertical } from "lucide-react";
import { GreekTranslationPanel } from "@/components/admin/GreekTranslationPanel";
import {
  PillButton,
  Field,
  inputCls,
  textareaCls,
  cardCls,
  ConfirmButton,
  Toast,
  Chip,
} from "@/components/admin/ui";
import { ICON_OPTIONS, StartIcon, SOCIAL_PLATFORMS } from "@/lib/start-icons";
import { SITE_SOCIALS_KEY } from "@/lib/site-socials";

export const Route = createFileRoute("/_authenticated/admin/start")({
  component: StartManager,
});

type Settings = {
  id: string;
  hero_eyebrow: string;
  hero_subtitle: string;
  footer_tag: string;
  featured_enabled: boolean;
  featured_label: string | null;
  featured_sub: string | null;
  featured_href: string | null;
  featured_icon: string;
};
type LinkRow = {
  id: string;
  label: string;
  sub: string | null;
  icon: string;
  href: string | null;
  to_path: string | null;
  is_internal: boolean;
  sort_order: number;
  enabled: boolean;
};
type SocialRow = {
  id: string;
  platform: string;
  url: string;
  sort_order: number;
  enabled: boolean;
};

const INTERNAL_ROUTES = [
  "/",
  "/about",
  "/blog",
  "/books",
  "/masterclasses",
  "/shop",
  "/gallery",
  "/contact",
  "/start",
];

function StartManager() {
  const qc = useQueryClient();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [socials, setSocials] = useState<SocialRow[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function flash(m: string) {
    setToast(m);
    setTimeout(() => setToast(null), 1800);
  }

  async function load() {
    const [{ data: s }, { data: l }, { data: so }] = await Promise.all([
      supabase.from("start_page_settings").select("*").eq("id", "singleton").maybeSingle(),
      supabase.from("start_page_links").select("*").order("sort_order"),
      supabase.from("start_page_socials").select("*").order("sort_order"),
    ]);
    if (s) setSettings(s as Settings);
    setLinks((l ?? []) as LinkRow[]);
    setSocials((so ?? []) as SocialRow[]);
  }
  useEffect(() => {
    load();
  }, []);

  // ── Settings ──
  async function saveSettings() {
    if (!settings) return;
    const { id: _id, ...patch } = settings;
    void _id;
    await supabase.from("start_page_settings").update(patch).eq("id", "singleton");
    flash("Hero saved");
  }

  // ── Links ──
  async function addLink() {
    const nextOrder = (links[links.length - 1]?.sort_order ?? 0) + 10;
    await supabase.from("start_page_links").insert({
      label: "New link",
      sub: "",
      icon: "ArrowRight",
      href: "#",
      is_internal: false,
      sort_order: nextOrder,
      enabled: true,
    });
    await load();
  }
  async function saveLink(l: LinkRow) {
    const { id, ...patch } = l;
    await supabase.from("start_page_links").update(patch).eq("id", id);
    flash("Link saved");
  }
  async function delLink(id: string) {
    await supabase.from("start_page_links").delete().eq("id", id);
    await load();
  }
  async function reorderLinks(ordered: LinkRow[]) {
    const renumbered = ordered.map((l, i) => ({ ...l, sort_order: (i + 1) * 10 }));
    setLinks(renumbered);
    await Promise.all(
      renumbered.map((l) =>
        supabase.from("start_page_links").update({ sort_order: l.sort_order }).eq("id", l.id),
      ),
    );
    flash("Order saved");
  }

  // ── Socials ──
  async function addSocial() {
    const nextOrder = (socials[socials.length - 1]?.sort_order ?? 0) + 10;
    await supabase.from("start_page_socials").insert({
      platform: "instagram",
      url: "#",
      sort_order: nextOrder,
      enabled: true,
    });
    await load();
    qc.invalidateQueries({ queryKey: SITE_SOCIALS_KEY });
  }
  async function saveSocial(s: SocialRow) {
    const { id, ...patch } = s;
    await supabase.from("start_page_socials").update(patch).eq("id", id);
    qc.invalidateQueries({ queryKey: SITE_SOCIALS_KEY });
    flash("Social saved");
  }
  async function delSocial(id: string) {
    await supabase.from("start_page_socials").delete().eq("id", id);
    await load();
    qc.invalidateQueries({ queryKey: SITE_SOCIALS_KEY });
  }
  async function reorderSocials(ordered: SocialRow[]) {
    const renumbered = ordered.map((s, i) => ({ ...s, sort_order: (i + 1) * 10 }));
    setSocials(renumbered);
    await Promise.all(
      renumbered.map((s) =>
        supabase.from("start_page_socials").update({ sort_order: s.sort_order }).eq("id", s.id),
      ),
    );
    qc.invalidateQueries({ queryKey: SITE_SOCIALS_KEY });
    flash("Order saved");
  }

  function patchLink(id: string, patch: Partial<LinkRow>) {
    setLinks((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }
  function patchSocial(id: string, patch: Partial<SocialRow>) {
    setSocials((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  function onLinksDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = links.findIndex((l) => l.id === active.id);
    const newIndex = links.findIndex((l) => l.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    reorderLinks(arrayMove(links, oldIndex, newIndex));
  }
  function onSocialsDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = socials.findIndex((s) => s.id === active.id);
    const newIndex = socials.findIndex((s) => s.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    reorderSocials(arrayMove(socials, oldIndex, newIndex));
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="text-[10px] uppercase tracking-[0.28em] text-plum/60">Start page</div>
        <h1 className="mt-1 font-display text-3xl text-plum">Link-in-bio · /start</h1>
        <p className="mt-2 text-sm text-plum/70">
          Drag the grip on the left of any row to reorder. Social links here also power the footer
          and contact page.
        </p>
      </div>

      {/* HERO + FEATURED */}
      {settings && (
        <section className={cardCls}>
          <h2 className="font-display text-2xl text-plum">Hero &amp; Featured Card</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Hero eyebrow">
              <input
                className={inputCls}
                value={settings.hero_eyebrow}
                onChange={(e) => setSettings({ ...settings, hero_eyebrow: e.target.value })}
              />
            </Field>
            <Field label="Footer tag">
              <input
                className={inputCls}
                value={settings.footer_tag}
                onChange={(e) => setSettings({ ...settings, footer_tag: e.target.value })}
              />
            </Field>
            <Field label="Hero subtitle" hint="Shows under the name">
              <textarea
                className={textareaCls}
                rows={2}
                value={settings.hero_subtitle}
                onChange={(e) => setSettings({ ...settings, hero_subtitle: e.target.value })}
              />
            </Field>
          </div>

          <div className="mt-6 rounded-2xl border border-plum/10 bg-ivory/60 p-5">
            <div className="flex items-center justify-between">
              <div className="font-display text-xl text-plum">Featured card</div>
              <label className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-plum/70">
                <input
                  type="checkbox"
                  checked={settings.featured_enabled}
                  onChange={(e) => setSettings({ ...settings, featured_enabled: e.target.checked })}
                />
                Show on page
              </label>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Label">
                <input
                  className={inputCls}
                  value={settings.featured_label ?? ""}
                  onChange={(e) => setSettings({ ...settings, featured_label: e.target.value })}
                />
              </Field>
              <Field label="Sub-text">
                <input
                  className={inputCls}
                  value={settings.featured_sub ?? ""}
                  onChange={(e) => setSettings({ ...settings, featured_sub: e.target.value })}
                />
              </Field>
              <Field label="Link (URL)">
                <input
                  className={inputCls}
                  value={settings.featured_href ?? ""}
                  onChange={(e) => setSettings({ ...settings, featured_href: e.target.value })}
                />
              </Field>
              <Field label="Icon">
                <select
                  className={inputCls}
                  value={settings.featured_icon}
                  onChange={(e) => setSettings({ ...settings, featured_icon: e.target.value })}
                >
                  {ICON_OPTIONS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            <PillButton onClick={saveSettings}>
              <Save className="h-3.5 w-3.5" /> Save hero
            </PillButton>
          </div>
        </section>
      )}

      {/* LINKS */}
      <section className={cardCls}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl text-plum">Links</h2>
            <p className="mt-1 text-sm text-plum/60">
              Drag to reorder. This is the order visitors see.
            </p>
          </div>
          <PillButton onClick={addLink}>
            <Plus className="h-3.5 w-3.5" /> Add link
          </PillButton>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onLinksDragEnd}>
          <SortableContext items={links.map((l) => l.id)} strategy={verticalListSortingStrategy}>
            <div className="mt-5 space-y-4">
              {links.map((l) => (
                <SortableLinkCard
                  key={l.id}
                  l={l}
                  onPatch={(p) => patchLink(l.id, p)}
                  onSave={() => saveLink(l)}
                  onToggle={() => {
                    patchLink(l.id, { enabled: !l.enabled });
                    saveLink({ ...l, enabled: !l.enabled });
                  }}
                  onDelete={() => delLink(l.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </section>

      {/* SOCIALS */}
      <section className={cardCls}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl text-plum">Social icons</h2>
            <p className="mt-1 text-sm text-plum/60">
              These show on the Start page, footer, and contact page. Paste the full link.
            </p>
          </div>
          <PillButton onClick={addSocial}>
            <Plus className="h-3.5 w-3.5" /> Add social
          </PillButton>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onSocialsDragEnd}
        >
          <SortableContext items={socials.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            <div className="mt-5 space-y-3">
              {socials.map((so) => (
                <SortableSocialRow
                  key={so.id}
                  s={so}
                  onPatch={(p) => patchSocial(so.id, p)}
                  onSave={() => saveSocial(so)}
                  onToggle={() => {
                    patchSocial(so.id, { enabled: !so.enabled });
                    saveSocial({ ...so, enabled: !so.enabled });
                  }}
                  onDelete={() => delSocial(so.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </section>

      <Toast show={!!toast}>{toast}</Toast>
    </div>
  );
}

function DragHandle({
  attributes,
  listeners,
}: {
  attributes: React.HTMLAttributes<HTMLButtonElement>;
  listeners: React.HTMLAttributes<HTMLButtonElement> | undefined;
}) {
  return (
    <button
      type="button"
      aria-label="Drag to reorder"
      className="grid h-9 w-6 shrink-0 cursor-grab place-items-center rounded text-plum/40 hover:text-plum active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      <GripVertical className="h-4 w-4" />
    </button>
  );
}

function SortableLinkCard({
  l,
  onPatch,
  onSave,
  onToggle,
  onDelete,
}: {
  l: LinkRow;
  onPatch: (p: Partial<LinkRow>) => void;
  onSave: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: l.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-2xl border border-plum/10 bg-ivory/60 p-5"
    >
      <div className="flex items-center gap-3">
        <DragHandle
          attributes={attributes as React.HTMLAttributes<HTMLButtonElement>}
          listeners={listeners as React.HTMLAttributes<HTMLButtonElement> | undefined}
        />
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-burgundy/12 text-burgundy">
          <StartIcon name={l.icon} className="h-4 w-4" />
        </span>
        <div className="flex-1 font-display text-lg text-plum truncate">
          {l.label || "Untitled"}
        </div>
        {l.enabled ? <Chip tone="success">Visible</Chip> : <Chip tone="warn">Hidden</Chip>}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field label="Label">
          <input
            className={inputCls}
            value={l.label}
            onChange={(e) => onPatch({ label: e.target.value })}
          />
        </Field>
        <Field label="Sub-text">
          <input
            className={inputCls}
            value={l.sub ?? ""}
            onChange={(e) => onPatch({ sub: e.target.value })}
          />
        </Field>
        <Field label="Icon">
          <select
            className={inputCls}
            value={l.icon}
            onChange={(e) => onPatch({ icon: e.target.value })}
          >
            {ICON_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Link type">
          <select
            className={inputCls}
            value={l.is_internal ? "internal" : "external"}
            onChange={(e) => onPatch({ is_internal: e.target.value === "internal" })}
          >
            <option value="external">External URL</option>
            <option value="internal">Internal page</option>
          </select>
        </Field>
        {l.is_internal ? (
          <Field label="Internal route">
            <select
              className={inputCls}
              value={l.to_path ?? ""}
              onChange={(e) => onPatch({ to_path: e.target.value })}
            >
              <option value="">— choose —</option>
              {INTERNAL_ROUTES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </Field>
        ) : (
          <Field label="URL" hint="Paste the full https:// link">
            <input
              className={inputCls}
              value={l.href ?? ""}
              onChange={(e) => onPatch({ href: e.target.value })}
            />
          </Field>
        )}
      </div>

      <div className="mt-4">
        <GreekTranslationPanel
          entityType="start_link"
          entityId={l.id}
          englishPreview={{ label: l.label, sub: l.sub ?? "" }}
          fields={[
            { key: "label", label: "Greek label", type: "text" },
            { key: "sub", label: "Greek sub-text", type: "text" },
          ]}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <PillButton size="sm" onClick={onSave}>
          <Save className="h-3.5 w-3.5" /> Save
        </PillButton>
        <PillButton size="sm" variant="outline" onClick={onToggle}>
          {l.enabled ? (
            <>
              <EyeOff className="h-3.5 w-3.5" /> Hide
            </>
          ) : (
            <>
              <Eye className="h-3.5 w-3.5" /> Show
            </>
          )}
        </PillButton>
        <ConfirmButton onConfirm={onDelete} message="Delete this link?">
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </ConfirmButton>
      </div>
    </div>
  );
}

function SortableSocialRow({
  s,
  onPatch,
  onSave,
  onToggle,
  onDelete,
}: {
  s: SocialRow;
  onPatch: (p: Partial<SocialRow>) => void;
  onSave: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: s.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="grid gap-3 rounded-2xl border border-plum/10 bg-ivory/60 p-4 sm:grid-cols-[auto_160px_1fr_auto] sm:items-center"
    >
      <DragHandle
        attributes={attributes as React.HTMLAttributes<HTMLButtonElement>}
        listeners={listeners as React.HTMLAttributes<HTMLButtonElement> | undefined}
      />
      <Field label="Platform">
        <select
          className={inputCls}
          value={s.platform}
          onChange={(e) => onPatch({ platform: e.target.value })}
        >
          {SOCIAL_PLATFORMS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </Field>
      <Field label="URL">
        <input
          className={inputCls}
          value={s.url}
          onChange={(e) => onPatch({ url: e.target.value })}
          placeholder="https://..."
        />
      </Field>
      <div className="flex flex-wrap items-center gap-2">
        <PillButton size="sm" onClick={onSave}>
          <Save className="h-3.5 w-3.5" /> Save
        </PillButton>
        <PillButton size="sm" variant="outline" onClick={onToggle}>
          {s.enabled ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </PillButton>
        <ConfirmButton onConfirm={onDelete} message="Delete this social?">
          <Trash2 className="h-3.5 w-3.5" />
        </ConfirmButton>
      </div>
    </div>
  );
}
