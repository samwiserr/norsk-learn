"use client";

import { useContext, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthContext } from "@/src/context/AuthContext";
import EmailSignIn from "@/src/components/auth/EmailSignIn";
import EmailSignUp from "@/src/components/auth/EmailSignUp";
import GoogleButton from "@/src/components/auth/GoogleButton";
import "./auth.css";

export default function AuthPage() {
  const router = useRouter();
  const { user } = useContext(AuthContext);
  const [isSignUp, setIsSignUp] = useState(false);

  // Redirect if already authenticated
  if (user) {
    router.push("/");
    return null;
  }

  return (
    <div className="auth-page">
      <div className="auth-page-container">
        <div className="auth-page-header">
          <h1>{isSignUp ? "Create an account" : "Welcome back"}</h1>
          <p>
            {isSignUp
              ? "Sign up to save your progress and continue learning Norwegian"
              : "Sign in to continue your Norwegian learning journey"}
          </p>
        </div>

        <div className="auth-page-body">
          <GoogleButton />

          <div className="auth-divider">
            <span>or</span>
          </div>

          {isSignUp ? (
            <EmailSignUp onSuccess={() => router.push("/")} />
          ) : (
            <EmailSignIn onSuccess={() => router.push("/")} />
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

        <div className="auth-page-footer">
          <button
            type="button"
            className="auth-back-button"
            onClick={() => router.back()}
          >
            ← Back
          </button>
        </div>
      </div>
    </div>
  );
}

