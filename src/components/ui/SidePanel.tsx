import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "../../utils/cn";
import { Button } from "./Button";
import { Icon } from "./Icon";
import { usePresence } from "./usePresence";

interface SidePanelProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function SidePanel({ open, onClose, title, subtitle, children, footer }: SidePanelProps) {
  const { mounted, visible } = usePresence(open, 300);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-100">
      <div
        onClick={onClose}
        className={cn("absolute inset-0 bg-slate-900/45 transition-opacity duration-300 ease-out", visible ? "opacity-100" : "opacity-0")}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "absolute inset-y-0 right-0 flex w-full max-w-md transform-gpu flex-col bg-white shadow-2xl shadow-blue-950/25 transition-transform duration-300 ease-out will-change-transform motion-reduce:transition-none",
          visible ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="relative flex shrink-0 items-start gap-3 overflow-hidden bg-linear-to-r from-blue-700 via-blue-600 to-sky-500 px-5 py-5 text-white">
          <div className="pointer-events-none absolute -top-10 -right-10 h-36 w-36 rounded-full bg-white/15 blur-2xl" />
          <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20 ring-1 ring-white/25">
            <Icon name="filter" />
          </span>
          <div className="relative min-w-0 flex-1">
            <h2 className="text-lg font-extrabold">{title}</h2>
            {subtitle && <p className="mt-1 text-sm text-blue-100">{subtitle}</p>}
          </div>
          <Button variant="ghost" size="sm" icon="cross" iconOnly title="Tutup panel filter" className="relative text-white hover:bg-white/15 hover:text-white" onClick={onClose} />
        </div>
        <div className="thin-scroll min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer && <div className="flex shrink-0 gap-2 border-t border-slate-100 bg-slate-50/80 px-5 py-4">{footer}</div>}
      </aside>
    </div>,
    document.body
  );
}
