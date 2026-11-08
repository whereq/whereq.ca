import { Kicker } from "@/components/section/Kicker";

const SLOTS: { cx: number; cap: number; cap_y: number; caption: string }[] = [
  { cx: 280, cap: 305, cap_y: 248, caption: "ORBIT RESERVED" },
  { cx: 640, cap: 140, cap_y: 83, caption: "FUTURE PLANET" },
  { cx: 975, cap: 330, cap_y: 273, caption: "YOUR IDEA HERE" },
];

/** Section 8 — the future galaxy: empty reserved orbits. */
export function FutureSection() {
  return (
    <section className="section" id="future" style={{ paddingBottom: 40 }}>
      <div className="wrap">
        <Kicker num="07">THE FUTURE GALAXY</Kicker>
        <h2 className="section-title" data-reveal="">
          Empty orbits, on purpose.
        </h2>
        <p className="section-lede" data-reveal="">
          The architecture was designed to be extended. New questions will
          become new planets — and their orbits are already drawn.
        </p>
      </div>
      <div className="future-stage" data-reveal="">
        <svg
          className="future-svg"
          viewBox="0 0 1200 470"
          role="img"
          aria-label="Future galaxy: dashed empty orbits with reserved slots for future planets."
        >
          <g>
            <circle className="future-orbit" cx="600" cy="760" r="380" />
            <circle className="future-orbit" cx="600" cy="760" r="500" />
            <circle className="future-orbit" cx="600" cy="760" r="620" />
            <circle className="future-orbit" cx="600" cy="760" r="740" />
          </g>
          <circle cx="600" cy="430" r="44" fill="rgba(207,224,242,0.1)" />
          <circle cx="600" cy="430" r="22" fill="#DCE8F5" opacity="0.9" />

          {SLOTS.map((s) => (
            <g key={s.caption}>
              <circle className="future-slot" cx={s.cx} cy={s.cap} r="34" />
              <text className="future-q" x={s.cx} y={s.cap + 6} textAnchor="middle">
                ?
              </text>
              <text className="future-cap" x={s.cx} y={s.cap_y} textAnchor="middle">
                {s.caption}
              </text>
            </g>
          ))}
        </svg>
        <p className="future-note">THE UNIVERSE KEEPS EXPANDING</p>
      </div>
    </section>
  );
}
