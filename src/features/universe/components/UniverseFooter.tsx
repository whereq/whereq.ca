interface FooterLink {
  label: string;
  href: string;
  external?: boolean;
}

const FOOTER_LINKS: FooterLink[] = [
  { label: "WhereQ — WHERE", href: "https://www.whereq.com", external: true },
  { label: "KeyToMarvel — WHO", href: "https://www.keytomarvel.com", external: true },
  { label: "Chroniq — WHEN", href: "https://www.chroniq.cc", external: true },
  { label: "WhereQ.ca — WHY", href: "https://www.whereq.ca/lab", external: true },
  { label: "FlowDesk — HOW", href: "https://www.flowdesk.top", external: true },
  { label: "CCBus — HOW", href: "https://www.ccbus.cc", external: true },
  { label: "CatoBigato — HOW", href: "https://www.catobigato.com", external: true },
  { label: "WhereQ Cloud — HOW", href: "https://whereq.cloud", external: true },
  { label: "WhereQ.cc — HOW", href: "https://whereq.cc", external: true },
  { label: "QHaul — HOW", href: "https://qhaul.ca", external: true },
  { label: "whereq.github.io — WHAT", href: "https://whereq.github.io", external: true },
];

/** Universe footer with the full ecosystem link map. */
export function UniverseFooter() {
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer-grid">
          <div>
            <a className="brand" href="#top">
              WHEREQ<b>·</b>UNIVERSE
            </a>
            <p
              className="section-lede"
              style={{ fontSize: 14, marginTop: 14, maxWidth: "24em" }}
            >
              A living ecosystem built on 5W + 1H. Broadcast from mission
              control at whereq.ca.
            </p>
          </div>
          <div className="footer-links">
            {FOOTER_LINKS.map((l) =>
              l.external ? (
                <a
                  key={l.label}
                  href={l.href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {l.label}
                </a>
              ) : (
                <a key={l.label} href={l.href}>
                  {l.label}
                </a>
              ),
            )}
          </div>
        </div>
        <p className="footer-note">
          © 2026 WHEREQ UNIVERSE · EVERY PLACE HAS A STORY · EVERY QUESTION HAS A
          PLANET
        </p>
      </div>
    </footer>
  );
}
