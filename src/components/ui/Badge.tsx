import type { ReactNode } from "react";
import { cn } from "../../utils/cn";

type Tone = "blue" | "sky" | "indigo" | "green" | "red" | "amber" | "slate" | "violet" | "teal";

const tones: Record<Tone, string> = {
  blue: "bg-blue-50 text-blue-700 ring-blue-200/70",
  sky: "bg-sky-50 text-sky-700 ring-sky-200/70",
  indigo: "bg-indigo-50 text-indigo-700 ring-indigo-200/70",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200/70",
  red: "bg-rose-50 text-rose-700 ring-rose-200/70",
  amber: "bg-amber-50 text-amber-700 ring-amber-200/70",
  slate: "bg-slate-100 text-slate-600 ring-slate-200/70",
  violet: "bg-violet-50 text-violet-700 ring-violet-200/70",
  teal: "bg-teal-50 text-teal-700 ring-teal-200/70",
};

export function Badge({ children, tone = "blue", className }: { children: ReactNode; tone?: Tone; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] leading-none font-bold ring-1 ring-inset",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export const PREFIX_TONE: Record<string, Tone> = {
  OP: "blue",
  TX: "sky",
  PF: "indigo",
  BL: "violet",
  RE: "teal",
  PAY: "green",
  PO: "amber",
};
