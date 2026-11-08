import { useEffect, useRef } from "react";

interface Star {
  x: number;
  y: number;
  r: number;
  base: number;
  amp: number;
  ph: number;
  sp: number;
}

interface StarfieldProps {
  /** Extra class names for the canvas (positioning is left to CSS). */
  className?: string;
  /** Star count multiplier. 1 ≈ one star per 9000 device px². */
  density?: number;
  /** Twinkle speed multiplier; 0 renders a static field. */
  motion?: number;
}

/**
 * Animated deep-space starfield rendered to a full-viewport `<canvas>`.
 *
 * Twinkles via `requestAnimationFrame` and drifts slightly with scroll for
 * a subtle parallax. Honors `prefers-reduced-motion` (renders static) and
 * keeps the parallax working even when the rAF loop is paused. Generic and
 * reusable wherever a starfield backdrop is wanted.
 */
export function Starfield({
  className,
  density = 1,
  motion = 1,
}: StarfieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const animate = motion > 0 && !reduceMotion;

    let stars: Star[] = [];
    let raf: number | null = null;

    const makeStars = () => {
      const area = canvas.width * canvas.height;
      const count = Math.round((area / 9000) * density);
      stars = [];
      for (let i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          r: Math.random() * 1.3 + 0.3,
          base: Math.random() * 0.5 + 0.25,
          amp: Math.random() * 0.35,
          ph: Math.random() * Math.PI * 2,
          sp: Math.random() * 0.9 + 0.3,
        });
      }
    };

    const sizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      makeStars();
    };

    const draw = (t: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const shift =
        (window.scrollY || 0) * 0.04 * (canvas.width / window.innerWidth);
      for (const s of stars) {
        const o =
          s.base + (animate ? Math.sin(t * 0.001 * s.sp + s.ph) * s.amp : 0);
        let y = s.y - shift * s.r;
        y = ((y % canvas.height) + canvas.height) % canvas.height;
        ctx.globalAlpha = Math.max(0.05, o);
        ctx.fillStyle = "#CFE0F2";
        ctx.beginPath();
        ctx.arc(s.x, y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    const loop = (t: number) => {
      draw(t);
      raf = requestAnimationFrame(loop);
    };

    const onResize = () => {
      sizeCanvas();
      draw(0);
    };
    const onScroll = () => {
      if (!raf) draw(0);
    };

    sizeCanvas();
    draw(0);
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, { passive: true });
    if (animate) raf = requestAnimationFrame(loop);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll);
    };
  }, [density, motion]);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
