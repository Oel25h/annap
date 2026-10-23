/**
 * The selected section's settings (DESIGN.md §10, Inspector), in the order
 * the owner needs them: the Stale alert when the Greek needs review, then
 * Content, Source, and Layout (collapsible). In Greek (ΕΛ) the Content
 * fields are the Greek drafts, each under its English source. Greek is
 * saved as a draft and never approved here.
 */
import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "@/components/site/Icon";
import { SECTION_SPACINGS, SECTION_WIDTHS } from "@/sections/schemas";
import {
  changedKeys,
  englishOf,
  sectionName,
  type DraftSection,
  type Json,
  type StudioPage,
} from "./model";
import {
  fieldLabel,
  fieldProblems,
  isContent,
  newItem,
  sectionFields,
  VARIANTS,
  type FieldSpec,
} from "./fields";
import { GreekBadge, VariantDiagram, type Lang } from "./parts";
import type { StudioEditing } from "./useStudioEditing";

type Props = {
  editing: StudioEditing;
  lang: Lang;
  onLang: (lang: Lang) => void;
  options: Pick<StudioPage, "media" | "books">;
  onDelete: (section: DraftSection) => void;
};

type Path = (string | number)[];

function getIn(value: Json, path: Path): Json | undefined {
  let current: Json | undefined = value;
  for (const key of path) {
    if (current === null || typeof current !== "object") return undefined;
    current = (current as Record<string, Json>)[key as never];
  }
  return current;
}

function setIn(value: Json, path: Path, next: Json): Json {
  if (path.length === 0) return next;
  const [key, ...rest] = path;
  if (Array.isArray(value)) {
    const copy = value.slice();
    copy[key as number] = setIn(copy[key as number], rest, next);
    return copy;
  }
  const obj = (value && typeof value === "object" ? value : {}) as Record<string, Json>;
  return { ...obj, [key]: setIn(obj[key as string] ?? null, rest, next) };
}

const WIDTH_LABEL: Record<string, string> = {
  narrow: "Text",
  default: "Wide",
  full: "Edge to edge",
};
const SPACING_LABEL: Record<string, [string, string]> = {
  compact: ["Compact", "64 top · 64 bottom on desktop"],
  default: ["Regular", "96 top · 128 bottom on desktop"],
  generous: ["Generous", "128 top · 128 bottom on desktop"],
};
const BACKGROUNDS: [string, string][] = [
  ["ivory", "Warm ivory"],
  ["cream", "Peach cream"],
];

/** "items.<id>.title" → "Item 2 · Heading"; "primary.label" → "Button · Label". */
function greekKeyLabel(section: DraftSection, key: string): string {
  const parts = key.split(".");
  const item = parts.length === 3 && /^[0-9a-f-]{36}$/.test(parts[1]);
  if (item) {
    const list = section.props[parts[0]];
    const index = Array.isArray(list)
      ? list.findIndex((i) => (i as { id?: string } | null)?.id === parts[1])
      : -1;
    return `Item ${index + 1} · ${fieldLabel(parts[2])}`;
  }
  return parts.map(fieldLabel).join(" · ");
}

/** A text field with "20 of 60 characters", read on demand, never live. */
function TextInput({
  id,
  label,
  value,
  max,
  long,
  lang,
  required,
  problem,
  onChange,
  onLimit,
  source,
}: {
  id: string;
  label: string;
  value: string;
  max?: number;
  long?: boolean;
  lang?: string;
  required?: boolean;
  problem?: string;
  onChange: (value: string) => void;
  onLimit?: (message: string) => void;
  source?: string;
}) {
  const countId = `${id}-count`;
  const problemId = `${id}-problem`;
  const sourceId = `${id}-source`;
  const describedBy =
    [max ? countId : "", problem ? problemId : "", source ? sourceId : ""]
      .filter(Boolean)
      .join(" ") || undefined;
  const props = {
    id,
    className: "input",
    value,
    lang,
    maxLength: max,
    required,
    "aria-describedby": describedBy,
    "aria-invalid": problem ? true : undefined,
  };
  const change = (next: string) => {
    if (max && onLimit) {
      const left = max - next.length;
      if (left === 10 && max - value.length !== 10) onLimit("10 characters left");
      else if (left === 0 && value.length !== max) onLimit("Character limit reached");
    }
    onChange(next);
  };
  return (
    <div className="sfield">
      <div className="field-top">
        <label htmlFor={id}>{label}</label>
        {max ? (
          <span className="meta" id={countId}>
            {value.length} of {max} characters
          </span>
        ) : null}
      </div>
      {source !== undefined && (
        <p className="source-text" id={sourceId} lang="en">
          <span className="sr-only">English: </span>
          {source}
        </p>
      )}
      {long ? (
        <textarea {...props} rows={4} onChange={(e) => change(e.target.value)} />
      ) : (
        <input {...props} type="text" onChange={(e) => change(e.target.value)} />
      )}
      {problem && (
        <p className="field-error" id={problemId}>
          <Icon name="alert" />
          <span>{problem}</span>
        </p>
      )}
    </div>
  );
}

function Switch({
  id,
  label,
  help,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  help?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="switch-row" htmlFor={id}>
      <span>
        <span className="setting-label">{label}</span>
        {help && (
          <span className="meta" id={`${id}-help`}>
            {help}
          </span>
        )}
      </span>
      <span className="switch">
        <input
          id={id}
          type="checkbox"
          role="switch"
          checked={checked}
          aria-describedby={help ? `${id}-help` : undefined}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="switch-track" />
      </span>
    </label>
  );
}

function Field({
  spec,
  base,
  path,
  value,
  problems,
  set,
  options,
  onLimit,
}: {
  spec: FieldSpec;
  base: string;
  path: Path;
  value: Json | undefined;
  problems: Record<string, string>;
  set: (path: Path, value: Json, label: string) => void;
  options: Props["options"];
  onLimit: (message: string) => void;
}) {
  const id = `${base}-f-${path.join("-")}`;
  const problem = problems[path.join(".")];
  const label = spec.label;
  switch (spec.kind) {
    case "text":
    case "rich":
      return (
        <TextInput
          id={id}
          label={spec.kind === "rich" ? `${label} (HTML)` : label}
          value={typeof value === "string" ? value : ""}
          max={spec.kind === "text" && spec.max <= 600 ? spec.max : undefined}
          long={spec.kind === "rich" || spec.long}
          required={spec.kind === "text" && spec.required}
          problem={problem}
          onLimit={onLimit}
          onChange={(v) => set(path, v, `${label.toLowerCase()} change`)}
        />
      );
    case "link": {
      const link = (value && typeof value === "object" ? value : {}) as Record<string, Json>;
      return (
        <fieldset className="setting">
          <legend className="setting-label">{label}</legend>
          <div className="link-pair">
            <TextInput
              id={`${id}-label`}
              label="Link text"
              value={typeof link.label === "string" ? link.label : ""}
              max={60}
              required={spec.required}
              problem={problems[[...path, "label"].join(".")]}
              onLimit={onLimit}
              onChange={(v) => set([...path, "label"], v, `${label.toLowerCase()} change`)}
            />
            <TextInput
              id={`${id}-href`}
              label="Goes to"
              value={typeof link.href === "string" ? link.href : ""}
              problem={problems[[...path, "href"].join(".")]}
              onChange={(v) => set([...path, "href"], v, `${label.toLowerCase()} change`)}
            />
          </div>
        </fieldset>
      );
    }
    case "bool":
      return (
        <Switch
          id={id}
          label={label}
          checked={value === true}
          onChange={(v) => set(path, v, `${label.toLowerCase()} switch`)}
        />
      );
    case "number": {
      const n = typeof value === "number" ? value : spec.min;
      return (
        <div className="sfield inline-setting">
          <span className="setting-label" id={`${id}-label`}>
            {label}
          </span>
          <div className="stepper" role="group" aria-labelledby={`${id}-label`}>
            <button
              type="button"
              aria-label={`Fewer: ${label}`}
              disabled={n <= spec.min}
              onClick={() => set(path, n - 1, `${label.toLowerCase()} change`)}
            >
              <Icon name="minus" />
            </button>
            <output aria-labelledby={`${id}-label`} aria-live="polite">
              {n}
            </output>
            <button
              type="button"
              aria-label={`More: ${label}`}
              disabled={n >= spec.max}
              onClick={() => set(path, n + 1, `${label.toLowerCase()} change`)}
            >
              <Icon name="plus" />
            </button>
          </div>
        </div>
      );
    }
    case "media":
    case "book":
    case "choice": {
      const choices =
        spec.kind === "choice"
          ? spec.options.map((o) => ({ id: o, label: o }))
          : spec.kind === "media"
            ? options.media
            : options.books;
      const current = typeof value === "string" ? value : "";
      return (
        <div className="sfield">
          <label htmlFor={id}>{label}</label>
          <select
            id={id}
            className="input"
            value={current}
            aria-invalid={problem ? true : undefined}
            aria-describedby={problem ? `${id}-problem` : undefined}
            onChange={(e) =>
              set(
                path,
                e.target.value || (spec.kind === "choice" ? "" : null),
                `${label.toLowerCase()} change`,
              )
            }
          >
            {(spec.kind !== "choice" || !current) && (
              <option value="">{spec.kind === "choice" ? "Choose…" : "None"}</option>
            )}
            {current && !choices.some((c) => c.id === current) && (
              <option value={current}>Current choice</option>
            )}
            {choices.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          {problem && (
            <p className="field-error" id={`${id}-problem`}>
              <Icon name="alert" />
              <span>{problem}</span>
            </p>
          )}
        </div>
      );
    }
    case "items": {
      const list = Array.isArray(value) ? value : [];
      return (
        <fieldset className="items">
          <legend className="setting-label">{label}</legend>
          {list.map((item, i) => (
            <div className="item" key={(item as { id?: string } | null)?.id ?? i}>
              <div className="sitem-head">
                <span className="label">Item {i + 1}</span>
                <div className="item-tools">
                  <button
                    className="icon-btn"
                    type="button"
                    aria-label={`Move item ${i + 1} up`}
                    disabled={i === 0}
                    onClick={() => {
                      const next = list.slice();
                      [next[i - 1], next[i]] = [next[i], next[i - 1]];
                      set(path, next, `move item ${i + 1}`);
                    }}
                  >
                    <Icon name="arrow-up" />
                  </button>
                  <button
                    className="icon-btn"
                    type="button"
                    aria-label={`Move item ${i + 1} down`}
                    disabled={i === list.length - 1}
                    onClick={() => {
                      const next = list.slice();
                      [next[i + 1], next[i]] = [next[i], next[i + 1]];
                      set(path, next, `move item ${i + 1}`);
                    }}
                  >
                    <Icon name="arrow-down" />
                  </button>
                  <button
                    className="icon-btn icon-btn--danger"
                    type="button"
                    aria-label={`Remove item ${i + 1}`}
                    disabled={list.length <= spec.min}
                    onClick={() =>
                      set(
                        path,
                        list.filter((_, j) => j !== i),
                        `remove item ${i + 1}`,
                      )
                    }
                  >
                    <Icon name="trash" />
                  </button>
                </div>
              </div>
              {spec.item.map((child) => (
                <Field
                  key={child.key}
                  spec={child}
                  base={base}
                  path={[...path, i, child.key]}
                  value={getIn(item, [child.key])}
                  problems={problems}
                  set={set}
                  options={options}
                  onLimit={onLimit}
                />
              ))}
            </div>
          ))}
          {list.length < spec.max && (
            <button
              className="btn btn-quiet btn-sm"
              type="button"
              onClick={() => set(path, [...list, newItem(spec)], "add item")}
            >
              <Icon name="plus" />
              <span>Add item</span>
            </button>
          )}
        </fieldset>
      );
    }
    default:
      return null;
  }
}

export function Inspector({ editing, lang, onLang, options, onDelete }: Props) {
  const base = useId().replace(/:/g, "");
  const { selected: section, selectedIndex, sections } = editing;
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (
        e instanceof KeyboardEvent
          ? e.key === "Escape"
          : !menuRef.current?.contains(e.target as Node)
      )
        setMenu(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [menu]);

  if (!section) {
    return (
      <section className="inspector" id="inspector" tabIndex={-1} aria-label="Section settings">
        <p className="meta">Choose a section to see its settings.</p>
      </section>
    );
  }

  const name = sectionName(section);
  const locked = editing.isLocked(selectedIndex);
  const specs = sectionFields(section.type);
  const problems = fieldProblems(section);
  const status = editing.statusOf(section);
  const live = editing.live.find((s) => s.id === section.id);
  const changed = !live || JSON.stringify(live) !== JSON.stringify(section);
  const variants = VARIANTS(section.type);
  const hidden = !!section.settings.hidden;

  const set = (path: Path, value: Json, label: string) => {
    const props = setIn(section.props, path, value) as DraftSection["props"];
    editing.replaceSection(
      section.id,
      { ...section, props },
      label,
      `${section.id}:${path.join(".")}`,
    );
  };
  const setLayout = (patch: Partial<DraftSection>, label: string) =>
    editing.replaceSection(section.id, { ...section, ...patch }, label);
  const setSetting = (key: string, value: string, label: string) =>
    setLayout({ settings: { ...section.settings, [key]: value } }, label);

  // The Stale alert: what changed in the English since the Greek was approved.
  const row = editing.greekRow(section.id);
  const english = englishOf(section);
  const was = row?.sourceFields ?? (live ? englishOf(live) : english);
  const diffKey = status === "stale" ? changedKeys(was, english)[0] : undefined;

  const content = specs.filter(isContent);
  const source = specs.filter((s) => !isContent(s) && s.kind !== "fixed");
  const greekValue = (key: string) => {
    const draft = editing.greekDrafts[section.id];
    return draft?.[key] ?? row?.draftFields?.[key] ?? row?.fields[key] ?? "";
  };

  return (
    <section className="inspector" id="inspector" aria-labelledby={`${base}-heading`} tabIndex={-1}>
      <div className="insp-head">
        <div>
          <p className="meta">
            Section {selectedIndex + 1} of {sections.length}
          </p>
          <h2 id={`${base}-heading`} className="title">
            {name}
          </h2>
        </div>
        <div className="more" ref={menuRef}>
          <button
            className="icon-btn"
            type="button"
            aria-label={`More actions for ${name}`}
            aria-expanded={menu}
            aria-controls={`${base}-menu`}
            onClick={() => setMenu((m) => !m)}
          >
            <Icon name="more" />
          </button>
          {menu && (
            <div className="more-menu" id={`${base}-menu`}>
              <button
                type="button"
                disabled={locked}
                onClick={() => {
                  setMenu(false);
                  editing.duplicate(section.id);
                }}
              >
                <Icon name="copy" />
                Duplicate
              </button>
              <button
                type="button"
                disabled={!changed || !live}
                onClick={() => {
                  setMenu(false);
                  editing.revert(section.id);
                }}
              >
                <Icon name="undo" />
                Revert section
              </button>
              <button
                type="button"
                className="danger"
                disabled={locked}
                onClick={() => {
                  setMenu(false);
                  onDelete(section);
                }}
              >
                <Icon name="trash" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {status === "stale" && (
        <section className="alert" aria-labelledby={`${base}-stale`}>
          <div className="alert-top">
            <GreekBadge status="stale" />
            <h3 className="alert-title" id={`${base}-stale`}>
              Greek needs review
            </h3>
          </div>
          {diffKey && (
            <dl className="diff">
              <div>
                <dt>Was</dt>
                <dd lang="en">
                  <del>{was[diffKey] || "(empty)"}</del>
                </dd>
              </div>
              <div>
                <dt>Now</dt>
                <dd lang="en">
                  <ins>{english[diffKey] || "(empty)"}</ins>
                </dd>
              </div>
              <div>
                <dt>Greek</dt>
                <dd lang="el">«{row?.fields[diffKey] ?? ""}»</dd>
              </div>
            </dl>
          )}
          <div className="alert-actions">
            <button className="btn btn-quiet btn-sm" type="button" onClick={() => onLang("el")}>
              <span>Review Greek</span>
              <Icon name="arrow-right" />
            </button>
            <button
              className="btn-text"
              type="button"
              onClick={() => void editing.keepGreek(section.id)}
            >
              Keep as is
            </button>
          </div>
        </section>
      )}

      <form className="insp-form" onSubmit={(e) => e.preventDefault()}>
        {lang === "el" ? (
          <fieldset className="group">
            <legend className="group-title">
              Content <span lang="el">(Ελληνικά)</span>
            </legend>
            {Object.keys(english).length === 0 ? (
              <p className="meta">This section has no text to translate.</p>
            ) : (
              Object.keys(english).map((key) => (
                <TextInput
                  key={key}
                  id={`${base}-el-${key.replace(/\W/g, "-")}`}
                  label={greekKeyLabel(section, key)}
                  lang="el"
                  long={english[key].length > 120}
                  source={english[key]}
                  value={greekValue(key)}
                  onChange={(v) => editing.setGreek(section.id, key, v)}
                />
              ))
            )}
            <p className="meta">
              Saved as a Greek draft. It shows on /el only once a person approves it.
            </p>
          </fieldset>
        ) : (
          <>
            {content.length > 0 && (
              <fieldset className="group">
                <legend className="group-title">Content</legend>
                {content.map((spec) => (
                  <Field
                    key={spec.key}
                    spec={spec}
                    base={base}
                    path={[spec.key]}
                    value={section.props[spec.key]}
                    problems={problems}
                    set={set}
                    options={options}
                    onLimit={editing.setStatus}
                  />
                ))}
              </fieldset>
            )}
            {source.length > 0 && (
              <fieldset className="group">
                <legend className="group-title">Source</legend>
                {source.map((spec) => (
                  <Field
                    key={spec.key}
                    spec={spec}
                    base={base}
                    path={[spec.key]}
                    value={section.props[spec.key]}
                    problems={problems}
                    set={set}
                    options={options}
                    onLimit={editing.setStatus}
                  />
                ))}
              </fieldset>
            )}
          </>
        )}

        <details className="layout" open>
          <summary>
            Layout
            <Icon name="chev-down" />
          </summary>
          <div className="layout-body">
            {variants.length > 1 && (
              <fieldset className="setting">
                <legend className="setting-label">Variant</legend>
                <div className="vtiles">
                  {variants.map((v) => (
                    <label className="vtile" key={v}>
                      <input
                        type="radio"
                        name={`${base}-variant`}
                        value={v}
                        checked={(section.variant ?? variants[0]) === v}
                        onChange={() => setLayout({ variant: v }, `${v.replace(/_/g, " ")} layout`)}
                      />
                      <span className="tile-face">
                        <VariantDiagram variant={v} />
                        <span className="tile-name">
                          {v.charAt(0).toUpperCase() + v.slice(1).replace(/_/g, " ")}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
            <fieldset className="seg-field seg--block setting">
              <legend className="setting-label">Width</legend>
              <div className="seg">
                {SECTION_WIDTHS.map((w) => (
                  <label key={w}>
                    <input
                      type="radio"
                      name={`${base}-width`}
                      value={w}
                      checked={(section.settings.width ?? "default") === w}
                      onChange={() => setSetting("width", w, "width change")}
                    />
                    <span>{WIDTH_LABEL[w]}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="setting">
              <fieldset className="seg-field seg--block">
                <legend className="setting-label">Spacing</legend>
                <div className="seg">
                  {SECTION_SPACINGS.map((sp) => (
                    <label key={sp}>
                      <input
                        type="radio"
                        name={`${base}-spacing`}
                        value={sp}
                        checked={(section.settings.spacing ?? "default") === sp}
                        aria-describedby={`${base}-spacing-note`}
                        onChange={() => setSetting("spacing", sp, "spacing change")}
                      />
                      <span>{SPACING_LABEL[sp][0]}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <p className="meta" id={`${base}-spacing-note`}>
                {SPACING_LABEL[section.settings.spacing ?? "default"]?.[1]}. Phones are always 64 ·
                64.
              </p>
            </div>
            {section.type === "hero" ? (
              <p className="meta">The hero always sits on Warm ivory.</p>
            ) : (
              <fieldset className="setting">
                <legend className="setting-label">Background</legend>
                <div className="swatches">
                  {BACKGROUNDS.map(([value, label]) => (
                    <label className="swatch" key={value}>
                      <input
                        type="radio"
                        name={`${base}-bg`}
                        value={value}
                        checked={(section.settings.background ?? "ivory") === value}
                        onChange={() => setSetting("background", value, "background change")}
                      />
                      <span className="swatch-ring">
                        <span className={`swatch-chip swatch--${value}`}>
                          <Icon name="check" />
                        </span>
                      </span>
                      <span className="swatch-name">{label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
          </div>
        </details>
      </form>

      <div className="insp-foot">
        <span className="meta">
          <Icon name={hidden ? "eye-off" : "eye"} />
          {hidden ? "Hidden in English and Greek" : "Visible in English and Greek"}
        </span>
        <button
          className="btn-text"
          type="button"
          disabled={!changed || !live}
          onClick={() => editing.revert(section.id)}
        >
          Revert section
        </button>
      </div>
    </section>
  );
}
