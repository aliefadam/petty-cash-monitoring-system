import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import { cn } from "../../utils/cn";
import { Icon } from "./Icon";
import { usePresence } from "./usePresence";

interface SearchOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  field: "inv" | "tl" | "rfq" | "pr" | "po" | "reference";
  label: string;
  placeholder?: string;
  error?: string;
}

export function SearchableSelect({ value, onChange, field, label, placeholder = "Cari atau pilih...", error }: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState<SearchOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0, up: false, maxHeight: 280 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const { mounted, visible } = usePresence(open, 200);

  const place = useCallback(() => {
    const button = buttonRef.current;
    if (!button) return;
    const rect = button.getBoundingClientRect();
    const below = window.innerHeight - rect.bottom - 12;
    const above = rect.top - 12;
    const up = below < 240 && above > below;
    setPosition({
      top: up ? rect.top - 8 : rect.bottom + 8,
      left: rect.left,
      width: rect.width,
      up,
      maxHeight: Math.max(160, Math.min(320, up ? above - 8 : below - 8)),
    });
  }, []);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      axios.get<{ options: SearchOption[] }>("/rekonsiliasi/lookups", {
        params: { field, q: search },
        headers: { Accept: "application/json", "X-Requested-With": "XMLHttpRequest" },
        withCredentials: true,
        signal: controller.signal,
      }).then(({ data }) => setOptions(data.options))
        .catch((requestError) => {
          if (!axios.isCancel(requestError)) setOptions([]);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 220);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [field, open, search]);

  useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();
    const onMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onScroll = (event: Event) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      place();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open, place]);

  return (
    <div className="w-full">
      <label className="mb-1.5 block text-xs font-bold tracking-wide text-slate-600">{label}</label>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => { setSearch(""); setOpen((current) => !current); }}
        className={cn(
          "flex h-12 w-full cursor-pointer items-center gap-2.5 rounded-xl border bg-white/80 px-4 text-left text-sm font-medium transition-all duration-300 outline-none",
          open ? "border-blue-500 bg-white ring-4 ring-blue-100" : "border-slate-200 hover:border-blue-300",
          error && "border-rose-300"
        )}
      >
        <span className={cn("flex-1 truncate", value ? "text-slate-800" : "font-normal text-slate-400")}>{value || placeholder}</span>
        <Icon name="search" className={cn("text-base", open ? "text-blue-600" : "text-slate-400")} />
      </button>
      {error && <p className="mt-1.5 text-xs font-medium text-rose-600">{error}</p>}

      {mounted && createPortal(
        <div
          ref={menuRef}
          style={{
            position: "fixed",
            left: position.left,
            width: position.width,
            top: position.up ? undefined : position.top,
            bottom: position.up ? window.innerHeight - position.top : undefined,
            maxHeight: position.maxHeight,
            transformOrigin: position.up ? "bottom" : "top",
          }}
          className={cn(
            "thin-scroll z-300 flex flex-col overflow-hidden rounded-2xl border border-blue-100 bg-white p-1.5 shadow-xl shadow-blue-900/15 transition-all duration-200 ease-out",
            visible ? "translate-y-0 scale-100 opacity-100" : cn("scale-95 opacity-0", position.up ? "translate-y-2" : "-translate-y-2")
          )}
        >
          <div className="relative shrink-0 p-1">
            <Icon name="search" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-slate-400" />
            <input
              ref={searchRef}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && options[0]) {
                  event.preventDefault();
                  onChange(options[0].value);
                  setOpen(false);
                }
              }}
              placeholder={`Cari ${label.toLowerCase()}...`}
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div className="thin-scroll min-h-0 flex-1 overflow-y-auto p-1">
            {loading ? (
              <p className="px-3 py-3 text-center text-xs font-medium text-slate-400">Memuat pilihan...</p>
            ) : options.length ? (
              options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => { onChange(option.value); setOpen(false); }}
                  className={cn(
                    "flex w-full cursor-pointer items-center rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors",
                    option.value === value ? "bg-blue-600 text-white" : "text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                  )}
                >
                  <span className="truncate">{option.label}</span>
                  {option.value === value && <Icon name="check" className="ml-auto shrink-0" />}
                </button>
              ))
            ) : (
              <p className="px-3 py-3 text-center text-xs font-medium text-slate-400">Tidak ada data yang cocok.</p>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
