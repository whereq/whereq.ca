import { useMemo, useState, type KeyboardEvent } from "react";
import clsx from "clsx";
import { UNIVERSE, PLANET_BY_ID, type Planet } from "../data/universe";

const W = 1200;
const H = 960;
const CX = 600;
const CY = 470;
const RING_R: Record<Planet["ring"], number> = { inner: 252, outer: 408 };

function pos(p: Planet): { x: number; y: number } {
  const a = (p.angle * Math.PI) / 180;
  return {
    x: CX + RING_R[p.ring] * Math.cos(a),
    y: CY - RING_R[p.ring] * Math.sin(a),
  };
}

interface PlanetGalaxyProps {
  onSelect: (p: Planet) => void;
}

/**
 * Interactive 5W + 1H galaxy map, rebuilt from `UNIVERSE`.
 * Hover/focus traces a planet's dependency edges; click/Enter opens the
 * detail panel via `onSelect`.
 */
export function PlanetGalaxy({ onSelect }: PlanetGalaxyProps) {
  const [focus, setFocus] = useState<string | null>(null);

  const neighbors = useMemo(() => {
    const m: Record<string, Set<string>> = {};
    UNIVERSE.planets.forEach((p) => (m[p.id] = new Set([p.id])));
    UNIVERSE.edges.forEach((e) => {
      e.to.forEach((t) => {
        m[e.from]?.add(t);
        m[t]?.add(e.from);
      });
    });
    return m;
  }, []);

  const edges = useMemo(() => {
    const list: { d: string; color: string; from: string; to: string }[] = [];
    UNIVERSE.edges.forEach((e) => {
      const a = PLANET_BY_ID[e.from];
      const pa = pos(a);
      e.to.forEach((toId) => {
        const pb = pos(PLANET_BY_ID[toId]);
        /* curve gently toward the core so lines don't overlap planets */
        const mx = (pa.x + pb.x) / 2 + (CX - (pa.x + pb.x) / 2) * 0.25;
        const my = (pa.y + pb.y) / 2 + (CY - (pa.y + pb.y) / 2) * 0.25;
        list.push({
          d: `M${pa.x} ${pa.y} Q${mx} ${my} ${pb.x} ${pb.y}`,
          color: a.color,
          from: e.from,
          to: toId,
        });
      });
    });
    return list;
  }, []);

  const near = focus ? neighbors[focus] : null;

  const handleKey = (p: Planet) => (ev: KeyboardEvent) => {
    if (ev.key === "Enter" || ev.key === " ") {
      ev.preventDefault();
      onSelect(p);
    }
  };

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={clsx("galaxy-svg", focus && "has-focus")}
      role="img"
      aria-label="Interactive map of the WhereQ Universe: five foundational planets (Where, Who, When, Why, What) and an outer ring of products and platforms (FlowDesk, CCBus, CatoBigato, WhereQ Cloud, WhereQ.cc, QHaul) connected by dependency lines."
    >
      <defs>
        {UNIVERSE.planets.map((p) => (
          <radialGradient
            key={p.id}
            id={`wq-grad-${p.id}`}
            cx="35%"
            cy="32%"
            r="75%"
          >
            <stop offset="0%" stopColor={p.color} stopOpacity="1" />
            <stop offset="62%" stopColor={p.color} stopOpacity="0.55" />
            <stop offset="100%" stopColor="#070B12" stopOpacity="0.9" />
          </radialGradient>
        ))}
        <radialGradient id="wq-grad-core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
          <stop offset="45%" stopColor="#BFD9F2" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#0A0E13" stopOpacity="0" />
        </radialGradient>
      </defs>

      <g className="g-rings">
        <circle cx={CX} cy={CY} r={RING_R.inner} className="orbit-ring" />
        <circle
          cx={CX}
          cy={CY}
          r={RING_R.outer}
          className="orbit-ring orbit-ring--outer"
        />
        {(["inner", "outer"] as const).map((ring, i) => (
          <g
            key={ring}
            className={`orbit-sat orbit-sat--${i}`}
            style={{ transformOrigin: `${CX}px ${CY}px` }}
          >
            <circle cx={CX + RING_R[ring]} cy={CY} r={3} className="sat-dot" />
          </g>
        ))}
      </g>

      <g className="g-edges">
        {edges.map((e, idx) => (
          <path
            key={idx}
            d={e.d}
            className={clsx(
              "edge",
              (focus === e.from || focus === e.to) && "is-lit",
            )}
            stroke={e.color}
          />
        ))}
      </g>

      <g className="g-core">
        <circle cx={CX} cy={CY} r={88} fill="url(#wq-grad-core)" />
        <circle cx={CX} cy={CY} r={34} className="core-dot" />
        <text x={CX} y={CY - 2} className="core-label" textAnchor="middle">
          5W + 1H
        </text>
        <text x={CX} y={CY + 18} className="core-sub" textAnchor="middle">
          THE CORE
        </text>
      </g>

      <g className="g-nodes">
        {UNIVERSE.planets.map((p) => {
          const c = pos(p);
          const lit = near ? near.has(p.id) : false;
          return (
            <g
              key={p.id}
              className={clsx(
                "planet-node",
                p.status === "soon" && "is-soon",
                lit && "is-lit",
                focus === p.id && "is-primary",
              )}
              tabIndex={0}
              role="button"
              aria-label={`${p.question} — ${p.name}${
                p.status === "soon" ? " (coming soon)" : ""
              }`}
              onMouseEnter={() => setFocus(p.id)}
              onMouseLeave={() => setFocus(null)}
              onFocus={() => setFocus(p.id)}
              onBlur={() => setFocus(null)}
              onClick={() => onSelect(p)}
              onKeyDown={handleKey(p)}
            >
              <circle
                cx={c.x}
                cy={c.y}
                r={p.size + 14}
                className="node-halo"
                fill={p.color}
              />
              <circle
                cx={c.x}
                cy={c.y}
                r={p.size}
                fill={`url(#wq-grad-${p.id})`}
                className="node-body"
                stroke={p.color}
              />
              {p.status === "soon" && (
                <circle
                  cx={c.x}
                  cy={c.y}
                  r={p.size + 7}
                  className="node-soon-ring"
                  stroke={p.color}
                />
              )}
              <text
                x={c.x}
                y={c.y - p.size - 16}
                className="node-q"
                textAnchor="middle"
                fill={p.color}
              >
                {p.question}
              </text>
              <text
                x={c.x}
                y={c.y + p.size + 26}
                className="node-name"
                textAnchor="middle"
              >
                {p.name}
              </text>
              {p.status === "soon" && (
                <text
                  x={c.x}
                  y={c.y + p.size + 44}
                  className="node-soon"
                  textAnchor="middle"
                  fill={p.color}
                >
                  COMING SOON
                </text>
              )}
            </g>
          );
        })}
      </g>
    </svg>
  );
}
