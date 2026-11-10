import { useEffect, useState } from "react";

/**
 * Mengatur mount/unmount dengan transisi keluar yang halus.
 * mounted -> render elemen, visible -> aktifkan class "tampil".
 */
export function usePresence(open: boolean, duration = 260) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let raf1 = 0;
    let raf2 = 0;
    let timer = 0;
    if (open) {
      setMounted(true);
      raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => setVisible(true));
      });
    } else {
      setVisible(false);
      timer = window.setTimeout(() => setMounted(false), duration);
    }
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      clearTimeout(timer);
    };
  }, [open, duration]);

  return { mounted, visible };
}
