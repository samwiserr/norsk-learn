"use client";

import { useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import "./main.css";
import { assets } from "@/src/assets/assets";
import { Context } from "@/src/context/Context";
import ProgressBar from "@/src/components/ProgressBar";
import { getTranslation } from "@/lib/languages";
import AuthButtons from "@/src/components/auth/AuthButtons";
import AuthModal from "@/src/components/auth/AuthModal";

const getImageSrc = (image: string | { src?: string }) =>
  typeof image === "string" ? image : image?.src ?? "";

interface MainProps {
  onMenuClick?: () => void;
}

const Main = ({ onMenuClick }: MainProps) => {
  const router = useRouter();
  const {
    onSent,
    activeSession,
    loading,
    input,
    setInput,
    cefrLevel,
    language,
    showResults,
    isAuthRequired,
  } = useContext(Context);

  const t = (key: any) => getTranslation(language, key);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const [showJumpToBottom, setShowJumpToBottom] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const messages = activeSession?.messages ?? [];
  const messagesLength = messages.length;

  // Listen for auth-required event
  useEffect(() => {
    const handleAuthRequired = () => {
      setShowAuthModal(true);
    };
    window.addEventListener("auth-required", handleAuthRequired);
    return () => {
      window.removeEventListener("auth-required", handleAuthRequired);
    };
  }, []);

  // Check if user has scrolled up manually
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setAutoScroll(isNearBottom);
      setShowJumpToBottom(!isNearBottom && messagesLength > 0);
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [messagesLength]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, autoScroll, loading]);

  const jumpToBottom = () => {
    setAutoScroll(true);
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    setShowJumpToBottom(false);
  };

  const handleSend = () => {
    if (!input.trim()) return;
    if (!cefrLevel) {
      router.push("/level-selection");
      return;
    }
    setAutoScroll(true);
    onSent();
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="main-chat-container">
      {/* Optional Header */}
      <div className="chat-header">
        <div className="chat-header-left">
          {onMenuClick && (
            <button
              type="button"
              className="menu-button"
              onClick={onMenuClick}
              aria-label="Menu"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2 4h16M2 10h16M2 16h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          )}
          <div>
            <h1 className="chat-header-title">{t("appTitle")}</h1>
            <p className="chat-header-subtitle">{t("greetingSubtitle")}</p>
          </div>
        </div>
        <div className="chat-header-right">
          <AuthButtons />
          <button
            type="button"
            className="header-button"
            onClick={() => router.push("/level-selection")}
          >
            {t("changeLevel")}
          </button>
        </div>
      </div>

      <ProgressBar />

      {/* Centered Chat Area */}
      <div className="chat-area-wrapper">
        <div className="chat-area">
          {/* Scrollable Messages Container */}
          <div className="messages-container" ref={messagesContainerRef}>
            {messages.length === 0 && !showResults && (
              <div className="welcome-message">
                <h2>{t("welcomeTitle")}</h2>
                <p>{t("selectLevelSubtitle")}</p>
              </div>
            )}
            
            {showResults && messages.length > 0 && (
              <div className="messages-list">
                {messages.map((message) => {
                  // Check if this is a streaming/placeholder message
                  const isStreaming = message.role === "assistant-streaming";
                  const isUser = message.role === "user";
                  
                  return (
                    <div
                      key={message.id}
                      className={`message-bubble ${isUser ? "user-message" : "ai-message"} ${isStreaming ? "streaming" : ""}`}
                    >
                      <div className="message-content">
                        {isStreaming ? (
                          <div className="loading-indicator">
                            <span></span>
                            <span></span>
                            <span></span>
                          </div>
                        ) : (
                          <div
                            dangerouslySetInnerHTML={{
                              __html: message.content.replace(/\n/g, "<br/>"),
                            }}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
            {/* Jump to Bottom Button */}
            {showJumpToBottom && (
              <button
                type="button"
                className="jump-to-bottom"
                onClick={jumpToBottom}
                aria-label={t("jumpToBottom")}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 12L4 8h8L8 12zm0-4L4 4h8L8 8z" />
                </svg>
                {t("jumpToBottom")}
              </button>
            )}
          </div>

          {/* Fixed Input Bar */}
          <div className="input-container">
            <div className="input-wrapper">
              <input
                type="text"
                className="message-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder={t("placeholder")}
                disabled={loading}
              />
              <div className="input-actions">
                <button
                  type="button"
                  className="send-button"
                  onClick={handleSend}
                  disabled={!input.trim() || loading}
                  aria-label="Send"
                >
                  <img
                    src={getImageSrc(assets.send_icon)}
                    alt="Send"
                    width={20}
                    height={20}
                  />
                </button>
              </div>
            </div>
            <p className="input-disclaimer">{t("disclaimer")}</p>
          </div>
        </div>
      </div>
      
      {/* Auth Modal - shown when authentication is required */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        isRequired={isAuthRequired}
      />
    </div>
  );
};

export default Main;
