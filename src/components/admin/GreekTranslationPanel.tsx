import { useEffect, useState } from "react";
import { PillButton, Chip, Field, inputCls, cardCls } from "@/components/admin/ui";
import { RichEditor } from "@/components/admin/RichEditor";
import {
  generateGreekDraft,
  saveGreekTranslation,
  setGreekApproval,
} from "@/lib/translate.functions";
import { getTranslationRow, type EntityType } from "@/lib/i18n/translations";

type FieldDef =
  | { key: string; label: string; type: "text" | "textarea" }
  | { key: string; label: string; type: "rich"; folder?: string };

export function GreekTranslationPanel({
  entityType,
  entityId,
  fields,
  englishPreview,
}: {
  entityType: EntityType;
  entityId: string | undefined;
  fields: FieldDef[];
  englishPreview?: Record<string, string>;
}) {
  const [status, setStatus] = useState<"none" | "draft" | "approved" | "stale">("none");
  const [values, setValues] = useState<Record<string, string>>({});
  const [sourceHash, setSourceHash] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!entityId) return;
    void getTranslationRow(entityType, entityId).then((row) => {
      if (!row) {
        setStatus("none");
        setValues({});
        setSourceHash(null);
        return;
      }
      setValues(row.fields ?? {});
      setSourceHash(row.source_hash);
      setStatus(row.status === "approved" ? "approved" : "draft");
    });
  }, [entityType, entityId]);

  if (!entityId) {
    return (
      <div className={cardCls + " text-sm text-plum/60"}>
        Save the English content first, then generate a Greek draft.
      </div>
    );
  }

  async function generate() {
    setBusy(true);
    setErr(null);
    try {
      const row = await generateGreekDraft({ data: { entityType, entityId: entityId! } });
      setValues((row.fields as Record<string, string>) ?? {});
      setSourceHash(row.source_hash as string | null);
      setStatus("draft");
      setToast("Greek draft generated — please proofread.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setBusy(false);
    }
  }

  async function save(approve: boolean) {
    setBusy(true);
    setErr(null);
    try {
      const row = await saveGreekTranslation({
        data: { entityType, entityId: entityId!, fields: values, approve },
      });
      setStatus(row.status === "approved" ? "approved" : "draft");
      setToast(approve ? "Greek approved — live on /el" : "Greek draft saved");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function unapprove() {
    setBusy(true);
    setErr(null);
    try {
      await setGreekApproval({ data: { entityType, entityId: entityId!, approve: false } });
      setStatus("draft");
      setToast("Greek unapproved — /el will fall back to English");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={cardCls + " space-y-5"}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl text-plum">Greek (EL)</h2>
          <p className="mt-1 text-xs text-plum/55">
            Generate a draft, proofread, then approve for the public /el site.
            {sourceHash ? ` · hash ${sourceHash.slice(0, 8)}…` : ""}
          </p>
        </div>
        <Chip tone={status === "approved" ? "success" : status === "draft" ? "warn" : "default"}>
          {status === "none" ? "No draft" : status}
        </Chip>
      </div>

      {englishPreview && (
        <details className="rounded-2xl bg-bone/50 px-4 py-3 text-sm text-plum/70">
          <summary className="cursor-pointer text-[11px] uppercase tracking-[0.2em] text-plum/55">
            English source preview
          </summary>
          <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap text-xs">
            {JSON.stringify(englishPreview, null, 2)}
          </pre>
        </details>
      )}

      {fields.map((f) => (
        <Field key={f.key} label={f.label}>
          {f.type === "rich" ? (
            <RichEditor
              value={values[f.key] ?? ""}
              onChange={(html) => setValues((v) => ({ ...v, [f.key]: html }))}
              folder={f.folder ?? "translations"}
            />
          ) : f.type === "textarea" ? (
            <textarea
              value={values[f.key] ?? ""}
              onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
              rows={4}
              className={inputCls}
            />
          ) : (
            <input
              value={values[f.key] ?? ""}
              onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
              className={inputCls}
            />
          )}
        </Field>
      ))}

      {err && (
        <div className="rounded-2xl border border-burgundy/40 bg-burgundy/10 p-3 text-sm text-burgundy">
          {err}
        </div>
      )}
      {toast && <div className="text-sm text-plum/70">{toast}</div>}

      <div className="flex flex-wrap gap-2">
        <PillButton variant="outline" onClick={generate} disabled={busy}>
          {status === "none" ? "Generate Greek draft" : "Regenerate draft"}
        </PillButton>
        <PillButton
          variant="outline"
          onClick={() => save(false)}
          disabled={busy || status === "none"}
        >
          Save draft
        </PillButton>
        <PillButton onClick={() => save(true)} disabled={busy || Object.keys(values).length === 0}>
          Approve Greek
        </PillButton>
        {status === "approved" && (
          <PillButton variant="outline" onClick={unapprove} disabled={busy}>
            Unapprove
          </PillButton>
        )}
      </div>
    </section>
  );
}
