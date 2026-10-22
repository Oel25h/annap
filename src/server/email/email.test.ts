import { test } from "node:test";
import assert from "node:assert/strict";

process.env.SUPABASE_URL ??= "http://127.0.0.1:54321";
process.env.SUPABASE_SECRET_KEY ??= "test";
process.env.SUPABASE_PUBLISHABLE_KEY ??= "test";
const { renderEmail, fillBody, escapeHtml } = await import("./render.server");
const { scrubError, sendWithResend, SendError } = await import("./resend.server");
const { backoffMinutes, MAX_ATTEMPTS } = await import("./drain.server");
const { EMAIL_COPY } = await import("./copy.server");

const footer = { legal: "Anastasia Patience Ltd, Limassol" };

test("values from forms are escaped in the HTML and kept plain in the text", () => {
  const out = renderEmail({
    template: "contact_notification",
    locale: "en",
    copy: EMAIL_COPY.en.templates.contact_notification,
    params: {
      name: "<b>Eve</b>",
      email: "eve@example.com",
      topic: "Talks",
      message: "Hi <script>x</script>",
    },
    footer,
  });
  assert.equal(out.subject, "New message from <b>Eve</b>");
  assert.ok(out.html.includes("&lt;b&gt;Eve&lt;/b&gt;"));
  assert.ok(out.html.includes("Hi &lt;script&gt;x&lt;/script&gt;"));
  assert.ok(!out.html.includes("<script>"));
  assert.ok(out.text.includes("Hi <script>x</script>"));
  assert.ok(out.text.includes("Anastasia Patience Ltd, Limassol"));
});

test("placeholders fill, unknown ones vanish, and a greeting without a name is dropped", () => {
  assert.equal(
    fillBody("Dear {firstName},\n\nThank you for {title}.{nope}", {
      firstName: "Ama",
      title: "the course",
    }),
    "Dear Ama,\n\nThank you for the course.",
  );
  assert.equal(fillBody("Dear {firstName},\n\nThank you.", {}), "Thank you.");
  assert.equal(
    fillBody("Γεια σου {firstName},\n\nΣε ευχαριστώ.", { firstName: " " }),
    "Σε ευχαριστώ.",
  );
  // A sentence that merely uses a missing value keeps its words.
  assert.equal(fillBody("Places open in {title} soon.", {}), "Places open in  soon.");
});

test("only https links become buttons", () => {
  const out = renderEmail({
    template: "newsletter_confirm",
    locale: "en",
    copy: EMAIL_COPY.en.templates.newsletter_confirm,
    params: { confirmUrl: "javascript:alert(1)" },
    footer,
  });
  assert.ok(!out.html.includes("javascript:"));
  const ok = renderEmail({
    template: "newsletter_confirm",
    locale: "el",
    copy: EMAIL_COPY.el.templates.newsletter_confirm,
    params: { confirmUrl: "https://www.anastasiapatience.com/confirm?t=a&b=c" },
    footer,
  });
  assert.ok(ok.html.includes('href="https://www.anastasiapatience.com/confirm?t=a&amp;b=c"'));
  assert.ok(ok.html.includes('lang="el"'));
  assert.ok(ok.text.includes(EMAIL_COPY.el.confirmButton));
});

test("escapeHtml covers quotes", () => {
  assert.equal(escapeHtml(`"a" & 'b'`), "&quot;a&quot; &amp; &#39;b&#39;");
});

test("waits double after each failure and stop after six attempts", () => {
  assert.deepEqual([1, 2, 3, 4, 5].map(backoffMinutes), [5, 10, 20, 40, 80]);
  assert.equal(MAX_ATTEMPTS, 6);
});

test("stored errors never hold an address", () => {
  assert.equal(
    scrubError("422 validation_error Invalid `to` field: ama@example.com\nnot valid"),
    "422 validation_error Invalid `to` field: [address] not valid",
  );
});

test("a bad recipient is final; outages and sender problems are retried", async () => {
  const realFetch = globalThis.fetch;
  const answer = (status: number, body: object) => {
    globalThis.fetch = (async () => new Response(JSON.stringify(body), { status })) as typeof fetch;
  };
  const email = {
    from: "A <a@example.com>",
    to: "b@example.com",
    subject: "s",
    html: "h",
    text: "t",
    idempotencyKey: "k",
  };
  try {
    answer(200, { id: "re_1" });
    assert.equal(await sendWithResend("re_key", email), "re_1");
    const cases: [number, string, boolean][] = [
      [422, "Invalid `to` field. The email address is not valid.", false],
      [422, "Invalid `from` field. The email address needs to follow the format.", true],
      [403, "The example.com domain is not verified.", true],
      [429, "Too many requests", true],
      [500, "Internal error", true],
    ];
    for (const [status, message, retryable] of cases) {
      answer(status, { name: "error", message });
      await assert.rejects(sendWithResend("re_key", email), (error: unknown) => {
        assert.ok(error instanceof SendError);
        assert.equal(error.retryable, retryable, message);
        assert.ok(!error.message.includes("@"));
        return true;
      });
    }
  } finally {
    globalThis.fetch = realFetch;
  }
});
