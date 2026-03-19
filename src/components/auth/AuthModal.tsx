"use client";

import { useContext, useEffect, useState } from "react";
import { AuthContext } from "@/src/context/AuthContext";
import EmailSignIn from "./EmailSignIn";
import EmailSignUp from "./EmailSignUp";
import GoogleButton from "./GoogleButton";
import LanguageStep from "./LanguageStep";
import { type LanguageCode } from "@/lib/languages";
import "./auth-modal.css";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  isRequired?: boolean;
}

type ModalStep = "language" | "credentials";

const AuthModal = ({ isOpen, onClose, isRequired = false }: AuthModalProps) => {
  const { user } = useContext(AuthContext);
  const [isSignUp, setIsSignUp] = useState(false);
  const [step, setStep] = useState<ModalStep>("credentials");

  useEffect(() => {
    if (user && isOpen) {
      if (!isRequired) {
        onClose();
      }
    }
  }, [user, isOpen, isRequired, onClose]);

  useEffect(() => {
    if (!isOpen) {
      setStep("credentials");
    }
  }, [isOpen]);

  const handleSignUpClick = () => {
    setIsSignUp(true);
    setStep("language");
  };

  const handleLanguageContinue = (_lang: LanguageCode) => {
    setStep("credentials");
  };

  const handleBackToSignIn = () => {
    setIsSignUp(false);
    setStep("credentials");
  };

  if (!isOpen) return null;

  const showLanguageStep = isSignUp && step === "language";
  const stepTitle = showLanguageStep
    ? "Choose your language"
    : isSignUp
      ? "Create an account"
      : "Welcome back";
  const stepSubtitle = showLanguageStep
    ? "Step 1 of 2 — Select the interface language"
    : isSignUp
      ? "Step 2 of 2 — Sign up to save your progress"
      : "Sign in to continue your Norwegian learning journey";

  return (
    <div className="auth-modal-overlay" onClick={!isRequired ? onClose : undefined}>
      <div className="auth-modal-content" onClick={(e) => e.stopPropagation()}>
        {isRequired && (
          <div className="auth-required-banner">
            Authentication required to continue your conversation
          </div>
        )}

        {!isRequired && (
          <button
            type="button"
            className="auth-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        )}

        <div className="auth-modal-header">
          <h2>{stepTitle}</h2>
          <p>{stepSubtitle}</p>
        </div>

        <div className="auth-modal-body">
          {showLanguageStep ? (
            <LanguageStep onContinue={handleLanguageContinue} />
          ) : (
            <>
              <GoogleButton />
              <div className="auth-divider"><span>or</span></div>
              {isSignUp ? (
                <EmailSignUp onSuccess={handleBackToSignIn} />
              ) : (
                <EmailSignIn onSuccess={() => onClose()} />
              )}
            </>
          )}

          <div className="auth-toggle">
            {isSignUp ? (
              <p>
                Already have an account?{" "}
                <button type="button" className="auth-link" onClick={handleBackToSignIn}>
                  Sign in
                </button>
              </p>
            ) : (
              <p>
                Don&apos;t have an account?{" "}
                <button type="button" className="auth-link" onClick={handleSignUpClick}>
                  Sign up
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
