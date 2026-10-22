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
import { Plus, Trash2, Eye, EyeOff, Save, GripVertical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SOCIAL_PLATFORMS } from "@/lib/start-icons";
import { SITE_SOCIALS_KEY } from "@/lib/site-socials";
import { PillButton, Field, inputCls, ConfirmButton, Toast } from "@/components/admin/ui";

type SocialRow = {
  id: string;
  platform: string;
  url: string;
  sort_order: number;
  enabled: boolean;
};

export function SocialsManager() {
  const qc = useQueryClient();
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
    const { data } = await supabase.from("start_page_socials").select("*").order("sort_order");
    setSocials((data ?? []) as SocialRow[]);
  }
  useEffect(() => {
    load();
  }, []);

  function patchLocal(id: string, patch: Partial<SocialRow>) {
    setSocials((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  async function add() {
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
  async function save(s: SocialRow) {
    const { id, ...patch } = s;
    await supabase.from("start_page_socials").update(patch).eq("id", id);
    qc.invalidateQueries({ queryKey: SITE_SOCIALS_KEY });
    flash("Social saved");
  }
  async function del(id: string) {
    await supabase.from("start_page_socials").delete().eq("id", id);
    await load();
    qc.invalidateQueries({ queryKey: SITE_SOCIALS_KEY });
  }
  async function reorder(ordered: SocialRow[]) {
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

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = socials.findIndex((s) => s.id === active.id);
    const newIndex = socials.findIndex((s) => s.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    reorder(arrayMove(socials, oldIndex, newIndex));
  }

  return (
    <div>
      <div className="flex items-center justify-end">
        <PillButton onClick={add}>
          <Plus className="h-3.5 w-3.5" /> Add social
        </PillButton>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={socials.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <div className="mt-5 space-y-3">
            {socials.length === 0 && (
              <div className="rounded-2xl border border-dashed border-plum/20 bg-bone/40 px-6 py-10 text-center text-sm text-plum/60">
                No socials yet — click "Add social" to add your first.
              </div>
            )}
            {socials.map((so) => (
              <SortableRow
                key={so.id}
                s={so}
                onPatch={(p) => patchLocal(so.id, p)}
                onSave={() => save(so)}
                onToggle={() => {
                  patchLocal(so.id, { enabled: !so.enabled });
                  save({ ...so, enabled: !so.enabled });
                }}
                onDelete={() => del(so.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <Toast show={!!toast}>{toast}</Toast>
    </div>
  );
}

function SortableRow({
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
      <button
        type="button"
        aria-label="Drag to reorder"
        className="grid h-9 w-6 shrink-0 cursor-grab place-items-center rounded text-plum/40 hover:text-plum active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
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
          {s.enabled ? (
            <>
              <EyeOff className="h-3.5 w-3.5" /> Hide
            </>
          ) : (
            <>
              <Eye className="h-3.5 w-3.5" /> Show
            </>
          )}
        </PillButton>
        <ConfirmButton onConfirm={onDelete} message="Delete this social?">
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </ConfirmButton>
      </div>
    </div>
  );
}
