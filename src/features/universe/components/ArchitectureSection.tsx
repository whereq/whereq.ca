import { Kicker } from "@/components/section/Kicker";

/** Section 6 — layered architecture diagram (static SVG). */
export function ArchitectureSection() {
  return (
    <section className="section" id="architecture">
      <div className="wrap">
        <Kicker num="05">UNIVERSE ARCHITECTURE</Kicker>
        <h2 className="section-title" data-reveal="">
          Layers, not silos.
        </h2>
        <p className="section-lede" data-reveal="">
          Products at the top stand on shared layers below. Arrows point in the
          direction of dependency.
        </p>
        <div className="arch-stage" data-reveal="">
          <svg
            className="arch-svg"
            viewBox="0 0 1200 660"
            role="img"
            aria-label="Architecture diagram: the product layer (FlowDesk, CCBus, CatoBigato) depends on the announcement and experiment layers, which depend on the identity, location and time foundation layers."
          >
            <defs>
              <marker
                id="wqArrowhead"
                markerWidth="8"
                markerHeight="8"
                refX="7"
                refY="4"
                orient="auto"
              >
                <path d="M0 0 L8 4 L0 8 Z" fill="rgba(168,190,216,0.55)" />
              </marker>
            </defs>

            {/* product layer */}
            <rect className="arch-layer-rect" x="150" y="30" width="900" height="120" rx="6" stroke="rgba(233,239,246,0.35)" />
            <text className="arch-label" x="180" y="65">PRODUCT LAYER · HOW</text>
            <text className="arch-name" x="180" y="100">
              FlowDesk <tspan fill="#6E7C90">·</tspan> CCBus <tspan fill="#6E7C90">·</tspan> CatoBigato
            </text>
            <text className="arch-sub" x="180" y="126">flowdesk.top · ccbus.cc · catobigato.com</text>
            <circle cx="985" cy="90" r="7" fill="#3FD68F" />
            <circle cx="1008" cy="90" r="7" fill="#F08A4B" />
            <circle cx="1031" cy="90" r="7" fill="#F47B6B" />

            {/* arrows product → middle */}
            <path className="arch-arrow" d="M430 150 L385 240" />
            <path className="arch-arrow" d="M770 150 L815 240" />

            {/* middle layers */}
            <rect className="arch-layer-rect" x="150" y="245" width="430" height="120" rx="6" stroke="rgba(244,107,169,0.45)" />
            <text className="arch-label" x="180" y="280" fill="#F46BA9">EXPERIMENT LAYER · WHY</text>
            <text className="arch-name" x="180" y="315">WhereQ.ca</text>
            <text className="arch-sub" x="180" y="341">validation · prototyping · feedback</text>

            <rect className="arch-layer-rect" x="620" y="245" width="430" height="120" rx="6" stroke="rgba(77,168,240,0.45)" />
            <text className="arch-label" x="650" y="280" fill="#4DA8F0">ANNOUNCEMENT LAYER · WHAT</text>
            <text className="arch-name" x="650" y="315">whereq.github.io</text>
            <text className="arch-sub" x="650" y="341">news · releases · changelogs</text>

            {/* arrows middle → foundation */}
            <path className="arch-arrow" d="M310 365 L295 455" />
            <path className="arch-arrow" d="M480 365 L560 455" />
            <path className="arch-arrow" d="M760 365 L660 455" />
            <path className="arch-arrow" d="M900 365 L915 455" />

            {/* foundation layers */}
            <rect className="arch-layer-rect" x="150" y="460" width="280" height="120" rx="6" stroke="rgba(244,179,61,0.5)" />
            <text className="arch-label" x="178" y="495" fill="#F4B33D">IDENTITY · WHO</text>
            <text className="arch-name" x="178" y="530">KeyToMarvel</text>
            <text className="arch-sub" x="178" y="556">SSO · auth · trust</text>

            <rect className="arch-layer-rect" x="460" y="460" width="280" height="120" rx="6" stroke="rgba(45,212,191,0.5)" />
            <text className="arch-label" x="488" y="495" fill="#2DD4BF">LOCATION · WHERE</text>
            <text className="arch-name" x="488" y="530">WhereQ</text>
            <text className="arch-sub" x="488" y="556">maps · routing · places</text>

            <rect className="arch-layer-rect" x="770" y="460" width="280" height="120" rx="6" stroke="rgba(167,139,250,0.5)" />
            <text className="arch-label" x="798" y="495" fill="#A78BFA">TIME · WHEN</text>
            <text className="arch-name" x="798" y="530">Chroniq</text>
            <text className="arch-sub" x="798" y="556">time · events · booking</text>

            {/* baseline */}
            <text className="arch-label" x="600" y="640" textAnchor="middle" letterSpacing="6">
              FOUNDATION · THE 5W CORE
            </text>
          </svg>
        </div>
      </div>
    </section>
  );
}
