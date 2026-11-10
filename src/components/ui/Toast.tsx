import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { cn } from "../../utils/cn";
import { Icon } from "./Icon";

type ToastType = "success" | "error" | "info" | "warning";

interface ToastItem {
  id: number;
  type: ToastType;
  title: string;
  message?: string;
  leaving?: boolean;
}

interface ToastApi {
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
}

const Ctx = createContext<ToastApi | null>(null);

export const useToast = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useToast harus dipakai di dalam ToastProvider");
  return c;
};

const styles: Record<ToastType, { icon: string; ring: string; chip: string; bar: string }> = {
  success: { icon: "check", ring: "border-emerald-100", chip: "from-emerald-500 to-teal-400", bar: "from-emerald-500 to-teal-400" },
  error: { icon: "cross", ring: "border-rose-100", chip: "from-rose-500 to-red-400", bar: "from-rose-500 to-red-400" },
  info: { icon: "info", ring: "border-blue-100", chip: "from-blue-600 to-sky-400", bar: "from-blue-600 to-sky-400" },
  warning: { icon: "exclamation", ring: "border-amber-100", chip: "from-amber-500 to-yellow-400", bar: "from-amber-500 to-yellow-400" },
};

const DURATION = 4000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);

  const dismiss = useCallback((id: number) => {
    setItems((l) => l.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    setTimeout(() => setItems((l) => l.filter((t) => t.id !== id)), 350);
  }, []);

  const push = useCallback(
    (type: ToastType) => (title: string, message?: string) => {
      const id = ++seq.current;
      setItems((l) => [...l.slice(-3), { id, type, title, message }]);
      setTimeout(() => dismiss(id), DURATION);
    },
    [dismiss]
  );

  const api = useMemo<ToastApi>(
    () => ({ success: push("success"), error: push("error"), info: push("info"), warning: push("warning") }),
    [push]
  );

  return (
    <Ctx.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-4 top-4 z-400 flex flex-col items-end gap-3 sm:inset-x-auto sm:right-6 sm:top-6">
        {items.map((t) => {
          const s = styles[t.type];
          return (
            <div
              key={t.id}
              className={cn(
                "pointer-events-auto relative w-full overflow-hidden rounded-2xl border bg-white/95 shadow-xl shadow-blue-900/10 backdrop-blur sm:w-96",
                s.ring,
                t.leaving ? "toast-leave" : "toast-enter"
              )}
            >
              <div className="flex items-start gap-3 p-4">
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-linear-to-br text-white shadow-md",
                    s.chip
                  )}
                >
                  <Icon name={s.icon} bold className="text-sm" />
                </span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="text-sm font-bold text-slate-800">{t.title}</p>
                  {t.message && <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{t.message}</p>}
                </div>
                <button
                  onClick={() => dismiss(t.id)}
                  className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-lg text-xs text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                >
                  <Icon name="cross" />
                </button>
              </div>
              <div className="h-1 w-full bg-slate-100">
                <div
                  className={cn("toast-bar h-full bg-linear-to-r", s.bar)}
                  style={{ animationDuration: `${DURATION}ms` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}
