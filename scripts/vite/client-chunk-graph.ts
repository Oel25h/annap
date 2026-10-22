import { writeFileSync, mkdirSync } from "node:fs";
import type { Plugin } from "vite";

/**
 * Writes `.output/client-chunks.json` after a client build: every chunk with
 * its static and dynamic imports and the modules inside it. The public
 * bundle check (scripts/check-public-bundle.mjs) reads it.
 */
export function clientChunkGraph(): Plugin {
  return {
    name: "client-chunk-graph",
    apply: "build",
    applyToEnvironment: (environment) => environment.name === "client",
    generateBundle(_options, bundle) {
      const chunks = Object.values(bundle)
        .filter((item) => item.type === "chunk")
        .map((chunk) => ({
          fileName: chunk.fileName,
          isEntry: chunk.isEntry,
          isDynamicEntry: chunk.isDynamicEntry,
          facadeModuleId: chunk.facadeModuleId,
          imports: chunk.imports,
          dynamicImports: chunk.dynamicImports,
          modules: Object.fromEntries(
            Object.entries(chunk.modules).map(([id, info]) => [id, info.renderedLength]),
          ),
        }));
      mkdirSync(".output", { recursive: true });
      writeFileSync(".output/client-chunks.json", JSON.stringify(chunks, null, 1));
    },
  };
}
