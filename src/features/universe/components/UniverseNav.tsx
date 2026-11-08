import { Link } from "react-router-dom";
import clsx from "clsx";
import { useScrollSpy } from "@/hooks/useScrollSpy";

/** Stable list of section ids the nav tracks (module-level for the hook). */
const SECTION_IDS = [
  "origin",
  "galaxy",
  "planets",
  "incubation",
  "architecture",
  "roadmap",
  "future",
];

const LINKS: { id: string; label: string; keep?: boolean }[] = [
  { id: "origin", label: "ORIGIN" },
  { id: "galaxy", label: "GALAXY", keep: true },
  { id: "planets", label: "PLANETS", keep: true },
  { id: "incubation", label: "INCUBATION" },
  { id: "architecture", label: "ARCHITECTURE" },
  { id: "roadmap", label: "ROADMAP", keep: true },
  { id: "future", label: "FUTURE" },
];

/** Fixed top navigation with scroll-spy active state. */
export function UniverseNav() {
  const active = useScrollSpy(SECTION_IDS);
  return (
    <nav className="topnav" aria-label="Universe navigation">
      <a className="brand nav-keep" href="#top">
        WHEREQ<b>·</b>UNIVERSE
      </a>
      <div className="nav-links">
        {LINKS.map((l) => (
          <a
            key={l.id}
            href={`#${l.id}`}
            className={clsx(l.keep && "nav-keep", active === l.id && "is-active")}
          >
            {l.label}
          </a>
        ))}
        <Link to="/lab" className="nav-keep">
          LAB ↗
        </Link>
      </div>
    </nav>
  );
}
