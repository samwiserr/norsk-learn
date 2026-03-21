"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/src/components/sidebar/Sidebar";
import Main from "@/src/components/main/Main";
import { useAppSetupGate } from "@/src/hooks/useAppSetupGate";
import "../chat-layout.css";

export default function WritingPage() {
  const pathname = usePathname();
  const ready = useAppSetupGate("writing");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (pathname === "/writing" && ready) {
      window.dispatchEvent(new Event("language-reload"));
    }
  }, [pathname, ready]);

  if (!ready) {
    return (
      <div className="loading-container" role="status" aria-live="polite">
        Loading…
      </div>
    );
  }

  return (
    <div className="chat-layout">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      <Main onMenuClick={() => setSidebarOpen(true)} />
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} aria-hidden="true" />
      )}
    </div>
  );
}
