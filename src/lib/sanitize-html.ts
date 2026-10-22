import sanitize from "sanitize-html";

const ALLOWED_TAGS = [
  "p",
  "br",
  "h2",
  "h3",
  "ul",
  "ol",
  "li",
  "a",
  "strong",
  "em",
  "b",
  "i",
  "blockquote",
  "img",
  "span",
];

const ALLOWED_ATTR: Record<string, string[]> = {
  a: ["href", "target", "rel", "title", "class"],
  img: ["src", "alt", "title", "class"],
  span: ["class"],
  p: ["class"],
  h2: ["class"],
  h3: ["class"],
  ul: ["class"],
  ol: ["class"],
  li: ["class"],
  blockquote: ["class"],
};

export function sanitizeHtml(dirty: string): string {
  return sanitize(dirty, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTR,
    allowedSchemes: ["http", "https", "mailto"],
    allowProtocolRelative: false,
  });
}
