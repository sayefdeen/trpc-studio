import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: ["src/index.ts"],
    format: ["cjs", "esm"],
    dts: true,
    clean: false,
    sourcemap: true,
    splitting: false,
    treeshake: true,
    minify: false,
    external: ["@trpc/server", "zod"],
    noExternal: ["@trpc-studio/core"],
  },
  {
    entry: ["src/cli.ts"],
    format: ["cjs"],
    clean: false,
    sourcemap: false,
    splitting: false,
    treeshake: true,
    banner: { js: "#!/usr/bin/env node" },
  },
]);
