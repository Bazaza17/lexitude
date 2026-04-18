"use client";

import { useEffect, useRef, useState } from "react";

type Options = {
  duration?: number;
  delay?: number;
  decimals?: number;
  enabled?: boolean;
};

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export function useCountUp(target: number, options: Options = {}) {
  const { duration = 900, delay = 0, decimals = 0, enabled = true } = options;
  const [value, setValue] = useState(enabled ? 0 : target);
  const frameRef = useRef<number | null>(null);
  const prefersReducedMotion = useRef(false);

  useEffect(() => {
    prefersReducedMotion.current =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    if (!enabled || prefersReducedMotion.current) {
      setValue(target);
      return;
    }
    const start = performance.now() + delay;
    const from = 0;
    const to = target;

    const tick = (now: number) => {
      if (now < start) {
        frameRef.current = requestAnimationFrame(tick);
        return;
      }
      const elapsed = now - start;
      const t = Math.min(1, elapsed / duration);
      const eased = easeOutCubic(t);
      const next = from + (to - from) * eased;
      setValue(next);
      if (t < 1) {
        frameRef.current = requestAnimationFrame(tick);
      }
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
    };
  }, [target, duration, delay, enabled]);

  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}
