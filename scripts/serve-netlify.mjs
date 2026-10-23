#!/usr/bin/env node
/**
 * Serves the Netlify build locally, the way Netlify does, for the e2e gate:
 * files in dist/ first (with the headers from netlify.toml and dist/_headers),
 * everything else through the server function Nitro wrote to
 * .netlify/functions-internal/server. It runs offline, unlike `netlify serve`,
 * whose edge-functions proxy needs api.netlify.com.
 *
 *   node scripts/serve-netlify.mjs [--port 8888]
 *
 * Reads .env (local Supabase) into process.env, as Netlify does with the
 * site's environment variables.
 */
import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { Readable } from "node:stream";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();
const PUBLISH = join(ROOT, "dist");
const FUNCTION = join(ROOT, ".netlify/functions-internal/server/main.mjs");
const portFlag = process.argv.indexOf("--port");
const PORT = Number(portFlag > 0 ? process.argv[portFlag + 1] : (process.env.PORT ?? 8888));

if (existsSync(".env")) process.loadEnvFile(".env");
if (!existsSync(FUNCTION) || !existsSync(PUBLISH)) {
  console.error("No Netlify build found. Run `bun run build` first.");
  process.exit(1);
}

const TYPES = {
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml",
  ".wasm": "application/wasm",
  ".mp3": "audio/mpeg",
  ".pdf": "application/pdf",
};

/** [[headers]] blocks from netlify.toml and the rules in dist/_headers, as [pattern, headers]. */
function headerRules() {
  const rules = [];
  const toml = readFileSync(join(ROOT, "netlify.toml"), "utf8");
  for (const block of toml.split(/^\[\[headers\]\]\s*$/m).slice(1)) {
    const body = block.split(/^\[(?!headers\.values\])/m)[0];
    const path = body.match(/^\s*for\s*=\s*"([^"]+)"/m)?.[1];
    const values = body.split(/^\s*\[headers\.values\]\s*$/m)[1] ?? "";
    const headers = {};
    for (const [, name, value] of values.matchAll(/^\s*([\w-]+)\s*=\s*"([^"]*)"/gm))
      headers[name] = value;
    if (path) rules.push([path, headers]);
  }
  const file = join(PUBLISH, "_headers");
  if (existsSync(file)) {
    let current;
    for (const line of readFileSync(file, "utf8").split("\n")) {
      if (/^\S/.test(line)) rules.push([line.trim(), (current = {})]);
      else if (current && line.includes(":")) {
        const at = line.indexOf(":");
        current[line.slice(0, at).trim()] = line.slice(at + 1).trim();
      }
    }
  }
  return rules;
}

const RULES = headerRules();
const matches = (pattern, path) =>
  pattern.endsWith("/*") ? path.startsWith(pattern.slice(0, -1)) : pattern === path;

function staticFile(pathname) {
  if (pathname.startsWith("/.netlify/") || pathname.startsWith("/_")) return null;
  const file = normalize(join(PUBLISH, decodeURIComponent(pathname)));
  if (!file.startsWith(PUBLISH + "/")) return null;
  try {
    return statSync(file).isFile() ? file : null;
  } catch {
    return null;
  }
}

const { default: handler } = await import(pathToFileURL(FUNCTION).href);

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? `127.0.0.1:${PORT}`}`);
  const file = req.method === "GET" || req.method === "HEAD" ? staticFile(url.pathname) : null;
  if (file) {
    const headers = { "content-type": TYPES[extname(file)] ?? "application/octet-stream" };
    for (const [pattern, values] of RULES)
      if (matches(pattern, url.pathname)) Object.assign(headers, values);
    res.writeHead(200, headers);
    if (req.method === "HEAD") return res.end();
    return createReadStream(file).pipe(res);
  }

  try {
    const headers = new Headers();
    for (const [name, value] of Object.entries(req.headers)) {
      if (Array.isArray(value)) value.forEach((v) => headers.append(name, v));
      else if (value != null) headers.set(name, value);
    }
    headers.set("x-nf-client-connection-ip", req.socket.remoteAddress ?? "127.0.0.1");
    const hasBody = req.method !== "GET" && req.method !== "HEAD";
    const request = new Request(url, {
      method: req.method,
      headers,
      body: hasBody ? Readable.toWeb(req) : undefined,
      duplex: hasBody ? "half" : undefined,
    });
    const response = await handler(request, {});
    const out = {};
    response.headers.forEach((value, name) => {
      if (name !== "set-cookie") out[name] = value;
    });
    const cookies = response.headers.getSetCookie();
    if (cookies.length) out["set-cookie"] = cookies;
    res.writeHead(response.status, out);
    if (!response.body || req.method === "HEAD") return res.end();
    Readable.fromWeb(response.body).pipe(res);
  } catch (error) {
    console.error(error);
    if (!res.headersSent) res.writeHead(500);
    res.end();
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Netlify build ready on http://127.0.0.1:${PORT}`);
});
