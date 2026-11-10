import { createInertiaApp } from "@inertiajs/react";
import { createRoot } from "react-dom/client";
import type { ComponentType } from "react";
import "./index.css";
import { ToastProvider } from "./components/ui/Toast";
import { AdminLayout } from "./components/layout/AdminLayout";
import { usePage } from "@inertiajs/react";

function wrapPage(Component: ComponentType<any>) {
  return function InertiaPage(props: Record<string, any>) {
  const page = usePage();
  const currentPath = page.url.split("?")[0];
  const isLogin = currentPath === "/login";
  const content = <Component {...props} id={currentPath.split("/")[2]} />;
  return isLogin ? content : <AdminLayout route={currentPath}>{content}</AdminLayout>;
  };
}

createInertiaApp({
  title: (title) => `${title} | Monitoring Petty Cash Procurement`,
  resolve: async (name) => {
    const pages = import.meta.glob<{ default: ComponentType<any> }>("./pages/**/*.tsx");
    const page = await pages[`./pages/${name}.tsx`]?.();
    if (!page) throw new Error(`Page ${name} tidak ditemukan`);
    return { default: wrapPage(page.default) };
  },
  setup({ el, App, props }) { createRoot(el).render(<ToastProvider><App {...props} /></ToastProvider>); },
  progress: { color: "#2563eb" },
});
