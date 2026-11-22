"use client";

import { useEffect, useState } from "react";

type ParsedFigure = {
  amount: number;
  suffix: string;
  decimals: number;
};

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function parseFigure(value: string): ParsedFigure | null {
  const match = value.trim().match(/^(\d+(?:,\d{3})*(?:\.\d+)?)(.*)$/);
  if (!match) {
    return null;
  }
  const raw = match[1].replace(/,/g, "");
  const amount = Number(raw);
  if (!Number.isFinite(amount)) {
    return null;
  }
  const decimals = raw.includes(".") ? (raw.split(".")[1]?.length ?? 0) : 0;
  return { amount, suffix: match[2], decimals };
}

function formatFigure(amount: number, figure: ParsedFigure): string {
  const text = figure.decimals > 0 ? amount.toFixed(figure.decimals) : String(Math.round(amount));
  return `${text}${figure.suffix}`;
}

export function useHudReady(active = true, delay = 160): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!active) {
      setReady(false);
      return;
    }
    if (prefersReducedMotion()) {
      setReady(true);
      return;
    }
    const timer = window.setTimeout(() => setReady(true), delay);
    return () => window.clearTimeout(timer);
  }, [active, delay]);

  return ready;
}

export function useCountUp(value: string, ready: boolean, delay = 0): string {
  const [shown, setShown] = useState(() => {
    const parsed = parseFigure(value);
    return parsed ? formatFigure(0, parsed) : value;
  });

  useEffect(() => {
    const parsed = parseFigure(value);
    if (!parsed || prefersReducedMotion()) {
      setShown(value);
      return;
    }
    if (!ready) {
      setShown(formatFigure(0, parsed));
      return;
    }

    let frame = 0;
    const duration = 1200;
    const started = performance.now() + delay;
    const tick = (now: number) => {
      const progress = Math.min(1, Math.max(0, (now - started) / duration));
      const eased = 1 - (1 - progress) ** 3;
      setShown(formatFigure(parsed.amount * eased, parsed));
      if (progress < 1) {
        frame = window.requestAnimationFrame(tick);
      }
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [delay, ready, value]);

  return shown;
}

export function CountUp({
  value,
  ready,
  delay = 0,
  className,
}: {
  value: string;
  ready: boolean;
  delay?: number;
  className?: string;
}) {
  const shown = useCountUp(value, ready, delay);
  return <span className={className}>{shown}</span>;
}
