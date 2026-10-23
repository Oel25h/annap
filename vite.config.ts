import { defineConfig, loadEnv } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";
import { clientChunkGraph } from "./scripts/vite/client-chunk-graph.ts";

const fromRoot = (path: string) => new URL(path, import.meta.url).pathname;

/**
 * TanStack Start + Nitro + Tailwind.
 * Ship builds target Netlify Functions (Nitro's `netlify` preset, see netlify.toml): the
 * server lands in .netlify/functions-internal, the static files in dist. The scheduled
 * work runs as Netlify Scheduled Functions (netlify/functions), outside Nitro.
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const nitroPreset = process.env.NITRO_PRESET || env.NITRO_PRESET || "netlify";

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
      nitro({ preset: nitroPreset }),
      viteReact(),
      clientChunkGraph(),
    ],
  };
});
