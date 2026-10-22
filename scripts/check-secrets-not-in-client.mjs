#!/usr/bin/env bun
/**
 * Fail if client build output (dist/) contains server-only secrets.
 * Run after `bun run build`. Does not print secret values.
 *
 * Checks:
 *  - Known dangerous substrings in client assets
 *  - Live values of server-only env vars (if present in process env)
 */
import { readdir, readFile, stat } from "node:fs/promises";
import { join, extname } from "node:path";

const ROOT = process.cwd();
const DIST = join(ROOT, "dist");

const SCAN_EXTS = new Set([
  ".js",
  ".mjs",
  ".cjs",
  ".css",
  ".html",
  ".json",
  ".map",
  ".txt",
  ".svg",
]);

/** Patterns that must never appear in client bundles (value-agnostic). */
const FORBIDDEN_PATTERNS = [
  { id: "sk_live", re: /sk_live_[A-Za-z0-9]+/g },
  { id: "sk_test", re: /sk_test_[A-Za-z0-9]+/g },
  { id: "sb_secret_", re: /sb_secret_[A-Za-z0-9_]+/g },
  // JWT-shaped service role keys often embed this claim name in payload
  { id: "service_role_claim", re: /["']role["']\s*:\s*["']service_role["']/g },
  { id: "service_role_literal", re: /service_role/g },
];

/** Env vars that are server-only — their exact values must not appear in dist. */
const SERVER_ONLY_ENV = ["SUPABASE_SERVICE_ROLE_KEY", "ADMIN_SETUP_SECRET", "GEMINI_API_KEY"];

async function walk(dir) {
  const out = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (e) {
    if (e && e.code === "ENOENT") {
      console.error(`[secrets:check] FAIL — missing ${dir}. Run bun run build first.`);
      process.exit(2);
    }
    throw e;
  }
  for (const ent of entries) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) out.push(...(await walk(p)));
    else out.push(p);
  }
  return out;
}

function loadDotEnvIfPresent() {
  // Best-effort: bun already injects .env when run via `bun run`.
  // No-op placeholder for node callers.
}

async function main() {
  loadDotEnvIfPresent();

  const files = (await walk(DIST)).filter((f) => SCAN_EXTS.has(extname(f).toLowerCase()));
  if (files.length === 0) {
    console.error("[secrets:check] FAIL — no scannable files under dist/");
    process.exit(2);
  }

  const findings = [];

  // Exact env values (min length guard avoids false positives on empty/"changeme")
  const envNeedles = [];
  for (const name of SERVER_ONLY_ENV) {
    const v = process.env[name];
    if (typeof v === "string" && v.trim().length >= 8) {
      envNeedles.push({ name, value: v.trim() });
    }
  }

  for (const file of files) {
    let text;
    try {
      const st = await stat(file);
      if (st.size > 25 * 1024 * 1024) continue; // skip huge binaries mis-ext'd
      text = await readFile(file, "utf8");
    } catch {
      continue;
    }

    const rel = file.slice(ROOT.length + 1);

    for (const { id, re } of FORBIDDEN_PATTERNS) {
      re.lastIndex = 0;
      if (re.test(text)) {
        // service_role as a word is common in comments/docs — only flag in .js/.mjs bundles
        if (id === "service_role_literal" && !/\.(m?js|cjs)$/i.test(file)) continue;
        // Allow the string in source maps only if it's clearly a type name without a key — still flag JS
        findings.push({ file: rel, kind: id });
      }
    }

    for (const { name, value } of envNeedles) {
      if (text.includes(value)) {
        findings.push({ file: rel, kind: `env:${name}` });
      }
    }
  }

  // Dedup
  const key = (f) => `${f.file}::${f.kind}`;
  const uniq = [...new Map(findings.map((f) => [key(f), f])).values()];

  if (uniq.length) {
    console.error("[secrets:check] FAIL — possible secrets in client build output:");
    for (const f of uniq) {
      console.error(`  - ${f.kind} in ${f.file}`);
    }
    console.error(
      "Remediate: ensure SUPABASE_SERVICE_ROLE_KEY / ADMIN_SETUP_SECRET / GEMINI_API_KEY are server-only (no VITE_).",
    );
    process.exit(1);
  }

  const envChecked = envNeedles.map((e) => e.name).join(", ") || "(none loaded in env)";
  console.log(
    `[secrets:check] PASS — scanned ${files.length} files under dist/; env value checks: ${envChecked}`,
  );
}

main().catch((err) => {
  console.error("[secrets:check] ERROR", err);
  process.exit(2);
});
