import ReactDOM from "react-dom/client";

import { App } from "./App";
import "./index.css";

import type { RouterManifest } from "@trpc-studio/core";

interface StudioOptions {
  url: string;
  transformer: "superjson" | "none";
  headers: Record<string, string>;
  version?: string;
}

declare global {
  interface Window {
    __TRPC_STUDIO_MANIFEST__: RouterManifest;
    __TRPC_STUDIO_OPTIONS__: StudioOptions;
  }
}

const manifest = window.__TRPC_STUDIO_MANIFEST__;
const options = window.__TRPC_STUDIO_OPTIONS__;

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
ReactDOM.createRoot(document.getElementById("root")!).render(
  <App manifest={manifest} options={options} />,
);
