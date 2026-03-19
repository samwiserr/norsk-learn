"use client";

import { useEffect } from "react";
import { initAnalytics } from "@/lib/analytics";
import OfflineIndicator from "@/src/components/OfflineIndicator";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initAnalytics();

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  return (
    <>
      {children}
      <OfflineIndicator />
    </>
  );
}



