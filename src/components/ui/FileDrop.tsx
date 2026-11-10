import { useRef, useState } from "react";
import { cn } from "../../utils/cn";
import { Icon } from "./Icon";

interface FileDropProps {
  file: File | null;
  onChange: (f: File | null) => void;
  error?: string;
  label?: string;
}

export function FileDrop({ file, onChange, error, label }: FileDropProps) {
  const ref = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  const accept = (f?: File | null) => {
    if (!f) return;
    onChange(f);
  };

  const size = file ? (file.size > 1024 * 1024 ? `${(file.size / 1048576).toFixed(2)} MB` : `${Math.max(1, Math.round(file.size / 1024))} KB`) : "";

  return (
    <div>
      {label && <label className="mb-1.5 block text-xs font-bold tracking-wide text-slate-600">{label}</label>}
      <input
        ref={ref}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={(e) => {
          accept(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <div
        role="button"
        tabIndex={0}
        onClick={() => ref.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && ref.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          accept(e.dataTransfer.files?.[0]);
        }}
        className={cn(
          "group relative cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed p-6 text-center transition-all duration-300 outline-none",
          drag
            ? "scale-[1.02] border-blue-500 bg-blue-50"
            : error
              ? "border-rose-300 bg-rose-50/40"
              : file
                ? "border-emerald-300 bg-emerald-50/50"
                : "border-blue-200 bg-blue-50/40 hover:border-blue-400 hover:bg-blue-50"
        )}
      >
        {file ? (
          <div className="animate-fade-in flex items-center gap-3 text-left">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-emerald-500 to-teal-400 text-xl text-white shadow-lg shadow-emerald-500/30">
              <Icon name="file-excel" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-slate-800">{file.name}</p>
              <p className="text-xs text-slate-500">{size} · klik untuk mengganti file</p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange(null);
              }}
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-500"
            >
              <Icon name="trash" />
            </button>
          </div>
        ) : (
          <>
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-blue-600 to-sky-400 text-2xl text-white shadow-lg shadow-blue-500/30 transition-transform duration-300 group-hover:-translate-y-1">
              <Icon name="upload" />
            </div>
            <p className="text-sm font-bold text-slate-800">Tarik file ke sini atau klik untuk memilih</p>
            <p className="mt-1 text-xs text-slate-500">Mutasi rekening BCA · .xlsx, .xls, .csv</p>
          </>
        )}
      </div>
      {error && <p className="mt-1.5 text-xs font-medium text-rose-600">{error}</p>}
    </div>
  );
}
