export default function Home() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, -apple-system, sans-serif",
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        color: "#f8fafc",
        padding: "2rem",
      }}
    >
      <div style={{ maxWidth: "720px", textAlign: "center" }}>
        <h1
          style={{
            fontSize: "3rem",
            fontWeight: 800,
            marginBottom: "1rem",
            background: "linear-gradient(to right, #60a5fa, #a78bfa)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          trpc-studio
        </h1>

        <p style={{ fontSize: "1.25rem", color: "#94a3b8", marginBottom: "2rem", lineHeight: 1.6 }}>
          A Swagger-like developer UI for tRPC APIs with auto-generated input forms, real-time
          execution, and output type visualization via the TypeScript Compiler API.
        </p>

        <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
          <a
            href="/demo"
            style={{
              padding: "0.75rem 2rem",
              background: "#3b82f6",
              color: "#fff",
              borderRadius: "0.5rem",
              textDecoration: "none",
              fontWeight: 600,
              fontSize: "1rem",
            }}
          >
            Live Demo
          </a>
          <a
            href="https://github.com/sayefdeen/trpc-studio"
            style={{
              padding: "0.75rem 2rem",
              background: "transparent",
              color: "#e2e8f0",
              borderRadius: "0.5rem",
              textDecoration: "none",
              fontWeight: 600,
              fontSize: "1rem",
              border: "1px solid #475569",
            }}
          >
            GitHub
          </a>
          <a
            href="https://www.npmjs.com/package/@srawad/trpc-studio"
            style={{
              padding: "0.75rem 2rem",
              background: "transparent",
              color: "#e2e8f0",
              borderRadius: "0.5rem",
              textDecoration: "none",
              fontWeight: 600,
              fontSize: "1rem",
              border: "1px solid #475569",
            }}
          >
            npm
          </a>
        </div>

        <div
          style={{
            marginTop: "3rem",
            background: "#1e293b",
            border: "1px solid #334155",
            borderRadius: "0.5rem",
            padding: "1rem 1.5rem",
            textAlign: "left",
          }}
        >
          <code style={{ color: "#94a3b8", fontSize: "0.875rem" }}>
            <span style={{ color: "#64748b" }}>$</span>{" "}
            <span style={{ color: "#f8fafc" }}>npm install -D @srawad/trpc-studio</span>
          </code>
        </div>

        <div
          style={{
            marginTop: "3rem",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "1.5rem",
            textAlign: "left",
          }}
        >
          {[
            {
              title: "Auto Input Forms",
              desc: "Generated from Zod schemas — string, number, boolean, enum, object, array",
            },
            {
              title: "Try It Out",
              desc: "Execute real tRPC calls from the browser with response display and timing",
            },
            {
              title: "Output Types",
              desc: "Extract response types at build time using the TypeScript Compiler API",
            },
            {
              title: "Self-Contained",
              desc: "Served as a single HTML response — no static file hosting needed",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              style={{
                background: "#1e293b",
                border: "1px solid #334155",
                borderRadius: "0.5rem",
                padding: "1.25rem",
              }}
            >
              <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.5rem" }}>
                {feature.title}
              </h3>
              <p style={{ fontSize: "0.875rem", color: "#94a3b8", lineHeight: 1.5, margin: 0 }}>
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
