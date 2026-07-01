"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

export default function LoginPage() {
  const { login, register, user, loading } = useAuth();
  const router = useRouter();
  const [sessionExpired] = useState(
    () =>
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("reason") ===
        "session_expired",
  );
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [registerSecret, setRegisterSecret] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/today");
    }
  }, [loading, user, router]);

  if (!loading && user) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(email, password, registerSecret);
      }
      router.push("/today");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-split">
      <section className="auth-hero">
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.7rem",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--accent)",
            margin: "0 0 24px",
          }}
        >
          Personal workspace
        </p>
        <h1>
          Notes that remember for you.
        </h1>
        <p>
          Write on web. Get nudged on Android. One calm place for thoughts and
          timed reminders.
        </p>
      </section>

      <section className="auth-form-side">
        <div className="auth-form-panel panel panel-pad">
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "1.35rem",
              margin: "0 0 6px",
              letterSpacing: "-0.02em",
            }}
          >
            {mode === "login" ? "Welcome back" : "Create your vault"}
          </h2>
          <p style={{ color: "var(--text-muted)", margin: "0 0 28px", fontSize: "0.9rem" }}>
            Syncs across web and your phone.
          </p>

          {sessionExpired && (
            <p className="error-text" style={{ marginBottom: 16 }}>
              Your session expired. Please sign in again.
            </p>
          )}

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={12}
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
              />
            </div>
            {mode === "register" && (
              <div className="field">
                <label htmlFor="secret">Registration secret</label>
                <input
                  id="secret"
                  type="password"
                  value={registerSecret}
                  onChange={(e) => setRegisterSecret(e.target.value)}
                  required
                />
              </div>
            )}
            {error && <p className="error-text">{error}</p>}
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: "100%", marginTop: 8 }}
              disabled={submitting}
            >
              {submitting
                ? "One moment…"
                : mode === "login"
                  ? "Open Recall"
                  : "Create account"}
            </button>
          </form>

          <p style={{ marginTop: 20, textAlign: "center", fontSize: "0.85rem" }}>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setMode(mode === "login" ? "register" : "login")}
            >
              {mode === "login"
                ? "Need an account? Register"
                : "Already have one? Sign in"}
            </button>
          </p>
        </div>
      </section>
    </div>
  );
}
