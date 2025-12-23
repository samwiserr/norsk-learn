"use client";

import { useContext, useState } from "react";
import { AuthContext } from "@/src/context/AuthContext";
import { sanitizeEmail, sanitizePassword } from "@/lib/input-sanitization";
import "./auth-forms.css";

interface EmailSignUpProps {
  onSuccess?: () => void;
}

const EmailSignUp = ({ onSuccess }: EmailSignUpProps) => {
  const { signUp, error } = useContext(AuthContext);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 6) {
      return "Password must be at least 6 characters long";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    try {
      // Sanitize inputs before validation
      const sanitizedEmail = sanitizeEmail(email);
      const sanitizedPassword = sanitizePassword(password);
      
      // Validate password
      const passwordError = validatePassword(sanitizedPassword);
      if (passwordError) {
        setLocalError(passwordError);
        return;
      }

      // Check password match
      if (sanitizedPassword !== confirmPassword) {
        setLocalError("Passwords do not match");
        return;
      }

      setLoading(true);

      try {
        await signUp(sanitizedEmail, sanitizedPassword);
        if (onSuccess) {
          onSuccess();
        }
      } catch (err: any) {
        setLocalError(err.message || "Failed to create account. Please try again.");
      } finally {
        setLoading(false);
      }
    } catch (validationError: any) {
      setLocalError(validationError.message || "Invalid input. Please check your email and password.");
    }
  };

  const displayError = localError || error?.message;

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <div className="form-group">
        <label htmlFor="email-signup">Email</label>
        <input
          id="email-signup"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your.email@example.com"
          required
          disabled={loading}
        />
      </div>

      <div className="form-group">
        <label htmlFor="password-signup">Password</label>
        <input
          id="password-signup"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 6 characters"
          required
          minLength={6}
          disabled={loading}
        />
        <small className="form-hint">Must be at least 6 characters</small>
      </div>

      <div className="form-group">
        <label htmlFor="confirm-password">Confirm Password</label>
        <input
          id="confirm-password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
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
        disabled={loading || !email || !password || !confirmPassword}
      >
        {loading ? "Creating account..." : "Sign up"}
      </button>
    </form>
  );
};

export default EmailSignUp;

