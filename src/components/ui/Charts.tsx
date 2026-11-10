import { useEffect, useState } from "react";
import { cn } from "../../utils/cn";
import { formatCompact, formatRupiah } from "../../lib/format";

export function useCountUp(target: number, duration = 900) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setV(target * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return v;
}

function useGrow() {
  const [g, setG] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setG(true), 80);
    return () => clearTimeout(t);
  }, []);
  return g;
}

export interface BarDatum {
  label: string;
  a: number;
  b: number;
}

export function BarChart({ data, aLabel, bLabel }: { data: BarDatum[]; aLabel: string; bLabel: string }) {
  const grown = useGrow();
  const max = Math.max(1, ...data.flatMap((d) => [d.a, d.b]));
  const ticks = [1, 0.75, 0.5, 0.25, 0];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-500">
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-linear-to-b from-sky-400 to-blue-600" /> {aLabel}
        </span>
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-linear-to-b from-indigo-300 to-indigo-500" /> {bLabel}
        </span>
      </div>
      <div className="flex gap-3">
        <div className="flex h-60 flex-col justify-between pb-0 text-[10px] font-semibold text-slate-400">
          {ticks.map((t) => (
            <span key={t} className="-translate-y-1.5 text-right">
              {formatCompact(max * t)}
            </span>
          ))}
        </div>
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-0 flex h-60 flex-col justify-between">
            {ticks.map((t) => (
              <div key={t} className="border-t border-dashed border-blue-100" />
            ))}
          </div>
          <div className="relative flex h-60 items-end justify-around gap-2">
            {data.map((d) => (
              <div key={d.label} className="group relative flex h-full flex-1 items-end justify-center gap-1.5 sm:gap-2.5">
                <div
                  className="w-full max-w-9 rounded-t-xl bg-linear-to-t from-blue-600 to-sky-400 transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:brightness-110"
                  style={{ height: grown ? `${(d.a / max) * 100}%` : "0%" }}
                />
                <div
                  className="w-full max-w-9 rounded-t-xl bg-linear-to-t from-indigo-500 to-indigo-300 transition-all delay-100 duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:brightness-110"
                  style={{ height: grown ? `${(d.b / max) * 100}%` : "0%" }}
                />
                <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 translate-y-2 rounded-xl bg-slate-900 px-3 py-2 text-[11px] font-semibold whitespace-nowrap text-white opacity-0 shadow-xl transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                  <p className="mb-1 text-blue-200">{d.label}</p>
                  <p>
                    {aLabel}: {formatRupiah(d.a)}
                  </p>
                  <p>
                    {bLabel}: {formatRupiah(d.b)}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex justify-around gap-2">
            {data.map((d) => (
              <span key={d.label} className="flex-1 text-center text-[11px] font-bold text-slate-500">
                {d.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export interface DonutDatum {
  label: string;
  value: number;
  color: string;
}

export function DonutChart({ data, centerLabel }: { data: DonutDatum[]; centerLabel: string }) {
  const grown = useGrow();
  const [hover, setHover] = useState<string | null>(null);
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = 62;
  const C = 2 * Math.PI * r;
  let acc = 0;

  const hovered = data.find((d) => d.label === hover);

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row lg:flex-col xl:flex-row">
      <div className="relative h-44 w-44 shrink-0">
        <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90">
          <circle cx="80" cy="80" r={r} fill="none" stroke="#eff6ff" strokeWidth="18" />
          {total > 0 &&
            data.map((d) => {
              const len = (d.value / total) * C;
              const gap = data.length > 1 ? 3 : 0;
              const el = (
                <circle
                  key={d.label}
                  cx="80"
                  cy="80"
                  r={r}
                  fill="none"
                  stroke={d.color}
                  strokeWidth={hover === d.label ? 22 : 18}
                  strokeLinecap="round"
                  strokeDasharray={`${grown ? Math.max(0, len - gap) : 0} ${C}`}
                  strokeDashoffset={-acc}
                  className="cursor-pointer transition-all duration-1000 ease-out"
                  onMouseEnter={() => setHover(d.label)}
                  onMouseLeave={() => setHover(null)}
                />
              );
              acc += len;
              return el;
            })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-extrabold text-slate-800 transition-all">{hovered ? hovered.value : total}</span>
          <span className="text-[11px] font-semibold text-slate-500">{hovered ? hovered.label : centerLabel}</span>
        </div>
      </div>
      <div className="grid w-full grid-cols-2 gap-x-4 gap-y-2.5">
        {data.map((d) => (
          <div
            key={d.label}
            onMouseEnter={() => setHover(d.label)}
            onMouseLeave={() => setHover(null)}
            className={cn(
              "flex cursor-default items-center gap-2 rounded-lg px-2 py-1 text-xs transition-colors duration-300",
              hover === d.label && "bg-blue-50"
            )}
          >
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
            <span className="flex-1 font-semibold text-slate-600">{d.label}</span>
            <span className="font-extrabold text-slate-800">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
