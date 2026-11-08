import { useEffect, useRef } from "react";
import { Starfield } from "@/components/starfield/Starfield";
import { useReveal } from "@/hooks/useReveal";
import { UniverseNav } from "./components/UniverseNav";
import { Hero } from "./components/Hero";
import { OriginSection } from "./components/OriginSection";
import { GalaxySection } from "./components/GalaxySection";
import { PlanetDives } from "./components/PlanetDives";
import { IncubationSection } from "./components/IncubationSection";
import { ArchitectureSection } from "./components/ArchitectureSection";
import { RoadmapSection } from "./components/RoadmapSection";
import { FutureSection } from "./components/FutureSection";
import { UniverseFooter } from "./components/UniverseFooter";
import "./universe.css";

/**
 * WhereQ Universe — the public entrance and ecosystem map of WhereQ.ca.
 *
 * Full-bleed page with its own deep-space theme (scoped under
 * `.wq-universe`), starfield backdrop, fixed nav and footer. Rendered
 * outside the app's header/footer shell.
 */
export default function UniversePage() {
  const rootRef = useRef<HTMLDivElement>(null);
  useReveal(rootRef);

  // Smooth in-page anchor scrolling + deep-space page background while
  // the Universe is mounted; both are restored on unmount so the rest of
  // the app shell keeps its own behavior.
  useEffect(() => {
    const html = document.documentElement;
    const prevScroll = html.style.scrollBehavior;
    const prevBg = document.body.style.backgroundColor;
    html.style.scrollBehavior = "smooth";
    document.body.style.backgroundColor = "#05080E";
    return () => {
      html.style.scrollBehavior = prevScroll;
      document.body.style.backgroundColor = prevBg;
    };
  }, []);

  return (
    <div className="wq-universe" ref={rootRef}>
      <Starfield className="starfield" />
      <UniverseNav />
      <main className="universe-main" id="top">
        <Hero />
        <OriginSection />
        <GalaxySection />
        <PlanetDives />
        <IncubationSection />
        <ArchitectureSection />
        <RoadmapSection />
        <FutureSection />
        <UniverseFooter />
      </main>
    </div>
  );
}
