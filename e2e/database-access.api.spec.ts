import { expect, test } from "@playwright/test";

/**
 * What a visitor's browser can and cannot do with the public Supabase key.
 * These guard the row-level security rules in supabase/migrations.
 */
const url = process.env.SUPABASE_URL!;
const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
const rest = (path: string) => `${url}/rest/v1/${path}`;

test.beforeAll(() => {
  expect(url, "SUPABASE_URL is set").toBeTruthy();
  expect(key, "SUPABASE_PUBLISHABLE_KEY is set").toBeTruthy();
});

test("visitors read published content", async ({ request }) => {
  const res = await request.get(rest("books?select=slug,status"), { headers });
  expect(res.status()).toBe(200);
  const rows: { status: string }[] = await res.json();
  expect(rows.every((r) => r.status === "published")).toBe(true);
});

/** A valid row for each table, so a refusal can only come from the security rules. */
const VALID_ROWS: Record<string, object> = {
  subscribers: { email: "visitor@example.com" },
  contact_messages: { name: "Visitor", email: "visitor@example.com", message: "Hello" },
  leads: { first_name: "Visitor", email: "visitor@example.com", consent_version: "v1" },
  orders: { email: "visitor@example.com" },
  donations: { amount_cents: 500 },
  email_outbox: { to_email: "visitor@example.com", template: "test" },
};

for (const [table, row] of Object.entries(VALID_ROWS)) {
  test(`visitors cannot write to ${table} directly`, async ({ request }) => {
    const res = await request.post(rest(table), { headers, data: row });
    expect([401, 403]).toContain(res.status());
  });
}

for (const table of [
  "subscribers",
  "contact_messages",
  "leads",
  "orders",
  "donations",
  "email_outbox",
  "audit_log",
  "download_tokens",
  "preview_tokens",
  "content_versions",
  "content_drafts",
  "book_files",
]) {
  test(`visitors cannot read ${table}`, async ({ request }) => {
    const res = await request.get(rest(`${table}?select=*`), { headers });
    if (res.status() === 200) expect(await res.json()).toEqual([]);
    else expect([401, 403]).toContain(res.status());
  });
}

for (const table of ["integration_secrets", "rate_limits", "stripe_events"]) {
  test(`${table} is invisible to visitors`, async ({ request }) => {
    const res = await request.get(rest(`${table}?select=*`), { headers });
    expect([401, 403]).toContain(res.status());
  });
}

test("visitors read live pages but never drafts", async ({ request }) => {
  const live = await request.get(rest("pages?select=path,sections"), { headers });
  expect(live.status()).toBe(200);
  const drafts = await request.get(rest("content_drafts?select=*"), { headers });
  if (drafts.status() === 200) expect(await drafts.json()).toEqual([]);
  else expect([401, 403]).toContain(drafts.status());
});

test("visitors cannot call admin-only database functions", async ({ request }) => {
  for (const fn of ["publish_draft", "restore_version", "purge_expired", "hit_rate_limit"]) {
    const res = await request.post(rest(`rpc/${fn}`), { headers, data: {} });
    expect(res.ok(), fn).toBe(false);
  }
});

test("visitors cannot list or upload storage files", async ({ request }) => {
  const list = await request.post(`${url}/storage/v1/object/list/media`, {
    headers,
    data: { prefix: "", limit: 10 },
  });
  if (list.status() === 200) expect(await list.json()).toEqual([]);
  const upload = await request.post(`${url}/storage/v1/object/media/visitor.txt`, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "image/png" },
    data: Buffer.from("not an image"),
  });
  expect(upload.ok()).toBe(false);
});

test("signup is closed", async ({ request }) => {
  const res = await request.post(`${url}/auth/v1/signup`, {
    headers,
    data: { email: `visitor-${Date.now()}@example.com`, password: "a-long-password-123" },
  });
  expect(res.ok()).toBe(false);
});
