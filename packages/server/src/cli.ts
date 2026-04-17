import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";

import { extractRouterSchemas } from "@trpc-studio/core";

function printUsage() {
  console.error(`
Usage: trpc-studio extract [options]

Options:
  --router <path>     Path to the router file (required)
  --out <path>        Output JSON file path (default: .trpc-studio.json)
  --tsconfig <path>   Path to tsconfig.json (default: ./tsconfig.json)
  --name <name>       Router variable name (default: appRouter)
  --help              Show this help message
`);
}

function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      router: { type: "string" },
      out: { type: "string", default: ".trpc-studio.json" },
      tsconfig: { type: "string", default: "./tsconfig.json" },
      name: { type: "string", default: "appRouter" },
      help: { type: "boolean", default: false },
    },
  });

  if (values.help ?? positionals[0] === "help") {
    printUsage();
    process.exit(0);
  }

  const command = positionals[0];
  if (command !== "extract") {
    console.error(`Unknown command: ${command ?? "(none)"}`);
    printUsage();
    process.exit(1);
  }

  if (!values.router) {
    console.error("Error: --router is required");
    printUsage();
    process.exit(1);
  }

  const routerPath = path.resolve(values.router);
  const outputPath = path.resolve(values.out ?? ".trpc-studio.json");
  const tsconfigPath = path.resolve(values.tsconfig ?? "./tsconfig.json");
  const routerName = values.name ?? "appRouter";

  // Validate files exist
  if (!fs.existsSync(routerPath)) {
    console.error(`Error: Router file not found: ${routerPath}`);
    process.exit(1);
  }

  if (!fs.existsSync(tsconfigPath)) {
    console.error(`Error: tsconfig not found: ${tsconfigPath}`);
    process.exit(1);
  }

  console.error(`Extracting output schemas from ${routerPath}...`);
  console.error(`Using tsconfig: ${tsconfigPath}`);
  console.error(`Router variable: ${routerName}`);

  try {
    const schemas = extractRouterSchemas({
      routerPath,
      routerName,
      tsconfigPath,
    });

    const inputCount = Object.keys(schemas.inputs).length;
    const outputCount = Object.keys(schemas.outputs).length;
    const json = JSON.stringify(schemas, null, 2);

    fs.writeFileSync(outputPath, json, "utf-8");

    console.error(
      `\nExtracted ${String(inputCount)} input schemas, ${String(outputCount)} output schemas`,
    );
    console.error(`Written to: ${outputPath}`);
  } catch (err) {
    console.error(`\nError: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}

main();
