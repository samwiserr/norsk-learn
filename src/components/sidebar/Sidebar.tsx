"use client";

import { assets } from "@/src/assets/assets";
import Image from "next/image";
import { useSessionContext } from "@/src/context/SessionContext";
import { useLanguageContext } from "@/src/context/LanguageContext";
import SessionList from "@/src/components/SessionList";
import { getTranslation } from "@/lib/languages";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  onToggle?: () => void;
}

const Sidebar = ({ isOpen = true, onClose, onToggle }: SidebarProps) => {
  const router = useRouter();
  const { createSession } = useSessionContext();
  const { language } = useLanguageContext();
  const t = (key: any) => getTranslation(language, key);

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-[1000] flex h-screen w-[260px] flex-col border-r border-border bg-background transition-transform duration-300 md:relative md:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full",
      )}
    >
      <div className="shrink-0 border-b border-border bg-background p-4">
        <div className="mb-4 flex items-center gap-3">
          {onToggle && (
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-md text-foreground transition-colors hover:bg-muted md:hidden"
              onClick={onToggle}
              aria-label="Close menu"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                <path d="M4 4l12 12M4 16L16 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          )}
          <h2 className="text-lg font-semibold tracking-tight text-foreground">{t("appTitle")}</h2>
        </div>
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-xl border border-input bg-card px-4 py-3 text-sm font-medium text-card-foreground transition-colors hover:bg-muted"
          onClick={() => {
            createSession();
            if (onClose) onClose();
          }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
            <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span>{t("newChat")}</span>
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        <div className="flex flex-col">
          <p className="mx-3 my-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t("conversations")}
          </p>
          <SessionList onItemClick={onClose} />
        </div>
      </div>
      <div className="shrink-0 border-t border-border bg-background p-2">
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted"
          onClick={() => {
            router.push("/settings");
            if (onClose) onClose();
          }}
        >
          <span aria-hidden>⚙️</span>
          <span>{t("settings")}</span>
        </button>
        <button type="button" className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted">
          <Image src={assets.question_icon} alt="" width={20} height={20} />
          <span>{t("help")}</span>
        </button>
        <button type="button" className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted">
          <Image src={assets.history_icon} alt="" width={20} height={20} />
          <span>{t("history")}</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;

