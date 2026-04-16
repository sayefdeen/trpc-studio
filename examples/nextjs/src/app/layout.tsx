import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "trpc-studio — Swagger-like UI for tRPC",
  description:
    "A developer UI for tRPC APIs with auto-generated input forms, Try It Out execution, and output type visualization.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
