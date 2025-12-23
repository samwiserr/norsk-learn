"use client";

import { useContext, useState, useRef, useEffect } from "react";
import type { Session } from "@/lib/sessions";
import { Context } from "@/src/context/Context";
import "./SessionItem.css";

interface Props {
  session: Session;
  isActive: boolean;
  onClick?: () => void;
}

const SessionItem = ({ session, isActive, onClick }: Props) => {
  const { switchSession, renameSession, deleteSession } = useContext(Context);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleClick = () => {
    if (!showMenu) {
      switchSession(session.id);
      if (onClick) onClick();
    }
  };

  const handleMenuToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu((prev) => !prev);
  };

  const handleRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    const next = prompt("Rename conversation", session.title);
    if (next && next.trim()) renameSession(session.id, next.trim());
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    if (confirm(`Delete "${session.title}"?`)) {
      deleteSession(session.id);
    }
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        buttonRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [showMenu]);

  return (
    <div
      className={`session-item ${isActive ? "active" : ""}`}
      onClick={handleClick}
    >
      <div className="session-title">{session.title}</div>
      <div className="session-menu-container">
        <button
          ref={buttonRef}
          type="button"
          className="session-menu-button"
          onClick={handleMenuToggle}
          aria-label="More options"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <circle cx="8" cy="3" r="1.5" />
            <circle cx="8" cy="8" r="1.5" />
            <circle cx="8" cy="13" r="1.5" />
          </svg>
        </button>
        {showMenu && (
          <div ref={menuRef} className="session-menu">
            <button
              type="button"
              className="session-menu-item"
              onClick={handleRename}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11.333 2a1.5 1.5 0 0 1 2.121 2.121L5.517 12.058l-3.034.354.354-3.034L11.333 2z" />
              </svg>
              <span>Rename</span>
            </button>
            <button
              type="button"
              className="session-menu-item session-menu-item-danger"
              onClick={handleDelete}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2 4h12M5 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1m2 0v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4h10zM6 7v4M10 7v4" />
              </svg>
              <span>Delete</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SessionItem;

