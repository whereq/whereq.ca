import { useEffect, useState } from "react";

/**
 * Tracks which section is currently under a horizontal sight-line at
 * `offsetRatio` of the viewport height, returning its element id.
 *
 * Rect-based (rather than IntersectionObserver) so it stays accurate
 * through smooth-scroll and works in throttled/odd rendering contexts.
 * Pass a stable `ids` array (e.g. a module-level constant) to avoid
 * re-subscribing on every render.
 */
export function useScrollSpy(
  ids: string[],
  offsetRatio = 0.45,
): string | null {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const update = () => {
      const mid = (window.innerHeight || 800) * offsetRatio;
      let current: string | null = null;
      for (const id of ids) {
        const el = document.getElementById(id);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (r.top <= mid && r.bottom > mid) current = id;
      }
      setActive(current);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [ids, offsetRatio]);

  return active;
}
