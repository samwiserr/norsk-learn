"use client";

import "./sidebar.css";
import { assets } from "@/src/assets/assets";
import Image from "next/image";
import { useContext } from "react";
import { Context } from "@/src/context/Context";
import SessionList from "@/src/components/SessionList";
import Settings from "@/src/components/Settings";
import { getTranslation } from "@/lib/languages";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  onToggle?: () => void;
}

const Sidebar = ({ isOpen = true, onClose, onToggle }: SidebarProps) => {
  const { createSession, language } = useContext(Context);
  const t = (key: any) => getTranslation(language, key);

  return (
    <aside className={`sidebar ${isOpen ? "open" : "closed"}`}>
      <div className="sidebar-top">
        <div className="sidebar-header">
          {onToggle && (
            <button
              type="button"
              className="sidebar-menu-button"
              onClick={onToggle}
              aria-label="Close menu"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M4 4l12 12M4 16L16 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          )}
          <h2 className="sidebar-title">{t("appTitle")}</h2>
        </div>
        <button
          type="button"
          className="new-chat-button"
          onClick={() => {
            createSession();
            if (onClose) onClose();
          }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span>{t("newChat")}</span>
        </button>
      </div>
      <div className="sidebar-scrollable">
        <div className="conversations-section">
          <p className="conversations-title">{t("conversations")}</p>
          <SessionList onItemClick={onClose} />
        </div>
      </div>
      <div className="sidebar-bottom">
        <Settings />
        <button type="button" className="sidebar-bottom-item">
          <Image src={assets.question_icon} alt="" width={20} height={20} />
          <span>{t("help")}</span>
        </button>
        <button type="button" className="sidebar-bottom-item">
          <Image src={assets.history_icon} alt="" width={20} height={20} />
          <span>{t("history")}</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;

