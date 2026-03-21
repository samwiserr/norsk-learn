"use client";

import { useContext } from "react";
import { useRouter } from "next/navigation";
import { AuthContext } from "@/src/context/AuthContext";
import { useLanguageContext } from "@/src/context/LanguageContext";
import { getTranslation, type Translations } from "@/lib/languages";
import "./auth-buttons.css";

const AuthButtons = () => {
  const router = useRouter();
  const { user } = useContext(AuthContext);
  const { language } = useLanguageContext();
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
            <span
              className="user-avatar"
              role="img"
              aria-label={user.displayName || user.email || "Account"}
              style={{ backgroundImage: `url(${user.photoURL})`, backgroundSize: "cover", backgroundPosition: "center" }}
            />
          ) : (
            <span className="user-initial">
              {(((user.displayName || user.email || "A").trim().charAt(0) || "A").toUpperCase())}
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

