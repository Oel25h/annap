import { expect, test } from "@playwright/test";

/** Headers and the Content-Security-Policy on real pages. */
for (const path of ["/", "/el/about", "/books"]) {
  test(`${path} sends security headers and a nonce-based policy`, async ({ page }) => {
    const violations: string[] = [];
    page.on("console", (msg) => {
      if (/Content Security Policy/i.test(msg.text())) violations.push(msg.text());
    });

    const response = await page.goto(path, { waitUntil: "networkidle" });
    const headers = response!.headers();
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["strict-transport-security"]).toContain("max-age=");

    const csp = headers["content-security-policy"];
    expect(csp, "CSP header").toBeTruthy();
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    const nonce = csp.match(/'nonce-([^']+)'/)?.[1];
    expect(nonce, "CSP nonce").toBeTruthy();

    // Every inline script in the server HTML carries this response's nonce.
    const html = await response!.text();
    const inline = [...html.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>/g)].map((m) => m[1]);
    expect(inline.length).toBeGreaterThan(0);
    for (const attrs of inline) expect(attrs).toContain(`nonce="${nonce}"`);

    expect(violations).toEqual([]);
  });
}

test("the policy changes on every request", async ({ request }) => {
  const a = (await request.get("/")).headers()["content-security-policy"];
  const b = (await request.get("/")).headers()["content-security-policy"];
  expect(a).not.toEqual(b);
});

test("server functions refuse cross-site calls", async ({ request }) => {
  const res = await request.post("/_serverFn/anything", {
    headers: { Origin: "https://evil.example", "Sec-Fetch-Site": "cross-site" },
    data: {},
  });
  expect(res.status()).toBe(403);
});
