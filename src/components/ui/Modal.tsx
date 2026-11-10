import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "../../utils/cn";
import { Icon } from "./Icon";
import { Button } from "./Button";
import { usePresence } from "./usePresence";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}

const widths = { sm: "sm:max-w-md", md: "sm:max-w-lg", lg: "sm:max-w-2xl", xl: "sm:max-w-3xl" };

export function Modal({ open, onClose, title, subtitle, icon, children, footer, size = "md" }: ModalProps) {
  const { mounted, visible } = usePresence(open, 320);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-100 flex items-end justify-center sm:items-center sm:p-6">
      <div
        onClick={onClose}
        className={cn(
          "absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-300",
          visible ? "opacity-100" : "opacity-0"
        )}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl shadow-blue-900/30 ring-1 ring-white/60 sm:rounded-3xl",
          "transition-all duration-350 ease-[cubic-bezier(0.22,1,0.36,1)]",
          widths[size],
          visible ? "translate-y-0 scale-100 opacity-100" : "translate-y-10 scale-95 opacity-0"
        )}
      >
        <div className="relative shrink-0 overflow-hidden bg-linear-to-r from-blue-700 via-blue-600 to-sky-500 px-6 py-5 text-white sm:px-7 sm:py-6">
          <div className="pointer-events-none absolute -top-10 -right-10 h-36 w-36 rounded-full bg-white/15 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-12 left-1/3 h-28 w-28 rounded-full bg-sky-300/30 blur-2xl" />
          <div className="relative flex items-start gap-4">
            {icon && (
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/20 text-xl ring-1 ring-white/30 backdrop-blur">
                <Icon name={icon} />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <h3 className="text-lg leading-tight font-extrabold">{title}</h3>
              {subtitle && <p className="mt-1 text-sm leading-relaxed text-blue-100">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-white/15 text-sm transition-all duration-300 hover:rotate-90 hover:bg-white/30"
              aria-label="Tutup"
            >
              <Icon name="cross" />
            </button>
          </div>
        </div>
        <div className="thin-scroll min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && (
          <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/70 px-6 py-4 sm:flex-row sm:justify-end">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

interface ConfirmProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmText = "Ya, hapus" }: ConfirmProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      icon="exclamation"
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Batal
          </Button>
          <Button variant="danger" icon="trash" onClick={onConfirm}>
            {confirmText}
          </Button>
        </>
      }
    >
      <p className="text-sm leading-relaxed text-slate-600">{message}</p>
    </Modal>
  );
}
