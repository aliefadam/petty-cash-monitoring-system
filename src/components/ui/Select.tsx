import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "../../utils/cn";
import { Icon } from "./Icon";
import { usePresence } from "./usePresence";

export interface Option {
  value: string;
  label: string;
  icon?: string;
}

interface SelectProps {
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  label?: string;
  placeholder?: string;
  icon?: string;
  error?: string;
  className?: string;
  size?: "md" | "sm";
}

export function Select({ value, onChange, options, label, placeholder = "Pilih...", icon, error, className, size = "md" }: SelectProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0, up: false, maxH: 260 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { mounted, visible } = usePresence(open, 200);

  const selected = options.find((o) => o.value === value);

  const place = useCallback(() => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const below = window.innerHeight - r.bottom - 12;
    const above = r.top - 12;
    const up = below < 200 && above > below;
    setPos({
      top: up ? r.top - 8 : r.bottom + 8,
      left: r.left,
      width: r.width,
      up,
      maxH: Math.max(140, Math.min(280, up ? above - 8 : below - 8)),
    });
  }, []);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onScroll = (e: Event) => {
      if (menuRef.current?.contains(e.target as Node)) return;
      place();
    };
    document.addEventListener("mousedown", down);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", down);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open, place]);

  const toggle = () => {
    if (!open) setActive(Math.max(0, options.findIndex((o) => o.value === value)));
    setOpen((o) => !o);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggle();
      }
      return;
    }
    if (e.key === "Escape") setOpen(false);
    else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(options.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (options[active]) {
        onChange(options[active].value);
        setOpen(false);
      }
    }
  };

  return (
    <div className={cn("w-full", className)}>
      {label && <label className="mb-1.5 block text-xs font-bold tracking-wide text-slate-600">{label}</label>}
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        onKeyDown={onKey}
        className={cn(
          "flex w-full cursor-pointer items-center gap-2.5 rounded-xl border bg-white/80 text-left text-sm font-medium transition-all duration-300 outline-none",
          size === "md" ? "h-12 px-4" : "h-11 px-3.5",
          open ? "border-blue-500 bg-white ring-4 ring-blue-100" : "hover:border-blue-300",
          error ? "border-rose-300" : !open && "border-slate-200"
        )}
      >
        {(selected?.icon || icon) && <Icon name={(selected?.icon || icon)!} className="text-base text-blue-600" />}
        <span className={cn("flex-1 truncate", selected ? "text-slate-800" : "font-normal text-slate-400")}>
          {selected ? selected.label : placeholder}
        </span>
        <Icon
          name="angle-small-down"
          className={cn("text-xl text-slate-400 transition-transform duration-300", open && "rotate-180 text-blue-600")}
        />
      </button>
      {error && <p className="mt-1.5 text-xs font-medium text-rose-600">{error}</p>}

      {mounted &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: "fixed",
              left: pos.left,
              width: pos.width,
              top: pos.up ? undefined : pos.top,
              bottom: pos.up ? window.innerHeight - pos.top : undefined,
              maxHeight: pos.maxH,
              transformOrigin: pos.up ? "bottom" : "top",
            }}
            className={cn(
              "thin-scroll z-300 overflow-y-auto rounded-2xl border border-blue-100 bg-white p-1.5 shadow-xl shadow-blue-900/15",
              "transition-all duration-200 ease-out",
              visible ? "translate-y-0 scale-100 opacity-100" : cn("scale-95 opacity-0", pos.up ? "translate-y-2" : "-translate-y-2")
            )}
          >
            {options.map((o, i) => {
              const isSel = o.value === value;
              return (
                <button
                  key={o.value}
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors duration-150",
                    isSel ? "bg-linear-to-r from-blue-600 to-sky-500 text-white" : active === i ? "bg-blue-50 text-blue-700" : "text-slate-700"
                  )}
                >
                  {o.icon && <Icon name={o.icon} className="text-base" />}
                  <span className="flex-1 truncate">{o.label}</span>
                  {isSel && <Icon name="check" className="text-sm" />}
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </div>
  );
}
