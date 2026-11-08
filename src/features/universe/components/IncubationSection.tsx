import type { CSSProperties } from "react";
import { Kicker } from "@/components/section/Kicker";

const STEPS: { num: string; name: string; desc: string; tone?: "seed" | "grad" }[] = [
  { num: "01", name: "5W Core", desc: "Identity, location, time, validation and voice — ready to build on.", tone: "seed" },
  { num: "02", name: "Ideas", desc: "A new question worth answering emerges." },
  { num: "03", name: "Validation", desc: "Tested on WhereQ.ca with real community feedback." },
  { num: "04", name: "Prototype", desc: "A working world takes shape in the lab." },
  { num: "05", name: "Production", desc: "Hardened, launched, announced from mission control." },
  { num: "06", name: "Independent product", desc: "Its own domain, its own orbit — still powered by the core.", tone: "grad" },
];

const GRADS: { accent: string; name: string; text: string }[] = [
  {
    accent: "var(--c-flowdesk)",
    name: "FlowDesk",
    text: "Graduated as the universe's AI trading platform — built on all five foundations, fronted by NOVA.",
  },
  {
    accent: "var(--c-ccbus)",
    name: "CCBus",
    text: "Graduated as the Web3 & DeFi planet — token creation, presales and liquidity on three chains.",
  },
  {
    accent: "var(--c-cato)",
    name: "CatoBigato",
    text: "Graduated as the learning planet — vibe tutoring for K-12 and beyond.",
  },
  {
    accent: "var(--c-cc)",
    name: "WhereQ.cc",
    text: "Graduated as the photo planet — a strictly-local gallery with on-demand AI enhancement.",
  },
];

/** Section 5 — how new planets are incubated and graduate. */
export function IncubationSection() {
  return (
    <section className="section section--alt" id="incubation">
      <div className="wrap">
        <Kicker num="04" accent="var(--c-why)">
          THE INCUBATION SYSTEM
        </Kicker>
        <h2 className="section-title" data-reveal="">
          How new planets are born.
        </h2>
        <p className="section-lede" data-reveal="">
          Every product follows the same trajectory: it starts as a question
          inside the 5W core, gets validated in the lab, and graduates into an
          independent world.
        </p>

        <div className="incu-flow" data-reveal="">
          {STEPS.map((s) => (
            <div
              key={s.num}
              className={
                "incu-step" + (s.tone ? ` incu-step--${s.tone}` : "")
              }
            >
              <p className="incu-num">{s.num}</p>
              <p className="incu-name">{s.name}</p>
              <p className="incu-desc">{s.desc}</p>
            </div>
          ))}
        </div>

        <div className="incu-grads" data-reveal="">
          {GRADS.map((g) => (
            <div
              key={g.name}
              className="grad-card"
              style={{ "--accent": g.accent } as CSSProperties}
            >
              <p className="trail">
                5W CORE → LAB → <b>ORBIT</b>
              </p>
              <h4>{g.name}</h4>
              <p>{g.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
