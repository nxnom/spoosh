import { defineConfig } from "tsup";

export default defineConfig((options) => ({
  entry: { index: "src/index.ts" },
  external: ["react", "react-dom", "@spoosh/core"],
  format: ["cjs", "esm"],
  dts: true,
  splitting: false,
  platform: "browser",
  outDir: "dist",
  clean: !options.watch,
  banner: { js: '"use client";' },
}));
