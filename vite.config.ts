import { defineConfig, loadEnv } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { nitro } from "nitro/vite";

/**
 * TanStack Start + Nitro + Tailwind.
 * Ship builds: NITRO_PRESET=vercel (package.json build:vercel / Vercel).
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const nitroPreset = process.env.NITRO_PRESET || env.NITRO_PRESET || "vercel";

  return {
    server: {
      host: true,
      port: 8080,
      strictPort: false,
    },
    resolve: {
      alias: {
        "@": new URL("./src", import.meta.url).pathname,
      },
      dedupe: ["react", "react-dom", "@tanstack/react-query", "@tanstack/react-router"],
    },
    plugins: [
      tsConfigPaths({ projects: ["./tsconfig.json"] }),
      tailwindcss(),
      tanstackStart({
        server: { entry: "server" },
      }),
      nitro({
        preset: nitroPreset,
      }),
      viteReact(),
    ],
  };
});
