#!/usr/bin/env node
/**
 * Fails when visitors would download studio-only libraries, or when the home
 * page's JavaScript is over budget (brief 3.3). Reads the chunk graph that
 * scripts/vite/client-chunk-graph.ts writes during `bun run build`.
 *
 * Public code = the client entry and everything it imports statically, plus
 * every public route chunk and everything it imports, statically or lazily.
 */
import { readFileSync, existsSync } from "node:fs";
import { gzipSync } from "node:zlib";

const GRAPH = ".output/client-chunks.json";
const ASSETS = "dist";
const BUDGET_TOTAL_KB = 150;
const BUDGET_APP_KB = 45;

const FORBIDDEN = [
  ["@supabase/*", /\/node_modules\/@supabase\//],
  ["zod", /\/node_modules\/zod\//],
  ["framer-motion", /\/node_modules\/(framer-motion|motion-dom|motion-utils)\//],
  ["@tiptap/*", /\/node_modules\/@tiptap\//],
  ["sanitize-html", /\/node_modules\/(sanitize-html|htmlparser2)\//],
  ["cmdk", /\/node_modules\/cmdk\//],
];
/** Framework code that does not count towards the app budget. */
const FRAMEWORK =
  /\/node_modules\/(react|react-dom|scheduler|@tanstack|seroval|seroval-plugins|tiny-invariant|tiny-warning|cookie-es|use-sync-external-store)\//;
const PRIVATE_ROUTE = /\/src\/routes\/(_authenticated\/|auth\.tsx|admin|preview)/;
const ROUTE = /\/src\/routes\/([^?]+)\?tsr-split/;

if (!existsSync(GRAPH)) {
  console.error(`${GRAPH} is missing. Run \`bun run build\` first.`);
  process.exit(1);
}
const chunks = JSON.parse(readFileSync(GRAPH, "utf8"));
const byFile = new Map(chunks.map((c) => [c.fileName, c]));

function walk(roots, { lazy }) {
  const seen = new Set();
  const stack = [...roots];
  while (stack.length) {
    const file = stack.pop();
    if (seen.has(file) || !byFile.has(file)) continue;
    seen.add(file);
    const chunk = byFile.get(file);
    stack.push(...chunk.imports);
    if (lazy) stack.push(...chunk.dynamicImports.filter((f) => !isPrivateRoute(byFile.get(f))));
  }
  return seen;
}

function isPrivateRoute(chunk) {
  return !!chunk?.facadeModuleId && PRIVATE_ROUTE.test(chunk.facadeModuleId);
}

const entries = chunks.filter((c) => c.isEntry).map((c) => c.fileName);
const publicRoutes = chunks.filter(
  (c) => c.isDynamicEntry && ROUTE.test(c.facadeModuleId ?? "") && !isPrivateRoute(c),
);
const publicFiles = new Set([
  ...walk(entries, { lazy: false }),
  ...walk(
    publicRoutes.map((c) => c.fileName),
    { lazy: true },
  ),
]);

let failed = false;

// 1. Studio-only libraries never reach visitors.
for (const file of publicFiles) {
  const modules = Object.keys(byFile.get(file).modules);
  for (const [name, pattern] of FORBIDDEN) {
    const hits = modules.filter((m) => pattern.test(m));
    if (hits.length) {
      failed = true;
      console.error(
        `✗ ${name} is in public chunk ${file} (${hits.length} modules, e.g. ${hits[0].replace(/^.*node_modules\//, "")})`,
      );
    }
  }
}

// 2. Home page budget: the entry, the index route and their static imports.
const homeRoute = publicRoutes.filter((c) =>
  /\/src\/routes\/(index|\$)\.tsx\?/.test(c.facadeModuleId),
);
const homeFiles = walk([...entries, ...homeRoute.map((c) => c.fileName)], { lazy: false });
let total = 0;
let app = 0;
for (const file of homeFiles) {
  const gzip = gzipSync(readFileSync(`${ASSETS}/${file}`)).length;
  const modules = Object.entries(byFile.get(file).modules);
  const rendered = modules.reduce((sum, [, size]) => sum + size, 0) || 1;
  const appShare =
    modules.filter(([id]) => !FRAMEWORK.test(id)).reduce((sum, [, size]) => sum + size, 0) /
    rendered;
  total += gzip;
  app += gzip * appShare;
}
const kb = (bytes) => (bytes / 1024).toFixed(1);
const totalOk = total <= BUDGET_TOTAL_KB * 1024;
const appOk = app <= BUDGET_APP_KB * 1024;
console.log(
  `${totalOk ? "✓" : "✗"} home page JavaScript ${kb(total)} KB gzip (budget ${BUDGET_TOTAL_KB} KB)`,
);
console.log(`${appOk ? "✓" : "✗"} of which app code ${kb(app)} KB (budget ${BUDGET_APP_KB} KB)`);
if (!totalOk || !appOk) failed = true;

if (failed) {
  console.error("Public bundle check failed. See brief 3.3.");
  process.exit(1);
}
console.log(`✓ no studio-only libraries in ${publicFiles.size} public chunks`);
