import { defineConfig, loadEnv } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";
import { clientChunkGraph } from "./scripts/vite/client-chunk-graph.ts";

const fromRoot = (path: string) => new URL(path, import.meta.url).pathname;

/**
 * TanStack Start + Nitro + Tailwind.
 * Ship builds target Cloudflare Workers (NITRO_PRESET=cloudflare-module, see wrangler.jsonc).
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const nitroPreset = process.env.NITRO_PRESET || env.NITRO_PRESET || "cloudflare-module";

  return {
    server: {
      host: true,
      port: 8080,
      strictPort: false,
    },
    resolve: {
      alias: {
        "@": fromRoot("./src"),
      },
      dedupe: ["react", "react-dom", "@tanstack/react-query", "@tanstack/react-router"],
      // tsconfig.json's paths, resolved by Vite itself.
      tsconfigPaths: true,
    },
    plugins: [
      tailwindcss(),
      tanstackStart({
        server: { entry: "server" },
      }),
      nitro({
        preset: nitroPreset,
        // Cron Triggers on Cloudflare: Nitro writes them into the worker config.
        experimental: { tasks: true },
        tasks: {
          "outbox:drain": { handler: fromRoot("./src/server/tasks/outbox-drain.ts") },
          "purge:expired": { handler: fromRoot("./src/server/tasks/purge-expired.ts") },
          "youtube:sync": { handler: fromRoot("./src/server/tasks/youtube-sync.ts") },
        },
        scheduledTasks: {
          "*/5 * * * *": ["outbox:drain"],
          "17 3 * * *": ["purge:expired"],
          "0 * * * *": ["youtube:sync"],
        },
      }),
      viteReact(),
      clientChunkGraph(),
    ],
  };
});
