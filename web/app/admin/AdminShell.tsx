import Link from "next/link";
import { logout } from "@/app/admin/actions";
import { BrandMark } from "@/components/Brand";
import { editorName } from "@/lib/admin-auth";

export function AdminShell({ children, active }: { children: React.ReactNode; active: "queue" | "reconcile" }) {
  return (
    <>
      <header className="topbar">
        <div className="wrap topbar-inner">
          <BrandMark />
          <span
            className="mono"
            style={{ fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", background: "var(--accent)", borderRadius: 6, padding: "4px 9px" }}
          >
            Newsroom
          </span>
          <nav className="topnav">
            <Link className={active === "queue" ? "active" : ""} href="/admin">Review queue</Link>
            <Link className={active === "reconcile" ? "active" : ""} href="/admin/reconcile">Reconcile</Link>
            <Link href="/" target="_blank">Public site ↗</Link>
          </nav>
          <div className="topbar-right">
            <span className="mono" style={{ fontSize: 10.5, color: "#9d96c9" }}>
              {editorName().toUpperCase()} · EDITOR
            </span>
            <form action={logout}>
              <button className="btn btn-ghost" type="submit">Sign out</button>
            </form>
          </div>
        </div>
      </header>
      {children}
    </>
  );
}
