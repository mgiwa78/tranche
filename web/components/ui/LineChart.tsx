"use client";

import { useId, useState } from "react";

export interface ChartPoint {
  date: string;
  value: number;
}

/**
 * Small dependency-free area/line chart. Hover or focus shows the value for a
 * day. Sized by its container width via viewBox; not intended for huge series.
 */
export function LineChart({
  points,
  label,
  height = 120,
  format = (v: number) => v.toLocaleString("en-NG"),
}: {
  points: ChartPoint[];
  label: string;
  height?: number;
  format?: (value: number) => string;
}) {
  const gradientId = useId();
  const [active, setActive] = useState<number | null>(null);
  const width = 600;
  const pad = 4;
  const max = Math.max(1, ...points.map((p) => p.value));
  const step = points.length > 1 ? (width - pad * 2) / (points.length - 1) : 0;
  const x = (i: number) => pad + i * step;
  const y = (v: number) => height - pad - (v / max) * (height - pad * 2);
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const area = points.length
    ? `${line} L${x(points.length - 1).toFixed(1)},${height} L${x(0).toFixed(1)},${height} Z`
    : "";
  const shown = active !== null ? points[active] : null;

  return (
    <figure className="m-0">
      <figcaption className="mb-1 flex items-baseline justify-between text-xs text-faint">
        <span>{label}</span>
        <span className="font-mono text-ink">
          {shown ? `${shown.date}: ${format(shown.value)}` : `peak ${format(max)}`}
        </span>
      </figcaption>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full text-accent"
        role="img"
        aria-label={`${label} over time`}
        onMouseLeave={() => setActive(null)}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const ratio = (e.clientX - rect.left) / rect.width;
          setActive(Math.min(points.length - 1, Math.max(0, Math.round(ratio * (points.length - 1)))));
        }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.25" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        {area && <path d={area} fill={`url(#${gradientId})`} />}
        {line && (
          <path
            d={line}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}
        {active !== null && points[active] && (
          <circle cx={x(active)} cy={y(points[active].value)} r="4" fill="currentColor" />
        )}
      </svg>
    </figure>
  );
}
