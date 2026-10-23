/**
 * The page builder's confirmations, as native modal dialogs (showModal):
 * focus moves inside, Escape cancels, the backdrop is cocoa-ink-52.
 * Publish lists the changes and names the Greek that is stale or missing;
 * publishing never waits for Greek.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "@/components/site/Icon";
import { SECTION_TYPES, type SectionType } from "@/sections/schemas";
import { typeName, type Change } from "./model";

function Modal({
  open,
  onClose,
  labelledBy,
  children,
}: {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return (
    <dialog className="confirm" ref={ref} aria-labelledby={labelledBy} onClose={onClose}>
      {open ? children : null}
    </dialog>
  );
}

/** "Videos is stale and Stories is missing" from the two lists. */
function greekNote(stale: string[], missing: string[]): string | null {
  const list = (names: string[]) =>
    names.length < 2 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
  const verb = (names: string[]) => (names.length === 1 ? "is" : "are");
  const parts = [
    stale.length ? `${list(stale)} ${verb(stale)} stale` : "",
    missing.length ? `${list(missing)} ${verb(missing)} missing` : "",
  ].filter(Boolean);
  if (!parts.length) return null;
  return `Greek: ${parts.join(" and ")}. Until they are approved, /el shows the English text for them.`;
}

export function PublishDialog({
  open,
  onClose,
  pageTitle,
  changes,
  stale,
  missing,
  onPublish,
}: {
  open: boolean;
  onClose: () => void;
  pageTitle: string;
  changes: Change[];
  stale: string[];
  missing: string[];
  onPublish: () => Promise<string[] | null>;
}) {
  const [busy, setBusy] = useState(false);
  const [problems, setProblems] = useState<string[]>([]);
  useEffect(() => {
    if (open) setProblems([]);
  }, [open]);
  const n = changes.length;
  const note = greekNote(stale, missing);

  async function publish() {
    setBusy(true);
    try {
      const result = await onPublish();
      if (result?.length) setProblems(result);
      else onClose();
    } catch (error) {
      setProblems([error instanceof Error ? error.message : "Publishing didn't work. Try again."]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} labelledBy="publish-title">
      <h2 id="publish-title">
        Publish {n} {n === 1 ? "change" : "changes"} to {pageTitle}?
      </h2>
      <p className="meta">
        They go live on the site straight away. English and Greek publish together.
      </p>
      <ul className="small">
        {changes.map((c) => (
          <li key={`${c.id}-${c.what}`}>
            <span>{c.name}</span>
            <span className="meta">{c.what}</span>
          </li>
        ))}
      </ul>
      {note && <p className="meta">{note}</p>}
      {problems.length > 0 && (
        <div className="form-alert" role="alert">
          <Icon name="alert" />
          <div>
            <p>Nothing was published. First:</p>
            <ul>
              {problems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
      <div className="confirm-actions">
        <button className="btn btn-quiet btn-sm" type="button" onClick={onClose}>
          Cancel
        </button>
        <button
          className="btn btn-primary btn-sm"
          type="button"
          aria-busy={busy}
          onClick={() => void publish()}
        >
          Publish now
        </button>
      </div>
    </Modal>
  );
}

export function DeleteDialog({
  name,
  onClose,
  onDelete,
}: {
  name: string | null;
  onClose: () => void;
  onDelete: () => void;
}) {
  return (
    <Modal open={!!name} onClose={onClose} labelledBy="delete-title">
      <h2 id="delete-title">Delete {name}?</h2>
      <p className="meta">It leaves the draft in English and Greek. Undo brings it back.</p>
      <div className="confirm-actions">
        <button className="btn btn-quiet btn-sm" type="button" onClick={onClose}>
          Cancel
        </button>
        <button
          className="btn btn-quiet btn-sm btn-danger"
          type="button"
          onClick={() => {
            onDelete();
            onClose();
          }}
        >
          <Icon name="trash" />
          Delete {name}
        </button>
      </div>
    </Modal>
  );
}

/** The types a page can add. The home page's opening rows are fixed, so they are not offered. */
const ADDABLE: SectionType[] = SECTION_TYPES.filter(
  (t) => t !== "hero" && t !== "audiobook_player",
);

export function AddSectionDialog({
  open,
  onClose,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (type: SectionType) => void;
}) {
  return (
    <Modal open={open} onClose={onClose} labelledBy="add-title">
      <h2 id="add-title">Add a section</h2>
      <p className="meta">It goes below the selected section, as a draft.</p>
      <ul className="type-list">
        {ADDABLE.map((type) => (
          <li key={type}>
            <button
              className="btn btn-quiet btn-sm btn-block"
              type="button"
              onClick={() => {
                onAdd(type);
                onClose();
              }}
            >
              {typeName(type)}
            </button>
          </li>
        ))}
      </ul>
      <div className="confirm-actions">
        <button className="btn btn-quiet btn-sm" type="button" onClick={onClose}>
          Cancel
        </button>
      </div>
    </Modal>
  );
}
