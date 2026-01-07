import { defineConfig } from "tsup";

const common = {
  external: ["react", "react-dom", "enlace-core", "enlace"],
  format: ["cjs", "esm"] as const,
  dts: true,
  splitting: false,
  platform: "browser" as const,
};

export default defineConfig((options) => [
  {
    ...common,
    entry: { index: "src/index.ts" },
    outDir: "dist",
    clean: !options.watch,
  },
  {
    ...common,
    entry: { index: "src/client/index.ts" },
    outDir: "dist/client",
    banner: { js: '"use client";' },
  },
]);
