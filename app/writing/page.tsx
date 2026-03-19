"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Sidebar from "@/src/components/sidebar/Sidebar";
import Main from "@/src/components/main/Main";
import { loadFromLocalStorage } from "@/lib/storage";
import { isValidCEFRLevel } from "@/lib/cefr";
import { isValidLanguageCode } from "@/lib/languages";
import { SESSION_STORAGE_KEYS } from "@/lib/constants";
import "../chat-layout.css";

export default function Home() {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    // First check: language must be set
    const storedLanguage = loadFromLocalStorage<string>("norsk_ui_language");
    if (!storedLanguage || !isValidLanguageCode(storedLanguage)) {
      router.push("/language-selection");
      return;
    }

    // Second check: CEFR level must be set
    const stored = loadFromLocalStorage<string>("norsk_cefr_level");
    if (!stored || !isValidCEFRLevel(stored)) {
      sessionStorage.setItem(SESSION_STORAGE_KEYS.RETURN_PATH, "/writing");
      router.push("/level-selection");
    } else {
      setReady(true);
    }
  }, [router]);

  // Reload language when navigating to this page (in case it was changed on level selection page)
  useEffect(() => {
    if (pathname === "/writing" && ready) {
      // Trigger a custom event to reload language in Context
      window.dispatchEvent(new Event("language-reload"));
    }
  }, [pathname, ready]);

  if (!ready) {
    return (
      <div className="loading-container">
        Loading…
      </div>
    );
  }

  return (
    <div className="chat-layout">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      <Main onMenuClick={() => setSidebarOpen(true)} />
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
    </div>
  );
}

