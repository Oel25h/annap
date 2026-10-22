import { test } from "node:test";
import assert from "node:assert/strict";

process.env.APP_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
const { hashToken, isToken, keyedHash, open, randomToken, seal } = await import("./crypto.server");

test("tokens are 43 base64url characters and hash to hex", async () => {
  const token = randomToken();
  assert.ok(isToken(token));
  assert.notEqual(token, randomToken());
  assert.match(await hashToken(token), /^[0-9a-f]{64}$/);
});

test("sealed values open only with the same context", async () => {
  const sealed = await seal({ secretKey: "sk_test_123" }, "integration:stripe");
  assert.ok(!sealed.ciphertext.includes("sk_test"));
  assert.deepEqual(await open(sealed, "integration:stripe"), { secretKey: "sk_test_123" });
  await assert.rejects(open(sealed, "integration:resend"));
});

test("each seal uses a fresh IV", async () => {
  const a = await seal("same", "ctx");
  const b = await seal("same", "ctx");
  assert.notEqual(a.iv, b.iv);
  assert.notEqual(a.ciphertext, b.ciphertext);
});

test("keyed hashes are stable and differ from a plain hash", async () => {
  const one = await keyedHash("contact:ip:203.0.113.9");
  assert.equal(one, await keyedHash("contact:ip:203.0.113.9"));
  assert.notEqual(one, await hashToken("contact:ip:203.0.113.9"));
});
