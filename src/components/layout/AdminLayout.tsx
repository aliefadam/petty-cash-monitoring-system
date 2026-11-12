import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "../../utils/cn";
import { Icon } from "../ui/Icon";
import { navigate } from "../../lib/router";
import { useToast } from "../ui/Toast";
import { usePresence } from "../ui/usePresence";
import { ConfirmDialog } from "../ui/Modal";
import { router, usePage } from "@inertiajs/react";

const NAV = [
  { path: "/dashboard", label: "Dashboard", icon: "chart-pie", desc: "Ringkasan & statistik" },
  { path: "/rekonsiliasi", label: "Rekonsiliasi", icon: "memo-circle-check", desc: "Mutasi rekening BCA" },
  { path: "/referensi", label: "No. Referensi", icon: "hastag", desc: "Kode referensi transaksi" },
];

function Logo({ light }: { light?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-2xl text-xl shadow-lg",
          light ? "bg-white text-blue-600 shadow-blue-900/20" : "bg-linear-to-br from-blue-600 to-sky-400 text-white shadow-blue-500/30"
        )}
      >
        <Icon name="wallet" bold />
      </div>
      <div className="leading-tight">
        <p className={cn("text-sm font-extrabold", light ? "text-white" : "text-slate-800")}>Petty Cash</p>
        <p className={cn("text-[11px] font-semibold", light ? "text-blue-200" : "text-slate-500")}>PT. Buana Multi Teknik</p>
      </div>
    </div>
  );
}

function SidebarContent({ route, onNavigate }: { route: string; onNavigate?: () => void }) {
  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-linear-to-b from-blue-800 via-blue-700 to-blue-600 text-white">
      <div className="animate-float pointer-events-none absolute -top-24 -left-20 h-64 w-64 rounded-full bg-sky-400/30 blur-3xl" />
      <div className="animate-float-slow pointer-events-none absolute -right-24 bottom-10 h-72 w-72 rounded-full bg-indigo-400/30 blur-3xl" />
      <div className="relative px-6 pt-7 pb-6">
        <Logo light />
      </div>
      <p className="relative px-6 pb-2 text-[11px] font-bold tracking-widest text-blue-200/80 uppercase">Menu Utama</p>
      <nav className="relative flex-1 space-y-1.5 px-4">
        {NAV.map((n) => {
          const active = route === n.path || route.startsWith(n.path + "/");
          return (
            <button
              key={n.path}
              onClick={() => {
                navigate(n.path);
                onNavigate?.();
              }}
              className={cn(
                "group relative flex w-full cursor-pointer items-center gap-3 overflow-hidden rounded-2xl px-4 py-3.5 text-left transition-all duration-300",
                active ? "bg-white text-blue-700 shadow-xl shadow-blue-950/25" : "text-blue-100 hover:translate-x-1 hover:bg-white/10 hover:text-white"
              )}
            >
              <span
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg transition-all duration-300",
                  active ? "bg-linear-to-br from-blue-600 to-sky-400 text-white shadow-md shadow-blue-500/40" : "bg-white/10 group-hover:bg-white/20"
                )}
              >
                <Icon name={n.icon} />
              </span>
              <span className="min-w-0 leading-tight">
                <span className="block text-sm font-bold">{n.label}</span>
                <span className={cn("block truncate text-[11px] font-medium", active ? "text-slate-500" : "text-blue-200/80")}>{n.desc}</span>
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

export function AdminLayout({ route, children }: { route: string; children: ReactNode }) {
  const [drawer, setDrawer] = useState(false);
  const [menu, setMenu] = useState(false);
  const [confirmOut, setConfirmOut] = useState(false);
  const { auth } = usePage<{ auth: { user: { name: string | null; username: string } | null } }>().props;
  const session = auth.user;
  const toast = useToast();
  const menuRef = useRef<HTMLDivElement>(null);
  const drawerP = usePresence(drawer, 350);
  const menuP = usePresence(menu, 200);

  useEffect(() => {
    if (!menu) return;
    const h = (e: MouseEvent) => !menuRef.current?.contains(e.target as Node) && setMenu(false);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [menu]);

  const logout = () => {
    setConfirmOut(false);
    toast.info("Berhasil keluar", "Sampai jumpa kembali.");
    router.post("/logout");
  };

  const initials = (session?.name || "A")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("");

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-sky-50">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 lg:block">
        <SidebarContent route={route} />
      </aside>

      {/* Mobile drawer */}
      {drawerP.mounted && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            onClick={() => setDrawer(false)}
            className={cn("absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-300", drawerP.visible ? "opacity-100" : "opacity-0")}
          />
          <div
            className={cn(
              "absolute inset-y-0 left-0 w-72 max-w-[85%] shadow-2xl transition-transform duration-350 ease-[cubic-bezier(0.22,1,0.36,1)]",
              drawerP.visible ? "translate-x-0" : "-translate-x-full"
            )}
          >
            <SidebarContent route={route} onNavigate={() => setDrawer(false)} />
          </div>
        </div>
      )}

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-blue-100/70 bg-white/80 backdrop-blur-xl">
          <div className="flex h-18 items-center gap-3 px-4 sm:px-8">
            <button
              onClick={() => setDrawer(true)}
              className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white text-lg text-slate-600 transition-all duration-300 hover:border-blue-300 hover:text-blue-600 active:scale-95 lg:hidden"
            >
              <Icon name="menu-burger" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-md font-bold text-slate-600">Sistem Monitoring Petty Cash Procurement</p>
            </div>

            <div ref={menuRef} className="relative">
              <button
                onClick={() => setMenu((m) => !m)}
                className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-white py-1.5 pr-3 pl-1.5 transition-all duration-300 hover:border-blue-300 hover:shadow-md hover:shadow-blue-500/10"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-blue-600 to-sky-400 text-xs font-extrabold text-white uppercase">
                  {initials}
                </span>
                <span className="hidden text-left leading-tight sm:block">
                  <span className="block text-sm font-bold text-slate-800">{session?.name}</span>
                  <span className="block text-[11px] font-medium text-slate-500">@{session?.username}</span>
                </span>
                <Icon name="angle-small-down" className={cn("text-lg text-slate-400 transition-transform duration-300", menu && "rotate-180")} />
              </button>
              {menuP.mounted && (
                <div
                  className={cn(
                    "absolute top-full right-0 mt-2 w-60 origin-top-right rounded-2xl border border-blue-100 bg-white p-2 shadow-xl shadow-blue-900/10 transition-all duration-200",
                    menuP.visible ? "translate-y-0 scale-100 opacity-100" : "-translate-y-2 scale-95 opacity-0"
                  )}
                >
                  <div className="mb-1 rounded-xl bg-linear-to-r from-blue-50 to-sky-50 p-3">
                    <p className="text-sm font-bold text-slate-800">{session?.name}</p>
                    <p className="text-xs text-slate-500">Administrator</p>
                  </div>
                  <button
                    onClick={() => {
                      setMenu(false);
                      setConfirmOut(true);
                    }}
                    className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50"
                  >
                    <Icon name="sign-out-alt" /> Keluar
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-8 sm:py-8">
          <div key={route} className="animate-fade-up mx-auto max-w-7xl">
            {children}
          </div>
        </main>
        <footer className="px-8 pb-8 text-center text-xs font-medium text-slate-400">
          © {new Date().getFullYear()} PT. Buana Multi Teknik · Monitoring Petty Cash Procurement
        </footer>
      </div>

      <ConfirmDialog
        open={confirmOut}
        onClose={() => setConfirmOut(false)}
        onConfirm={logout}
        title="Keluar dari aplikasi?"
        message="Sesi Anda akan diakhiri. Anda dapat masuk kembali untuk melanjutkan."
        confirmText="Ya, keluar"
      />
    </div>
  );
}

export function PageHeader({ title, subtitle, action, back }: { title: string; subtitle?: string; action?: ReactNode; back?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {back}
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-800">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
