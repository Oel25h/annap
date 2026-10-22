/**
 * Turns a queued email into its subject, HTML and plain text. Her editable
 * words (subject and body, with {placeholders}) come first; the parts that
 * carry data (buttons, download links, receipts) are drawn here. Every value
 * from a form or an order is escaped. The look follows the site: warm ivory,
 * cocoa text, one Tangerine button with a cocoa label.
 */
import { fmt, formatMoney } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locale";
import type { EmailTemplate } from "../outbox.server";
import { EMAIL_COPY } from "./copy.server";

export type Rendered = { subject: string; html: string; text: string };

type Link = { label: string; url: string };
type Line = { title: string; quantity: number; totalCents: number };

export type RenderInput = {
  template: EmailTemplate;
  locale: Locale;
  /** Her words for this template: from the studio, or the default copy. */
  copy: { subject: string; body: string };
  params: Record<string, unknown>;
  /** "Anastasia Patience, Cyprus" plus the legal line, when the studio has one. */
  footer: { legal: string };
  /** Present on letters she sends to subscribers. */
  unsubscribeUrl?: string;
};

const COLOR = {
  page: "#FFF1E6",
  card: "#FFFAF5",
  text: "#3B1F14",
  secondary: "#6B4F44",
  link: "#C2410C",
  action: "#F27329",
  hairline: "#FFB27A",
};
const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "-apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Only https links (and http on a local test site) ever become buttons. */
function safeUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return /^https:\/\/[^\s"<>]+$/i.test(value) ||
    /^http:\/\/(localhost|127\.0\.0\.1)[:/]/.test(value)
    ? value
    : null;
}

function str(value: unknown): string {
  return typeof value === "string" ? value : typeof value === "number" ? String(value) : "";
}

/** The plain-text values a template's {placeholders} may use. */
function placeholderValues(params: Record<string, unknown>): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string" || typeof value === "number") values[key] = String(value);
  }
  return values;
}

/** Fill placeholders; unknown ones become empty rather than showing braces to a reader. */
function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_match, key: string) => values[key] ?? "");
}

const PLACEHOLDER = /\{(\w+)\}/g;

/**
 * Fill a body, dropping a greeting such as "Dear {firstName}," when the name
 * is missing, so nobody reads "Dear ,". Other paragraphs keep their words.
 */
export function fillBody(template: string, values: Record<string, string>): string {
  return template
    .split(/(\n{2,})/)
    .filter((part) => {
      const keys = [...part.matchAll(PLACEHOLDER)].map((match) => match[1]);
      if (keys.length === 0 || keys.some((key) => values[key]?.trim())) return true;
      const words = part.replace(PLACEHOLDER, "").trim();
      return !(words.length <= 24 && /[,!]$/.test(words));
    })
    .map((part) => fill(part, values))
    .join("")
    .replace(/^\n+/, "")
    .replace(/\n{3,}/g, "\n\n");
}

function paragraphsHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((para) => para.trim())
    .filter(Boolean)
    .map(
      (para) =>
        `<p style="margin:0 0 16px;font:17px/1.6 ${SERIF};color:${COLOR.text}">${escapeHtml(para).replace(/\n/g, "<br>")}</p>`,
    )
    .join("");
}

function button(link: Link): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 16px"><tr><td style="border-radius:12px;background:${COLOR.action}"><a href="${escapeHtml(link.url)}" style="display:inline-block;padding:14px 24px;font:600 15px/1.2 ${SANS};color:${COLOR.text};text-decoration:none;border-radius:12px">${escapeHtml(link.label)}</a></td></tr></table>`;
}

function quietLink(link: Link): string {
  return `<p style="margin:0 0 12px;font:600 15px/1.4 ${SANS}"><a href="${escapeHtml(link.url)}" style="color:${COLOR.link}">${escapeHtml(link.label)}</a></p>`;
}

function meta(text: string): string {
  return `<p style="margin:0 0 16px;font:13px/1.5 ${SANS};color:${COLOR.secondary}">${escapeHtml(text)}</p>`;
}

function heading(text: string): string {
  return `<p style="margin:24px 0 8px;font:600 15px/1.4 ${SANS};color:${COLOR.text}">${escapeHtml(text)}</p>`;
}

function links(value: unknown): Link[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const url = safeUrl((item as Link)?.url);
    const label = str((item as Link)?.label);
    return url && label ? [{ label, url }] : [];
  });
}

function lines(value: unknown): Line[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const line = item as Partial<Line>;
    return typeof line.title === "string"
      ? [
          {
            title: line.title,
            quantity: Number(line.quantity) || 1,
            totalCents: Number(line.totalCents) || 0,
          },
        ]
      : [];
  });
}

function receiptHtml(items: Line[], currency: string, totalCents: number | null, locale: Locale) {
  const t = EMAIL_COPY[locale];
  const cell = `padding:10px 0;border-bottom:1px solid ${COLOR.hairline};font:15px/1.4 ${SANS};color:${COLOR.text}`;
  const rows = items
    .map(
      (line) =>
        `<tr><td style="${cell}">${escapeHtml(line.title)}</td><td style="${cell};text-align:center;width:48px">${line.quantity}</td><td style="${cell};text-align:right;width:96px">${escapeHtml(formatMoney(line.totalCents, currency, locale))}</td></tr>`,
    )
    .join("");
  const total =
    totalCents === null
      ? ""
      : `<tr><td style="${cell};font-weight:600;border-bottom:0" colspan="2">${escapeHtml(t.total)}</td><td style="${cell};font-weight:600;text-align:right;border-bottom:0">${escapeHtml(formatMoney(totalCents, currency, locale))}</td></tr>`;
  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:8px 0 16px;border-collapse:collapse"><tr><th style="${cell};text-align:left;font-weight:600">${escapeHtml(t.item)}</th><th style="${cell};font-weight:600">${escapeHtml(t.quantity)}</th><th style="${cell}"></th></tr>${rows}${total}</table>`;
}

function receiptText(items: Line[], currency: string, totalCents: number | null, locale: Locale) {
  const t = EMAIL_COPY[locale];
  const out = items.map(
    (line) => `${line.quantity} × ${line.title}: ${formatMoney(line.totalCents, currency, locale)}`,
  );
  if (totalCents !== null) out.push(`${t.total}: ${formatMoney(totalCents, currency, locale)}`);
  return out.join("\n");
}

function addressLines(value: unknown): string[] {
  if (!value || typeof value !== "object") return [];
  const a = value as Record<string, unknown>;
  return [
    str(a.name),
    str(a.line1),
    str(a.line2),
    [str(a.postal_code), str(a.city)].filter(Boolean).join(" "),
    str(a.state),
    str(a.country),
  ].filter(Boolean);
}

/** The parts of each template that carry data, as HTML and as plain text. */
function blocks(input: RenderInput): { html: string; text: string } {
  const { params, locale } = input;
  const t = EMAIL_COPY[locale];
  const html: string[] = [];
  const text: string[] = [];

  switch (input.template) {
    case "newsletter_confirm": {
      const url = safeUrl(params.confirmUrl);
      if (url) {
        html.push(button({ label: t.confirmButton, url }));
        text.push(`${t.confirmButton}: ${url}`);
      }
      break;
    }
    case "ebook_link": {
      for (const link of links(params.links)) {
        html.push(button(link));
        text.push(`${link.label}: ${link.url}`);
      }
      html.push(meta(t.downloadsNote));
      text.push(t.downloadsNote);
      break;
    }
    case "waitlist_confirm": {
      const url = safeUrl(params.url);
      if (url) {
        html.push(quietLink({ label: t.masterclassButton, url }));
        text.push(`${t.masterclassButton}: ${url}`);
      }
      break;
    }
    case "order_receipt":
    case "order_notification": {
      const currency = str(params.currency) || "EUR";
      const totalCents = typeof params.totalCents === "number" ? params.totalCents : null;
      const items = lines(params.items);
      const number = fmt(t.order, { orderNumber: str(params.orderNumber) });
      html.push(heading(number), receiptHtml(items, currency, totalCents, locale));
      text.push(number, receiptText(items, currency, totalCents, locale));
      if (input.template === "order_notification") {
        const address = addressLines(params.address);
        if (address.length) {
          html.push(
            heading(t.shipTo),
            `<p style="margin:0 0 16px;font:15px/1.5 ${SANS};color:${COLOR.text}">${address.map(escapeHtml).join("<br>")}</p>`,
          );
          text.push(`${t.shipTo}:\n${address.join("\n")}`);
        }
      }
      const downloads = Array.isArray(params.downloads) ? params.downloads : [];
      for (const download of downloads) {
        const title = str((download as { title?: unknown }).title);
        const found = links((download as { links?: unknown }).links);
        if (!found.length) continue;
        html.push(heading(title));
        text.push(title);
        for (const link of found) {
          html.push(button(link));
          text.push(`${link.label}: ${link.url}`);
        }
      }
      if (downloads.length) {
        html.push(meta(t.downloadsNote));
        text.push(t.downloadsNote);
      }
      break;
    }
    case "donation_thanks": {
      const cents = Number(params.amountCents);
      if (Number.isFinite(cents) && cents > 0) {
        const amount = formatMoney(cents, str(params.currency) || "EUR", locale);
        html.push(heading(t.gift), meta(params.monthly ? `${amount} · ${t.monthly}` : amount));
        text.push(`${t.gift}: ${amount}${params.monthly ? ` (${t.monthly})` : ""}`);
      }
      break;
    }
    case "contact_notification": {
      const message = str(params.message);
      html.push(
        `<div style="margin:8px 0 16px;padding:16px;border-left:3px solid ${COLOR.hairline};font:16px/1.6 ${SERIF};color:${COLOR.text};white-space:pre-wrap">${escapeHtml(message)}</div>`,
        meta(t.replyNote),
      );
      text.push(message, t.replyNote);
      break;
    }
    case "contact_autoreply":
      break;
  }
  return { html: html.join(""), text: text.join("\n\n") };
}

export function renderEmail(input: RenderInput): Rendered {
  const t = EMAIL_COPY[input.locale];
  const values = placeholderValues(input.params);
  const subject = fill(input.copy.subject, values).replace(/\s+/g, " ").trim().slice(0, 200);
  const body = fillBody(input.copy.body, values);
  const extra = blocks(input);
  const unsubscribe = safeUrl(input.unsubscribeUrl);

  const footerParts = [t.footer, input.footer.legal].filter(Boolean);
  const footerHtml = [
    ...footerParts.map(escapeHtml),
    ...(unsubscribe
      ? [
          `<a href="${escapeHtml(unsubscribe)}" style="color:${COLOR.secondary}">${escapeHtml(t.unsubscribe)}</a>`,
        ]
      : []),
  ].join("<br>");

  const html = `<!doctype html><html lang="${input.locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${escapeHtml(subject)}</title></head><body style="margin:0;padding:0;background:${COLOR.page}"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLOR.page}"><tr><td align="center" style="padding:32px 16px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${COLOR.card};border:1px solid ${COLOR.hairline};border-radius:12px"><tr><td style="padding:32px 32px 8px;font:600 20px/1.3 ${SERIF};color:${COLOR.text}">Anastasia Patience</td></tr><tr><td style="padding:16px 32px 16px">${paragraphsHtml(body)}${extra.html}</td></tr></table><p style="margin:24px 0 0;font:13px/1.6 ${SANS};color:${COLOR.secondary}">${footerHtml}</p></td></tr></table></body></html>`;

  const text = [
    body.trim(),
    extra.text,
    "--",
    ...footerParts,
    ...(unsubscribe ? [`${t.unsubscribe}: ${unsubscribe}`] : []),
  ]
    .filter(Boolean)
    .join("\n\n");

  return { subject, html, text };
}
