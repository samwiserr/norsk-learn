"use client";

import { useContext, useState } from "react";
import { AuthContext } from "@/src/context/AuthContext";
import { sanitizeEmail, sanitizePassword } from "@/lib/input-sanitization";
import "./auth-forms.css";

interface EmailSignInProps {
  onSuccess?: () => void;
}

const EmailSignIn = ({ onSuccess }: EmailSignInProps) => {
  const { signIn, error } = useContext(AuthContext);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setLoading(true);

    try {
      // Sanitize inputs before sending
      const sanitizedEmail = sanitizeEmail(email);
      const sanitizedPassword = sanitizePassword(password);
      
      await signIn(sanitizedEmail, sanitizedPassword);
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setLocalError(err.message || "Failed to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const displayError = localError || error?.message;

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <div className="form-group">
        <label htmlFor="email-signin">Email</label>
        <input
          id="email-signin"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your.email@example.com"
          required
          disabled={loading}
        />
      </div>

      <div className="form-group">
        <label htmlFor="password-signin">Password</label>
        <input
          id="password-signin"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          disabled={loading}
        />
      </div>

      {displayError && (
        <div className="form-error">{displayError}</div>
      )}

      <button
        type="submit"
        className="auth-submit-button"
        disabled={loading || !email || !password}
      >
        {loading ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
};

export default EmailSignIn;

