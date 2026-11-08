import { useEffect, type RefObject } from "react";

/**
 * Progressive scroll-reveal.
 *
 * Observes every `[data-reveal]` descendant of `rootRef` and adds the
 * `is-in` class as each enters the viewport. The hidden entrance state is
 * only enabled once JS has mounted (the hook adds `enableClass` to the
 * root), so content is always visible to crawlers, print, and users with
 * `prefers-reduced-motion`.
 *
 * Reusable across any page that opts into the convention.
 */
export function useReveal(
  rootRef: RefObject<HTMLElement | null>,
  enableClass = "wq-anim",
): void {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const targets = Array.from(
      root.querySelectorAll<HTMLElement>("[data-reveal]"),
    );

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (prefersReduced || !("IntersectionObserver" in window)) {
      targets.forEach((el) => el.classList.add("is-in"));
      return;
    }

    root.classList.add(enableClass);

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.01 },
    );

    targets.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [rootRef, enableClass]);
}
