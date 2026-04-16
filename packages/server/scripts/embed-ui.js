// This script runs after the UI build and before the server build.
// It reads the built UI assets and writes them as a TypeScript module
// so they get bundled directly into the server JS — no fs.readFileSync needed.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uiDir = path.join(__dirname, "..", "dist", "ui", "assets");
const outFile = path.join(__dirname, "..", "src", "ui-assets.ts");

let jsContent = "";
let cssContent = "";

try {
  jsContent = fs.readFileSync(path.join(uiDir, "index.js"), "utf-8");
  cssContent = fs.readFileSync(path.join(uiDir, "index.css"), "utf-8");
} catch {
  console.error("Warning: UI assets not found at", uiDir);
  console.error("Make sure @trpc-studio/ui is built first.");
}

// Escape backticks and ${} in the content for template literals
const escapeTemplate = (s) => s.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");

const output = `// AUTO-GENERATED — do not edit. Run "node scripts/embed-ui.js" to regenerate.
export const UI_JS = \`${escapeTemplate(jsContent)}\`;
export const UI_CSS = \`${escapeTemplate(cssContent)}\`;
`;

fs.writeFileSync(outFile, output, "utf-8");
console.log(`Embedded UI assets into ${outFile} (JS: ${jsContent.length} bytes, CSS: ${cssContent.length} bytes)`);
