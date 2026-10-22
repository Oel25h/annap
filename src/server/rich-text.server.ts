/**
 * The one sanitiser for rich text, used on every write and again when a page
 * is served, so text written any other way still renders inert. Rich text
 * allows paragraphs, H2 and H3, lists, quotes, bold, italic and links; links
 * must be https:, mailto:, tel: or a site path.
 */
import sanitize from "sanitize-html";

const SAFE_HREF = /^(https:\/\/|mailto:|tel:|\/(?!\/)|#)/i;

const OPTIONS: sanitize.IOptions = {
  allowedTags: ["p", "br", "h2", "h3", "ul", "ol", "li", "blockquote", "strong", "em", "a"],
  allowedAttributes: { a: ["href", "rel"] },
  allowedSchemes: ["https", "mailto", "tel"],
  allowedSchemesAppliedToAttributes: ["href"],
  allowProtocolRelative: false,
  disallowedTagsMode: "discard",
  transformTags: {
    b: "strong",
    i: "em",
    h1: "h2",
    h4: "h3",
    h5: "h3",
    h6: "h3",
    // Keep the tag name: renaming here confuses sanitize-html's closing tags.
    // An unsafe link keeps its text and loses its href.
    a: (_tagName, attribs) => {
      const href = (attribs.href ?? "").trim();
      const safe: sanitize.Attributes = {};
      if (SAFE_HREF.test(href)) {
        safe.href = href;
        if (/^https:\/\//i.test(href)) safe.rel = "noopener noreferrer";
      }
      return { tagName: "a", attribs: safe };
    },
  },
  exclusiveFilter: (frame) =>
    frame.tag === "p" && !frame.text.trim() && !frame.mediaChildren.length,
};

export function sanitizeRichText(html: string): string {
  return sanitize(html, OPTIONS).trim();
}
