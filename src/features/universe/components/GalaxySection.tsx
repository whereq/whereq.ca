import { useEffect, useState } from "react";
import { Kicker } from "@/components/section/Kicker";
import { PlanetGalaxy } from "./PlanetGalaxy";
import { PlanetPanel } from "./PlanetPanel";
import type { Planet } from "../data/universe";

/** Section 3 — the interactive galaxy plus its detail panel. */
export function GalaxySection() {
  const [planet, setPlanet] = useState<Planet | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <section className="section section--alt" id="galaxy">
      <div className="wrap">
        <Kicker num="02" accent="var(--c-what)">
          THE 5W + 1H GALAXY
        </Kicker>
        <h2 className="section-title" data-reveal="">
          One core. Five foundations. An outer ring of products.
        </h2>
        <p className="section-lede" data-reveal="">
          The inner orbit answers the five questions every product needs. The
          outer orbit is where incubated products live — each one drawing on
          the foundations beneath it.
        </p>
      </div>
      <div className="galaxy-stage" data-reveal="">
        <div className="galaxy-mount">
          <PlanetGalaxy
            onSelect={(p) => {
              setPlanet(p);
              setOpen(true);
            }}
          />
        </div>
        <p className="galaxy-hint">
          HOVER A PLANET TO TRACE ITS DEPENDENCIES · CLICK TO EXPLORE
        </p>
      </div>
      <PlanetPanel planet={planet} open={open} onClose={() => setOpen(false)} />
    </section>
  );
}
