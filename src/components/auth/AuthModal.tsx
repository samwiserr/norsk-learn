"use client";

import { useContext, useEffect, useState } from "react";
import { AuthContext } from "@/src/context/AuthContext";
import EmailSignIn from "./EmailSignIn";
import EmailSignUp from "./EmailSignUp";
import GoogleButton from "./GoogleButton";
import "./auth-modal.css";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  isRequired?: boolean; // If true, modal cannot be closed without authentication
}

const AuthModal = ({ isOpen, onClose, isRequired = false }: AuthModalProps) => {
  const { user } = useContext(AuthContext);
  const [isSignUp, setIsSignUp] = useState(false);

  // Close modal when user successfully authenticates
  useEffect(() => {
    if (user && isOpen) {
      if (!isRequired) {
        onClose();
      }
    }
  }, [user, isOpen, isRequired, onClose]);

  if (!isOpen) return null;

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
          <h2>{isSignUp ? "Create an account" : "Welcome back"}</h2>
          <p>
            {isSignUp
              ? "Sign up to save your progress and continue learning"
              : "Sign in to continue your Norwegian learning journey"}
          </p>
        </div>

        <div className="auth-modal-body">
          <GoogleButton />

          <div className="auth-divider">
            <span>or</span>
          </div>

          {isSignUp ? (
            <EmailSignUp onSuccess={() => setIsSignUp(false)} />
          ) : (
            <EmailSignIn onSuccess={() => onClose()} />
          )}

          <div className="auth-toggle">
            {isSignUp ? (
              <p>
                Already have an account?{" "}
                <button
                  type="button"
                  className="auth-link"
                  onClick={() => setIsSignUp(false)}
                >
                  Sign in
                </button>
              </p>
            ) : (
              <p>
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  className="auth-link"
                  onClick={() => setIsSignUp(true)}
                >
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

