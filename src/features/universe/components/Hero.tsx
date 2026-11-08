import type { CSSProperties } from "react";

const Q_ROWS: { c: string; q: string; label: string }[] = [
  { c: "var(--c-where)", q: "WHERE", label: "WhereQ" },
  { c: "var(--c-who)", q: "WHO", label: "KeyToMarvel" },
  { c: "var(--c-when)", q: "WHEN", label: "Chroniq" },
  { c: "var(--c-why)", q: "WHY", label: "WhereQ.ca" },
  { c: "var(--c-what)", q: "WHAT", label: "whereq.github.io" },
  { c: "var(--ink-soft)", q: "HOW", label: "FlowDesk · CCBus · CatoBigato" },
];

/** Section 1 — full-screen animated universe hero. */
export function Hero() {
  return (
    <header className="hero">
      <div className="hero-rings" aria-hidden="true">
        <svg viewBox="0 0 1200 1200">
          <circle className="hr-ring" cx="600" cy="600" r="210" />
          <circle className="hr-ring hr-ring--dash" cx="600" cy="600" r="330" />
          <circle className="hr-ring" cx="600" cy="600" r="455" />
          <circle className="hr-ring hr-ring--dash" cx="600" cy="600" r="585" />
          <g className="spin">
            <circle cx="810" cy="600" r="5" fill="#2DD4BF" />
            <circle cx="600" cy="270" r="4" fill="#F4B33D" />
            <circle cx="390" cy="600" r="3.5" fill="#A78BFA" />
          </g>
          <g className="spin spin--rev">
            <circle cx="1055" cy="600" r="4" fill="#3FD68F" />
            <circle cx="600" cy="145" r="3.5" fill="#F08A4B" />
            <circle cx="600" cy="1055" r="4" fill="#F47B6B" />
          </g>
        </svg>
      </div>
      <div className="hero-inner">
        <p className="hero-kicker">WHEREQ.CA — THE RESEARCH STATION</p>
        <h1 className="hero-title">
          <span className="thin">Welcome to the</span>WhereQ Universe
        </h1>
        <p className="hero-sub">
          Six timeless questions — who, what, when, where, why, how — turned
          into living products. One identity. One map. One clock. One lab. One
          voice. And a universe that keeps expanding.
        </p>
        <div className="hero-qrow">
          {Q_ROWS.map((row) => (
            <span key={row.q} style={{ "--q-c": row.c } as CSSProperties}>
              <i>{row.q}</i>
              {row.label}
            </span>
          ))}
        </div>
      </div>
      <a className="hero-scroll" href="#origin">
        BEGIN THE JOURNEY
      </a>
    </header>
  );
}
