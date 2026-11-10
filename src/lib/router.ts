import { useSyncExternalStore } from "react";
import { router } from "@inertiajs/react";

const subscribe = (cb: () => void) => {
  window.addEventListener("popstate", cb);
  return () => window.removeEventListener("popstate", cb);
};

const snapshot = () => window.location.pathname || "/";

export function useRoute() {
  return useSyncExternalStore(subscribe, snapshot);
}

export function navigate(path: string) {
  router.visit(path);
  window.scrollTo({ top: 0, behavior: "smooth" });
}
