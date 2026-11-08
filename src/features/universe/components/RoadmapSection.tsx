import type { CSSProperties } from "react";
import clsx from "clsx";
import { Kicker } from "@/components/section/Kicker";
import { UNIVERSE, PLANET_BY_ID, type RoadmapEra } from "../data/universe";

const ERAS: { key: RoadmapEra; label: string }[] = [
  { key: "past", label: "Launched" },
  { key: "now", label: "Now" },
  { key: "future", label: "Next" },
];

/** Section 7 — data-driven roadmap, grouped by era. */
export function RoadmapSection() {
  return (
    <section className="section section--alt" id="roadmap">
      <div className="wrap">
        <Kicker num="06" accent="var(--c-when)">
          ROADMAP
        </Kicker>
        <h2 className="section-title" data-reveal="">
          Past, present, and orbits yet to fill.
        </h2>
        <p className="section-lede" data-reveal="">
          The roadmap is data-driven — as the universe grows, new milestones
          simply append to the timeline.
        </p>
        <div className="roadmap">
          {ERAS.map((era) => {
            const items = UNIVERSE.roadmap.filter((m) => m.era === era.key);
            if (!items.length) return null;
            return (
              <div
                key={era.key}
                className={`rm-era rm-era--${era.key}`}
                data-reveal=""
              >
                <h3 className="rm-era-label">{era.label}</h3>
                <ol className="rm-list">
                  {items.map((m, i) => {
                    const p = m.planet ? PLANET_BY_ID[m.planet] : null;
                    return (
                      <li
                        key={`${era.key}-${i}`}
                        className={clsx("rm-item", !p && "rm-item--future")}
                        style={
                          {
                            "--rm-accent": p ? p.color : "#5B6B82",
                          } as CSSProperties
                        }
                      >
                        <span className="rm-dot" />
                        <div className="rm-body">
                          <span className="rm-tag">{p ? p.name : "TBD"}</span>
                          <h4 className="rm-title">{m.title}</h4>
                          <p className="rm-text">{m.text}</p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
