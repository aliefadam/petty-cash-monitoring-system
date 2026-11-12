import { useEffect, useState } from "react";
import { cn } from "../../utils/cn";
import { Icon } from "./Icon";

interface FieldShellProps {
  label?: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}

export function FieldShell({ label, error, hint, children }: FieldShellProps) {
  return (
    <div className="w-full">
      {label && <label className="mb-1.5 block text-xs font-bold tracking-wide text-slate-600">{label}</label>}
      {children}
      <div
        className={cn(
          "grid transition-all duration-300",
          error || hint ? "mt-1.5 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <p className={cn("overflow-hidden text-xs font-medium", error ? "text-rose-600" : "text-slate-500")}>
          {error || hint}
        </p>
      </div>
    </div>
  );
}

interface TextInputProps {
  value: string;
  onChange: (v: string) => void;
  label?: string;
  placeholder?: string;
  icon?: string;
  type?: "text" | "password" | "date";
  error?: string;
  hint?: string;
  autoFocus?: boolean;
  maxLength?: number;
  autoComplete?: string;
  onEnter?: () => void;
}

export function TextInput({
  value,
  onChange,
  label,
  placeholder,
  icon,
  type = "text",
  error,
  hint,
  autoFocus,
  maxLength,
  autoComplete,
  onEnter,
}: TextInputProps) {
  const [show, setShow] = useState(false);
  const isPwd = type === "password";
  return (
    <FieldShell label={label} error={error} hint={hint}>
      <div className="group relative">
        {icon && (
          <Icon
            name={icon}
            className={cn(
              "pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-base text-slate-400 transition-colors group-focus-within:text-blue-600",
              error && "text-rose-400"
            )}
          />
        )}
        <input
          value={value}
          type={type === "date" ? "date" : isPwd && !show ? "password" : "text"}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onEnter?.()}
          placeholder={placeholder}
          autoFocus={autoFocus}
          maxLength={maxLength}
          autoComplete={autoComplete}
          className={cn(
            "h-12 w-full rounded-xl border bg-white/80 text-sm font-medium text-slate-800 transition-all duration-300 outline-none placeholder:font-normal placeholder:text-slate-400",
            "focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100",
            icon ? "pl-11" : "pl-4",
            isPwd ? "pr-12" : "pr-4",
            error ? "border-rose-300 focus:border-rose-500 focus:ring-rose-100" : "border-slate-200"
          )}
        />
        {isPwd && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute top-1/2 right-2 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
          >
            <Icon name={show ? "eye-crossed" : "eye"} />
          </button>
        )}
      </div>
    </FieldShell>
  );
}

interface TextAreaProps {
  value: string;
  onChange: (v: string) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  rows?: number;
}

export function TextArea({ value, onChange, label, placeholder, error, rows = 3 }: TextAreaProps) {
  return (
    <FieldShell label={label} error={error}>
      <textarea
        value={value}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "w-full resize-none rounded-xl border bg-white/80 px-4 py-3 text-sm font-medium text-slate-800 transition-all duration-300 outline-none placeholder:font-normal placeholder:text-slate-400",
          "focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100",
          error ? "border-rose-300 focus:border-rose-500 focus:ring-rose-100" : "border-slate-200"
        )}
      />
    </FieldShell>
  );
}

interface MoneyInputProps {
  value: number | null;
  onChange: (v: number | null) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  allowDecimal?: boolean;
}

export function MoneyInput({ value, onChange, label, placeholder, error, allowDecimal = false }: MoneyInputProps) {
  const [decimalText, setDecimalText] = useState("");
  useEffect(() => {
    if (allowDecimal) setDecimalText(value === null ? "" : new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(value));
  }, [value, allowDecimal]);
  const display = allowDecimal ? decimalText : value === null ? "" : new Intl.NumberFormat("id-ID").format(value);
  return (
    <FieldShell label={label} error={error}>
      <div className="group relative">
        <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-sm font-bold text-slate-400 transition-colors group-focus-within:text-blue-600">
          Rp
        </span>
        <input
          inputMode="numeric"
          value={display}
          placeholder={placeholder}
          onChange={(e) => {
            const raw = e.target.value.trim();
            if (!raw) {
              onChange(null);
              return;
            }
            if (!allowDecimal) {
              const digits = raw.replace(/\D/g, "").slice(0, 15);
              onChange(digits ? Number(digits) : null);
              return;
            }
            let normalized = raw.replace(/[^\d.,]/g, "");
            if (/[.,]$/.test(normalized)) {
              setDecimalText(raw);
              return;
            }
            const comma = normalized.lastIndexOf(",");
            const dot = normalized.lastIndexOf(".");
            if (comma >= 0 && dot >= 0) {
              const decimal = comma > dot ? "," : ".";
              const thousands = decimal === "," ? "." : ",";
              normalized = normalized.split(thousands).join("").replace(decimal, ".");
            } else if (comma >= 0) {
              normalized = normalized.replace(/\./g, "").replace(",", ".");
            } else if (dot >= 0 && normalized.length - dot - 1 !== 2) {
              normalized = normalized.replace(/\./g, "");
            }
            const parsed = Number(normalized);
            onChange(Number.isFinite(parsed) ? parsed : null);
            setDecimalText(raw);
          }}
          onBlur={() => {
            if (!allowDecimal) return;
            const normalized = decimalText.replace(/[.,]$/, "");
            if (!normalized) {
              onChange(null);
              setDecimalText("");
              return;
            }
            const comma = normalized.lastIndexOf(",");
            const dot = normalized.lastIndexOf(".");
            let parsed = normalized;
            if (comma >= 0 && dot >= 0) {
              const decimal = comma > dot ? "," : ".";
              parsed = parsed.split(decimal === "," ? "." : ",").join("").replace(decimal, ".");
            } else if (comma >= 0) {
              parsed = parsed.replace(/\./g, "").replace(",", ".");
            } else if (dot >= 0 && parsed.length - dot - 1 !== 2) {
              parsed = parsed.replace(/\./g, "");
            }
            const number = Number(parsed);
            if (Number.isFinite(number)) onChange(number);
            setDecimalText(Number.isFinite(number) ? new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(number) : "");
          }}
          className={cn(
            "h-12 w-full rounded-xl border bg-white/80 pr-4 pl-11 text-sm font-bold text-slate-800 transition-all duration-300 outline-none placeholder:font-normal placeholder:text-slate-400",
            "focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100",
            error ? "border-rose-300 focus:border-rose-500 focus:ring-rose-100" : "border-slate-200"
          )}
        />
      </div>
    </FieldShell>
  );
}
