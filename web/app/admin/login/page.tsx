import { login } from "@/app/admin/actions";
import { BrandMark } from "@/components/Brand";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string }>;
}) {
  const { e } = await searchParams;

  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--ink)" }}>
      <div style={{ padding: "22px 32px 0" }}>
        <BrandMark />
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <form
          action={login}
          style={{
            background: "#fff",
            borderRadius: 14,
            padding: "34px 36px 30px",
            width: 400,
            boxShadow: "0 30px 80px rgba(0,0,0,.35)",
          }}
        >
          <span className="stamp" style={{ transform: "none" }}>Newsroom</span>
          <h1 className="serif" style={{ fontSize: 24, fontWeight: 600, margin: "14px 0 6px" }}>
            Editorial sign-in
          </h1>
          <p style={{ fontSize: 13, color: "var(--ink-2)", marginBottom: 18 }}>
            Nothing publishes without a human decision. This gate protects the newsroom.
          </p>
          {e ? (
            <div className="chip chip-red" style={{ marginBottom: 12 }}>
              Wrong password — try again
            </div>
          ) : null}
          <input
            type="password"
            name="password"
            placeholder="Staff password"
            autoFocus
            style={{
              width: "100%",
              border: "1px solid var(--line)",
              borderRadius: 9,
              padding: "11px 13px",
              fontSize: 14,
              marginBottom: 12,
            }}
          />
          <button className="btn btn-accent" style={{ width: "100%", justifyContent: "center" }} type="submit">
            Enter the newsroom →
          </button>
          <p className="mono" style={{ fontSize: 9.5, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ink-3)", marginTop: 14, textAlign: "center" }}>
            Staff gate · password lives in .env.local, never committed
          </p>
        </form>
      </div>
    </main>
  );
}
