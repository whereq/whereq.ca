import type { CSSProperties } from "react";
import { Kicker } from "@/components/section/Kicker";

const CELLS: { c: string; q: string; prod: string; what: string }[] = [
  { c: "var(--c-where)", q: "WHERE", prod: "WhereQ", what: "The spatial engine. Maps, routing, places." },
  { c: "var(--c-who)", q: "WHO", prod: "KeyToMarvel", what: "The universal passport. Identity for every world." },
  { c: "var(--c-when)", q: "WHEN", prod: "Chroniq", what: "The temporal engine. Time, events, booking." },
  { c: "var(--c-why)", q: "WHY", prod: "WhereQ.ca", what: "The research station. Ideas are tested here first." },
  { c: "var(--c-what)", q: "WHAT", prod: "whereq.github.io", what: "Mission control. The public voice of the universe." },
  { c: "var(--ink-soft)", q: "HOW", prod: "The incubated", what: "FlowDesk, CCBus, CatoBigato — proof the system works." },
];

/** Section 2 — the origin story: 5W + 1H mapped to real platforms. */
export function OriginSection() {
  return (
    <section className="section" id="origin">
      <div className="wrap">
        <Kicker num="01">THE ORIGIN STORY</Kicker>
        <h2 className="section-title" data-reveal="">
          Every great answer starts with six questions.
        </h2>
        <p className="section-lede" data-reveal="">
          Journalists, engineers and detectives have relied on the same
          framework for a century: 5W + 1H. The WhereQ Universe takes it
          literally — each question became a real platform with a real
          responsibility, and together they form the foundation every new
          product is built upon.
        </p>
        <div className="origin-grid" data-reveal="">
          {CELLS.map((cell) => (
            <div
              key={cell.q}
              className="origin-cell"
              style={{ "--q-c": cell.c } as CSSProperties}
            >
              <p className="q">{cell.q}</p>
              <p className="arrow">↓</p>
              <p className="prod">{cell.prod}</p>
              <p className="what-it-is">{cell.what}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
