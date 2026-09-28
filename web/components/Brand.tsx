export function BrandSeal({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 34 34" aria-hidden="true">
      <circle cx="17" cy="17" r="15.5" fill="none" stroke="#ff8a75" strokeWidth="2" />
      <circle
        cx="17"
        cy="17"
        r="10.5"
        fill="none"
        stroke="#ff8a75"
        strokeWidth="1"
        strokeDasharray="3 2.4"
      />
      <path
        d="M12 17.5l3.4 3.4L22.5 13.6"
        fill="none"
        stroke="#fff"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BrandMark() {
  return (
    <a className="brand" href="/">
      <BrandSeal />
      <span className="brand-name">
        Witness <em>Relay</em>
      </span>
    </a>
  );
}

export function TopBar() {
  return (
    <header className="topbar">
      <div className="wrap topbar-inner">
        <BrandMark />
        <nav className="topnav">
          <a className="active" href="/">
            Live feed
          </a>
          <a href="/relay">Relay hub</a>
          <a href="/impact">Impact</a>
          <a href="/how-it-works">How it works</a>
        </nav>
        <div className="topbar-right">
          <a className="btn btn-accent" href="/relay">
            Relay this news
          </a>
        </div>
      </div>
    </header>
  );
}
