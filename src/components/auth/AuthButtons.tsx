"use client";

import { useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthContext } from "@/src/context/AuthContext";
import { Context } from "@/src/context/Context";
import { getTranslation, type Translations, DEFAULT_LANGUAGE } from "@/lib/languages";
import "./auth-buttons.css";

const AuthButtons = () => {
  const router = useRouter();
  const { user } = useContext(AuthContext);
  const { language } = useContext(Context);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const t = (key: keyof Translations) => getTranslation(language, key);

  if (user) {
    // Show user account button when authenticated
    return (
      <div className="auth-buttons-container">
        <button
          type="button"
          className="auth-button account-button"
          onClick={() => router.push("/auth")}
        >
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName || user.email || "Account"}
              className="user-avatar"
            />
          ) : (
            <span className="user-initial">
              {(user.displayName || user.email || "A")[0].toUpperCase()}
            </span>
          )}
          <span className="account-text" suppressHydrationWarning>{t("account")}</span>
        </button>
      </div>
    );
  }

  // Show login and signup buttons when not authenticated
  return (
    <div className="auth-buttons-container">
      <button
        type="button"
        className="auth-button login-button"
        onClick={() => router.push("/auth")}
        suppressHydrationWarning
      >
        {t("login")}
      </button>
      <button
        type="button"
        className="auth-button signup-button"
        onClick={() => router.push("/auth")}
        suppressHydrationWarning
      >
        {t("signupForFree")}
      </button>
    </div>
  );
};

export default AuthButtons;

