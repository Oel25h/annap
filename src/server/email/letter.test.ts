/**
 * Letters to subscribers: the rendered email, its unsubscribe link and
 * List-Unsubscribe headers, and how a Resend batch answer is read. Fetch is
 * stubbed; nothing is sent.
 */
import { afterEach, test } from "node:test";
import assert from "node:assert/strict";

process.env.SUPABASE_URL ??= "http://127.0.0.1:54321";
process.env.SUPABASE_SECRET_KEY ??= "test";
process.env.SUPABASE_PUBLISHABLE_KEY ??= "test";
process.env.SITE_URL = "https://www.example.org";
const { letterEmail, letterFingerprint } = await import("./letter.server");
const { letterText } = await import("./render.server");
const { sendBatchWithResend } = await import("./resend.server");

const letter = {
  subject: "  Autumn   letter ",
  body: '<p>Dear friend,</p><h2>News</h2><ul><li>One</li><li>Two</li></ul><p>Read <a href="/books">the book</a> &amp; <a href="https://example.com/x">more</a>.</p><script>alert(1)</script><img src=x onerror=alert(1)>',
  header_image: "https://cdn.example.org/storage/v1/object/public/media/a.webp",
};
const TOKEN = "6f1c8f2e-1f7a-4a3e-9d55-0b6a8e7c1d22";

test("a subscriber's copy carries their unsubscribe link and one-click headers", () => {
  const email = letterEmail(letter, "en", TOKEN, "Anastasia Patience Ltd");
  assert.equal(email.subject, "Autumn letter");
  assert.equal(
    email.headers["List-Unsubscribe"],
    `<https://www.example.org/api/newsletter/unsubscribe?token=${TOKEN}>`,
  );
  assert.equal(email.headers["List-Unsubscribe-Post"], "List-Unsubscribe=One-Click");
  assert.ok(email.html.includes(`https://www.example.org/unsubscribe?token=${TOKEN}`));
  assert.ok(email.text.includes(`Unsubscribe: https://www.example.org/unsubscribe?token=${TOKEN}`));
  assert.ok(email.text.includes("signed up for my letters"));
});

test("a Greek reader's copy links to the Greek pages and says why in Greek", () => {
  const email = letterEmail(letter, "el", TOKEN, "");
  assert.ok(email.html.includes(`https://www.example.org/el/unsubscribe?token=${TOKEN}`));
  assert.ok(email.html.includes('href="https://www.example.org/el/books"'));
  assert.ok(email.html.includes("Διαγραφή"));
});

test("the body is sanitised, styled inline, and site paths become absolute", () => {
  const email = letterEmail(letter, "en", TOKEN, "");
  assert.ok(!email.html.includes("<script"));
  assert.ok(!email.html.includes("onerror"));
  assert.ok(email.html.includes('href="https://www.example.org/books"'));
  assert.match(email.html, /<h2 style="[^"]+">News<\/h2>/);
  assert.ok(email.html.includes('<img src="https://cdn.example.org/'));
});

test("a test to the admin has no token and no one-click headers", () => {
  const email = letterEmail(letter, "en", null, "");
  assert.deepEqual(email.headers, {});
  assert.ok(email.html.includes('href="https://www.example.org/unsubscribe"'));
});

test("the plain text writes out links and lists", () => {
  const text = letterText(
    '<p>Dear friend,</p><ul><li>One</li><li>Two</li></ul><p>Read <a href="/books">the book</a> &amp; more.</p>',
    "https://www.example.org",
  );
  assert.equal(
    text,
    "Dear friend,\n\n- One\n- Two\n\nRead the book (https://www.example.org/books) & more.",
  );
});

test("any change to subject, body or header image needs a new test", async () => {
  const base = await letterFingerprint(letter);
  assert.equal(await letterFingerprint({ ...letter }), base);
  assert.notEqual(await letterFingerprint({ ...letter, subject: "Other" }), base);
  assert.notEqual(await letterFingerprint({ ...letter, body: `${letter.body} ` }), base);
  assert.notEqual(await letterFingerprint({ ...letter, header_image: null }), base);
});

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

const outgoing = (to: string) => ({
  from: "A <a@example.org>",
  to,
  subject: "S",
  html: "<p>x</p>",
  text: "x",
  headers: { "List-Unsubscribe": "<https://www.example.org/u>" },
  idempotencyKey: "row",
});

test("a batch goes in one permissive request; a refused address fails alone", async () => {
  let seen: { url: string; headers: Headers; body: unknown[] } | null = null;
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    seen = {
      url: String(url),
      headers: new Headers(init.headers),
      body: JSON.parse(String(init.body)),
    };
    return new Response(
      JSON.stringify({
        data: [{ id: "em_1" }, { id: "em_3" }],
        errors: [{ index: 1, message: "Invalid `to` field: nobody@invalid" }],
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  }) as typeof fetch;

  const result = await sendBatchWithResend(
    "re_test",
    [outgoing("a@example.org"), outgoing("bad@@example.org"), outgoing("c@example.org")],
    "batch:abc",
  );
  assert.deepEqual(result[0], { id: "em_1" });
  assert.equal("error" in result[1] && result[1].retryable, false);
  assert.ok("error" in result[1] && !result[1].error.includes("nobody@"), "no address is kept");
  assert.deepEqual(result[2], { id: "em_3" });

  assert.ok(seen!.url.endsWith("/emails/batch"));
  assert.equal(seen!.headers.get("x-batch-validation"), "permissive");
  assert.equal(seen!.headers.get("idempotency-key"), "batch:abc");
  assert.equal(seen!.body.length, 3);
  assert.deepEqual((seen!.body[0] as { headers: unknown }).headers, {
    "List-Unsubscribe": "<https://www.example.org/u>",
  });
});

test("a failed batch request is retried later as a whole", async () => {
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ name: "rate_limit_exceeded", message: "Too many" }), {
      status: 429,
    })) as unknown as typeof fetch;
  await assert.rejects(
    sendBatchWithResend("re_test", [outgoing("a@example.org")], "k"),
    (e: Error & { retryable?: boolean }) => e.retryable === true,
  );
});
