import type { CSSProperties } from "react";
import clsx from "clsx";
import type { Planet } from "../data/universe";

interface PlanetPanelProps {
  /** The planet to show. Kept set during the close transition so the
   *  panel can fade out without blanking its content. */
  planet: Planet | null;
  open: boolean;
  onClose: () => void;
}

/** Slide-in detail panel for a galaxy planet, driven by `planet`. */
export function PlanetPanel({ planet, open, onClose }: PlanetPanelProps) {
  const soon = planet?.status === "soon";
  const style = planet
    ? ({ "--panel-accent": planet.color } as CSSProperties)
    : undefined;

  return (
    <aside
      className={clsx("planet-panel", open && "is-open")}
      aria-hidden={!open}
      role="dialog"
      aria-label="Planet details"
      style={style}
    >
      <button
        className="pp-close"
        type="button"
        aria-label="Close"
        onClick={onClose}
      >
        ✕
      </button>
      <p className="pp-q">{planet?.question}</p>
      <h3 className="pp-name">{planet?.name}</h3>
      <p className="pp-metaphor">{planet?.metaphor}</p>
      <span className={clsx("pp-status", soon ? "is-soon" : "is-live")}>
        {soon ? "COMING SOON" : "LIVE"}
      </span>
      <p className="pp-blurb">{planet?.blurb}</p>
      <ul className="pp-chips">
        {planet?.responsibilities.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
      <div className="pp-actions">
        {planet && !soon ? (
          <a
            className="pp-visit"
            href={planet.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Visit {planet.domain} ↗
          </a>
        ) : (
          <span className="pp-visit is-disabled">
            {planet?.domain} — soon
          </span>
        )}
        <a
          className="pp-dive"
          href={planet ? `#dive-${planet.id}` : "#planets"}
          onClick={onClose}
        >
          Read the deep dive ↓
        </a>
      </div>
    </aside>
  );
}
