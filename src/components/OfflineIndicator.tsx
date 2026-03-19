"use client";

import { useState, useEffect } from "react";

export default function OfflineIndicator() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  if (online) return null;

  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-amber-500 text-white px-4 py-2 rounded-full shadow-lg text-sm font-medium z-50 flex items-center gap-2"
      role="status"
      aria-live="assertive"
    >
      <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
      You are offline
    </div>
  );
}
