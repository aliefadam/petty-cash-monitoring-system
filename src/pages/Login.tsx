import { useState } from "react";
import { Icon } from "../components/ui/Icon";
import { TextInput } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { useToast } from "../components/ui/Toast";
import { router } from "@inertiajs/react";

export default function Login() {
  const toast = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ u?: string; p?: string }>({});
  const [loading, setLoading] = useState(false);

  const submit = () => {
    const e: typeof errors = {};
    if (!username.trim()) e.u = "Username wajib diisi";
    if (!password) e.p = "Password wajib diisi";
    setErrors(e);
    if (e.u || e.p) return;

    setLoading(true);
    router.post("/login", { username: username.trim(), password }, {
      onSuccess: () => { toast.success("Login berhasil", "Selamat datang."); },
      onError: (serverErrors) => {
        setErrors({ u: serverErrors.username, p: serverErrors.password ?? (!serverErrors.username ? "Username atau password salah" : undefined) });
        toast.error("Login gagal", "Periksa kembali username dan password Anda.");
      },
      onFinish: () => setLoading(false),
    });
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Panel kiri */}
      <div className="relative hidden overflow-hidden bg-linear-to-br from-blue-800 via-blue-600 to-sky-500 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="animate-float pointer-events-none absolute -top-20 -left-20 h-96 w-96 rounded-full bg-sky-300/30 blur-3xl" />
        <div className="animate-float-slow pointer-events-none absolute -right-20 bottom-0 h-112 w-md rounded-full bg-indigo-400/40 blur-3xl" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "28px 28px" }}
        />
        <div className="relative flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-2xl text-blue-600 shadow-xl shadow-blue-900/30">
            <Icon name="wallet" bold />
          </div>
          <div className="leading-tight">
            <p className="text-lg font-extrabold">PT. Buana Multi Teknik</p>
            <p className="text-sm text-blue-100">Procurement Division</p>
          </div>
        </div>

        <div className="relative max-w-lg">
          <h1 className="animate-fade-up text-4xl leading-tight font-extrabold xl:text-5xl">Monitoring Petty Cash Procurement</h1>
          <p className="animate-fade-up mt-5 text-lg leading-relaxed text-blue-100" style={{ animationDelay: "100ms" }}>
            Rekonsiliasi mutasi rekening BCA, deteksi kode transaksi otomatis, dan kelola nomor referensi dalam satu panel.
          </p>
          <div className="stagger mt-10 space-y-3">
            {[
              ["upload", "Upload mutasi Excel BCA per bulan"],
              ["search-alt", "Deteksi otomatis OP-, TX-, PF-, BL-, RE-, PAY- & nomor PO"],
              ["hastag", "Generate nomor referensi unik 7 karakter"],
            ].map(([ic, t]) => (
              <div key={t} className="flex items-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 text-lg">
                  <Icon name={ic} />
                </span>
                <span className="text-sm font-semibold">{t}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-sm text-blue-100">© {new Date().getFullYear()} PT. Buana Multi Teknik</p>
      </div>

      {/* Panel form */}
      <div className="relative flex items-center justify-center overflow-hidden bg-linear-to-br from-blue-50 via-white to-sky-50 p-6 sm:p-10">
        <div className="animate-float pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-sky-200/50 blur-3xl lg:hidden" />
        <div className="animate-float-slow pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-blue-200/50 blur-3xl" />
        <div className="animate-fade-up relative w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-blue-600 to-sky-400 text-2xl text-white shadow-lg shadow-blue-500/30">
              <Icon name="wallet" bold />
            </div>
            <div className="leading-tight">
              <p className="font-extrabold text-slate-800">Petty Cash Procurement</p>
              <p className="text-xs font-semibold text-slate-500">PT. Buana Multi Teknik</p>
            </div>
          </div>

          <div className="rounded-3xl border border-blue-100/80 bg-white/80 p-7 shadow-2xl shadow-blue-900/10 backdrop-blur-xl sm:p-9">
            <h2 className="text-2xl font-extrabold text-slate-800">Selamat datang</h2>
            <p className="mt-1 mb-7 text-sm text-slate-500">Masuk untuk mengelola monitoring petty cash.</p>

            <div className="space-y-4">
              <TextInput
                label="Username"
                icon="user"
                value={username}
                onChange={(v) => {
                  setUsername(v);
                  setErrors((e) => ({ ...e, u: undefined }));
                }}
                placeholder="Masukkan username"
                error={errors.u}
                autoComplete="username"
                onEnter={submit}
              />
              <TextInput
                label="Password"
                icon="lock"
                type="password"
                value={password}
                onChange={(v) => {
                  setPassword(v);
                  setErrors((e) => ({ ...e, p: undefined }));
                }}
                placeholder="Masukkan password"
                error={errors.p}
                autoComplete="current-password"
                onEnter={submit}
              />
              <Button size="lg" full loading={loading} onClick={submit} icon="sign-out-alt" className="mt-2">
                Masuk
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
