"use client";

import AuthButtons from "@/src/components/auth/AuthButtons";

interface MainChatHeaderProps {
  onMenuClick?: () => void;
  title: string;
  subtitle: string;
  changeLevelLabel: string;
  onChangeLevel: () => void;
}

export function MainChatHeader({
  onMenuClick,
  title,
  subtitle,
  changeLevelLabel,
  onChangeLevel,
}: MainChatHeaderProps) {
  return (
    <div className="chat-header">
      <div className="chat-header-left">
        {onMenuClick && (
          <button type="button" className="menu-button" onClick={onMenuClick} aria-label="Menu">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path d="M2 4h16M2 10h16M2 16h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        )}
        <div>
          <h1 className="chat-header-title">{title}</h1>
          <p className="chat-header-subtitle">{subtitle}</p>
        </div>
      </div>
      <div className="chat-header-right">
        <AuthButtons />
        <button type="button" className="header-button" onClick={onChangeLevel}>
          {changeLevelLabel}
        </button>
      </div>
    </div>
  );
}
