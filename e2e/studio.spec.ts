import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

/**
 * The studio, end to end, as the local test admin: sign in with a password
 * and a six-digit code, edit and publish a page, upload an image, and
 * approve a Greek draft by hand. Everything the tests change is put back.
 *
 * Local Supabase only. Create the admin first with
 * `bash scripts/create-studio-test-admin.sh`; the tests skip themselves if
 * SUPABASE_URL is not a local address.
 */
const url = process.env.SUPABASE_URL ?? "";
const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? "";
const LOCAL = /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?\/?$/.test(url);

const ADMIN = { email: "studio-test@example.test", password: "local-studio-test-1" };
const TOTP_SECRET = "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP";
const CTA = "c0de0030-0000-4000-8000-000000000030";

/** RFC 6238 code for the local test admin's factor. */
function totp(now = Date.now()) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const bits = [...TOTP_SECRET]
    .map((c) => alphabet.indexOf(c).toString(2).padStart(5, "0"))
    .join("");
  const secret = Buffer.from(bits.match(/.{8}/g)!.map((b) => parseInt(b, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(now / 30_000)));
  const h = createHmac("sha1", secret).update(counter).digest();
  const o = h[h.length - 1] & 15;
  return ((h.readUInt32BE(o) & 0x7fffffff) % 1_000_000).toString().padStart(6, "0");
}

test.describe.configure({ mode: "serial" });
test.skip(!LOCAL || !key, "Runs only against the local Supabase stack.");

let page: Page;
let session: { token: string; userId: string };
const errors: string[] = [];

/** The admin's own REST access, for setting up and putting things back. */
function db(request: APIRequestContext) {
  const headers = {
    apikey: key,
    Authorization: `Bearer ${session.token}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };
  const rest = (path: string) => `${url.replace(/\/$/, "")}/rest/v1/${path}`;
  return {
    get: async <T>(path: string): Promise<T[]> => {
      const res = await request.get(rest(path), { headers });
      expect(res.ok(), `GET ${path}`).toBe(true);
      return res.json();
    },
    post: async <T>(path: string, data: object): Promise<T[]> => {
      const res = await request.post(rest(path), { headers, data });
      expect(res.ok(), `POST ${path}`).toBe(true);
      return res.json();
    },
    patch: async (path: string, data: object) => {
      const res = await request.patch(rest(path), { headers, data });
      expect(res.ok(), `PATCH ${path}`).toBe(true);
    },
    del: async (path: string) => {
      const res = await request.delete(rest(path), { headers });
      expect(res.ok(), `DELETE ${path}`).toBe(true);
    },
  };
}

test.beforeAll(async ({ browser }, info) => {
  test.skip(info.project.name !== "desktop", "The studio flow runs once, on desktop.");
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
});

test.afterAll(async () => {
  await page?.context().close();
});

test("the admin signs in with a password and a six-digit code", async () => {
  await page.goto("/auth", { waitUntil: "networkidle" });
  await page.getByLabel("Email").fill(ADMIN.email);
  await page.getByLabel("Password").fill(ADMIN.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  const code = page.getByLabel("Six-digit code");
  await code.waitFor();
  // Start in a fresh 30-second window, so the code can't expire mid-way.
  const left = 30_000 - (Date.now() % 30_000);
  if (left < 5_000) await page.waitForTimeout(left + 500);
  await code.fill(totp());
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForURL(/\/admin\/?$/);
  await expect(page.getByRole("heading", { level: 1, name: "Your studio" })).toBeVisible();

  session = await page.evaluate(() => {
    const raw = Object.entries(localStorage).find(([k]) => /^sb-.*-auth-token$/.test(k))?.[1];
    const parsed = JSON.parse(raw ?? "{}");
    return { token: parsed.access_token as string, userId: parsed.user?.id as string };
  });
  expect(session.token).toBeTruthy();
});

test("an edit to a page waits as a draft, then goes live on Publish", async ({ request }) => {
  const api = db(request);
  // Page ids are generated when the migrations run, so look the page up by its path.
  const [before] = await api.get<{
    id: string;
    sections: { id: string; props: { title: string } }[];
  }>(`pages?path=eq./about&select=id,sections`);
  const ABOUT = before.id;
  const original = before.sections.find((s) => s.id === CTA)!.props.title;
  const edited = `Start with chapter one, today ${Date.now() % 10_000}.`;

  try {
    await page.goto(`/admin/pages/${ABOUT}`, { waitUntil: "networkidle" });
    await page
      .locator("#outline")
      .getByRole("button", { name: /^Call to action/ })
      .click();
    await page.locator("#inspector").getByLabel("Heading", { exact: true }).fill(edited);
    await expect(page.locator(".sbar-status .meta")).toHaveText(/Saved just now/, {
      timeout: 15_000,
    });

    // Saved as a draft: the live page has not changed yet.
    const [draft] = await api.get<{ sections: { id: string; props: { title: string } }[] }>(
      `pages?id=eq.${ABOUT}&select=sections`,
    );
    expect(draft.sections.find((s) => s.id === CTA)!.props.title).toBe(original);

    await page.locator(".publish").click();
    const dialog = page.getByRole("dialog", { name: /Publish/ });
    await dialog.getByRole("button", { name: "Publish now" }).click();
    await dialog.waitFor({ state: "hidden", timeout: 20_000 });

    const [live] = await api.get<{ sections: { id: string; props: { title: string } }[] }>(
      `pages?id=eq.${ABOUT}&select=sections`,
    );
    expect(live.sections.find((s) => s.id === CTA)!.props.title).toBe(edited);

    const visitor = await page.context().newPage();
    await visitor.goto("/about", { waitUntil: "networkidle" });
    await expect(visitor.getByRole("heading", { name: edited })).toBeVisible();
    await visitor.close();
  } finally {
    await api.patch(`pages?id=eq.${ABOUT}`, { sections: before.sections });
    await api.del(`content_drafts?entity_type=eq.page&entity_id=eq.${ABOUT}`);
  }
});

test("an image uploads to the library with its widths, and can be deleted", async ({ request }) => {
  const api = db(request);
  const name = `studio-e2e-${Date.now()}.jpg`;
  await page.goto("/admin/media", { waitUntil: "networkidle" });
  await page.getByTestId("media-upload").setInputFiles({
    name,
    mimeType: "image/jpeg",
    buffer: readFileSync("public/blog-one.jpg"),
  });
  await expect(page.getByText("1 file uploaded.")).toBeAttached({ timeout: 60_000 });

  const [row] = await api.get<{ id: string; bucket: string; variants: { w: number }[] }>(
    `media_assets?original_name=eq.${name}&select=id,bucket,variants`,
  );
  try {
    expect(row.bucket).toBe("media");
    expect(row.variants.map((v) => v.w)).toContain(160);

    await page.goto(`/admin/media?item=${row.id}`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Delete file" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Delete file" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
    expect(await api.get(`media_assets?id=eq.${row.id}&select=id`)).toEqual([]);
  } finally {
    await request.delete(`${url.replace(/\/$/, "")}/rest/v1/media_assets?id=eq.${row?.id}`, {
      headers: { apikey: key, Authorization: `Bearer ${session.token}` },
    });
  }
});

test("Greek is approved only by a person, and records who approved it", async ({ request }) => {
  const api = db(request);
  const [item] = await api.post<{ id: string }>("testimonials", {
    name: "Studio test reader",
    role: "Reader",
    quote: "A test quote for the studio's Greek approval.",
    published: false,
  });
  try {
    await page.goto(`/admin/translations?item=testimonial:${item.id}`, {
      waitUntil: "networkidle",
    });
    await page.getByLabel("Greek · Quote").fill("Μια δοκιμαστική φράση για την έγκριση.");
    await page.getByRole("button", { name: "Save Greek draft" }).click();
    await expect(page.getByText("Saved just now")).toBeVisible();

    // A draft is not approved, and Approve waits until every field has Greek.
    const [draft] = await api.get<{ status: string; fields: object | null }>(
      `content_translations?entity_type=eq.testimonial&entity_id=eq.${item.id}&select=status,fields`,
    );
    expect(draft.status).not.toBe("approved");
    await expect(page.getByRole("button", { name: "Approve Greek" })).toBeDisabled();

    await page.getByLabel("Greek · Name").fill("Αναγνώστρια δοκιμής");
    await page.getByLabel("Greek · Role").fill("Αναγνώστρια");
    await page.getByRole("button", { name: "Approve Greek" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Approve now" }).click();
    await expect(page.getByText("Greek reviewed and live on /el.")).toBeVisible();

    const [approved] = await api.get<{
      status: string;
      approved_by: string;
      source_fields: Record<string, string>;
      fields: Record<string, string>;
    }>(
      `content_translations?entity_type=eq.testimonial&entity_id=eq.${item.id}&select=status,approved_by,source_fields,fields`,
    );
    expect(approved.status).toBe("approved");
    expect(approved.approved_by).toBe(session.userId);
    expect(approved.source_fields.quote).toBe("A test quote for the studio's Greek approval.");
    expect(approved.fields.quote).toBe("Μια δοκιμαστική φράση για την έγκριση.");
  } finally {
    await api.del(`content_translations?entity_type=eq.testimonial&entity_id=eq.${item.id}`);
    await api.del(`testimonials?id=eq.${item.id}`);
  }
});

test("no console errors along the way", () => {
  expect(errors).toEqual([]);
});
