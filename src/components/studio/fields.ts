/**
 * The inspector's fields, read from each section type's schema, so a new
 * section type gets a working form without studio code of its own. Also
 * builds a new section's starting values and finds each field's problem.
 */
import { z } from "zod";
import { SECTION_SCHEMAS, TRANSLATABLE, type SectionType } from "@/sections/schemas";
import type { DraftSection, Json } from "./model";

export type FieldSpec =
  | { kind: "text"; key: string; label: string; max: number; required: boolean; long: boolean }
  | { kind: "rich"; key: string; label: string; max: number }
  | { kind: "bool"; key: string; label: string }
  | { kind: "number"; key: string; label: string; min: number; max: number }
  | { kind: "link"; key: string; label: string; required: boolean }
  | { kind: "media"; key: string; label: string; required: boolean }
  | { kind: "book"; key: string; label: string; required: boolean }
  | { kind: "choice"; key: string; label: string; options: string[] }
  | { kind: "items"; key: string; label: string; item: FieldSpec[]; min: number; max: number }
  | { kind: "fixed"; key: string; label: string };

/** Plain labels for the props the schemas share. Anything else is its key in words. */
const LABELS: Record<string, string> = {
  title: "Heading",
  accent: "Accent word",
  body: "Text",
  intro: "Introduction",
  lead: "Lead",
  caption: "Caption",
  primary: "Button",
  secondary: "Second link",
  link: "Link",
  channelLink: "Channel link",
  quote: "Quote",
  quoteBy: "Quote by",
  source: "Source",
  attribution: "Attribution",
  listenCta: "Listen button",
  facts: "Facts",
  items: "Items",
  imageMediaId: "Image",
  posterMediaId: "Poster",
  bookId: "Book",
  showEbookGate: "Free eBook form",
  count: "Number shown",
  showCategories: "Show themes",
  paginate: "Every story, page by page",
  buttonLabel: "Button text",
  excerpt: "Excerpt",
  question: "Question",
  answer: "Answer",
  description: "Description",
  featured: "Featured",
  value: "Value",
  label: "Label",
  showPast: "Past events",
  allowMonthly: "Monthly giving",
  shortBio: "Short bio",
  longBio: "Long bio",
  showSocialLinks: "Social links",
  externalId: "Video or map id",
  provider: "Provider",
  pullQuote: "Pull quote",
};

export function fieldLabel(key: string): string {
  if (LABELS[key]) return LABELS[key];
  const words = key.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

type Inner = { schema: z.ZodTypeAny; optional: boolean };

/** Through defaults, nullables and renames to the type underneath. */
function unwrap(schema: z.ZodTypeAny): Inner {
  let optional = false;
  let current = schema;
  for (;;) {
    if (current instanceof z.ZodDefault) {
      optional = true;
      current = current._def.innerType;
    } else if (current instanceof z.ZodOptional || current instanceof z.ZodNullable) {
      optional = true;
      current = current.unwrap();
    } else if (current instanceof z.ZodEffects) {
      current = current.innerType();
    } else return { schema: current, optional };
  }
}

function stringLimits(schema: z.ZodString): { min: number; max: number; uuid: boolean } {
  let min = 0;
  let max = 10_000;
  let uuid = false;
  for (const check of schema._def.checks) {
    if (check.kind === "min") min = check.value;
    if (check.kind === "max") max = check.value;
    if (check.kind === "uuid") uuid = true;
  }
  return { min, max, uuid };
}

function specFor(type: SectionType, key: string, raw: z.ZodTypeAny, path: string): FieldSpec {
  const { schema, optional } = unwrap(raw);
  const label = fieldLabel(key);
  if (schema instanceof z.ZodString) {
    const { min, max, uuid } = stringLimits(schema);
    const required = min > 0 && !optional;
    if (uuid && /MediaId$/.test(key)) return { kind: "media", key, label, required: !optional };
    if (uuid && key === "bookId") return { kind: "book", key, label, required: !optional };
    if (uuid) return { kind: "fixed", key, label };
    if (TRANSLATABLE[type][path] === "rich") return { kind: "rich", key, label, max };
    return { kind: "text", key, label, max, required, long: max > 160 };
  }
  if (schema instanceof z.ZodBoolean) return { kind: "bool", key, label };
  if (schema instanceof z.ZodNumber) {
    let min = 0;
    let max = 100;
    for (const check of schema._def.checks) {
      if (check.kind === "min") min = check.value;
      if (check.kind === "max") max = check.value;
    }
    return { kind: "number", key, label, min, max };
  }
  if (schema instanceof z.ZodEnum) return { kind: "choice", key, label, options: schema.options };
  if (schema instanceof z.ZodObject) {
    const shape = schema.shape as Record<string, z.ZodTypeAny>;
    if ("label" in shape && "href" in shape) {
      const labelMin = unwrap(shape.label).schema;
      const required =
        labelMin instanceof z.ZodString && stringLimits(labelMin).min > 0 && !optional;
      return { kind: "link", key, label, required };
    }
    return { kind: "fixed", key, label };
  }
  if (schema instanceof z.ZodArray) {
    const element = unwrap(schema.element).schema;
    if (element instanceof z.ZodObject && "id" in element.shape) {
      const item = Object.entries(element.shape as Record<string, z.ZodTypeAny>)
        .filter(([k]) => k !== "id")
        .map(([k, s]) => specFor(type, k, s, `${key}[].${k}`));
      return {
        kind: "items",
        key,
        label,
        item,
        min: schema._def.minLength?.value ?? 0,
        max: schema._def.maxLength?.value ?? 50,
      };
    }
  }
  return { kind: "fixed", key, label };
}

const cache = new Map<SectionType, FieldSpec[]>();

/** Every prop of a section type, in schema order. */
export function sectionFields(type: SectionType): FieldSpec[] {
  const cached = cache.get(type);
  if (cached) return cached;
  const props = SECTION_SCHEMAS[type].shape.props as z.ZodObject<z.ZodRawShape>;
  const specs = Object.entries(props.shape as Record<string, z.ZodTypeAny>).map(([key, s]) =>
    specFor(type, key, s, key),
  );
  cache.set(type, specs);
  return specs;
}

/** Content is what the owner writes; source is what the section shows (books, images, switches). */
export function isContent(spec: FieldSpec): boolean {
  return ["text", "rich", "link", "items"].includes(spec.kind);
}

export const VARIANTS = (type: SectionType): readonly string[] => {
  const variant = unwrap(SECTION_SCHEMAS[type].shape.variant as z.ZodTypeAny).schema;
  return variant instanceof z.ZodEnum ? (variant.options as string[]) : [];
};

/** Starting values for a field: its default, or empty. */
function emptyValue(spec: FieldSpec): Json {
  switch (spec.kind) {
    case "bool":
      return false;
    case "number":
      return spec.min;
    case "link":
      return { label: "", href: "" };
    case "media":
    case "book":
      return null;
    case "items":
      return spec.min > 0 ? [newItem(spec)] : [];
    case "choice":
      return spec.options[0] ?? "";
    default:
      return "";
  }
}

export function newItem(spec: Extract<FieldSpec, { kind: "items" }>): { [key: string]: Json } {
  const item: { [key: string]: Json } = { id: crypto.randomUUID() };
  for (const field of spec.item) item[field.key] = emptyValue(field);
  return item;
}

/** A new section of a type, with the schema's defaults and empty text to fill in. */
export function newSection(type: SectionType): DraftSection {
  const schema = SECTION_SCHEMAS[type];
  const props: { [key: string]: Json } = {};
  const shape = (schema.shape.props as z.ZodObject<z.ZodRawShape>).shape as Record<
    string,
    z.ZodTypeAny
  >;
  for (const spec of sectionFields(type)) {
    const field = shape[spec.key];
    const parsed = field.safeParse(undefined);
    props[spec.key] =
      parsed.success && parsed.data !== undefined ? (parsed.data as Json) : emptyValue(spec);
  }
  return {
    id: crypto.randomUUID(),
    type,
    variant: VARIANTS(type)[0],
    settings: {
      hidden: false,
      anchor: "",
      width: "default",
      spacing: "default",
      background: "ivory",
    },
    props,
  };
}

/** The first problem with each prop path (`title`, `items.2.title`), as the publish check sees it. */
export function fieldProblems(section: DraftSection): Record<string, string> {
  const result = SECTION_SCHEMAS[section.type].safeParse(section);
  if (result.success) return {};
  const out: Record<string, string> = {};
  for (const issue of result.error.issues) {
    if (issue.path[0] !== "props") continue;
    const key = issue.path.slice(1).join(".");
    if (!out[key])
      out[key] = issue.code === "too_small" ? "Fill this in to publish." : issue.message;
  }
  return out;
}
