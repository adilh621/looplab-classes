"use client";

import { useEffect, useMemo, useState } from "react";

function useQuery() {
  return useMemo(() => {
    if (typeof window === "undefined") return new URLSearchParams();
    return new URLSearchParams(window.location.search);
  }, []);
}

export default function SignUpPage() {
  const qs = useQuery();
  const initialEmail = qs.get("email") || "";
  const token = qs.get("token") || "";

  const [email] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const backend = process.env.NEXT_PUBLIC_BACKEND_URL;

  useEffect(() => {
    if (!token) setError("Missing invite token. Please use the link from your email.");
  }, [token]);

  const canSubmit =
    !!email && !!token && password.length >= 8 && password === confirm && !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!backend) {
      setError("Backend URL not configured.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (!token) {
      setError("Missing invite token.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${backend}/auth/claim-invite-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.detail || `Request failed (${res.status})`);
      }

      setMessage("All set! Your account is active. You can close this page.");
      // TODO: navigate to /dashboard after you build it
      // router.push("/dashboard");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || "Something went wrong.");
      } else {
        setError("Something went wrong.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md border rounded-2xl p-6 shadow-sm">
        <h1 className="text-2xl font-semibold mb-2">Finish Creating Your Account</h1>
        <p className="text-sm text-gray-600 mb-6">
          Choose a password to activate your LoopLab Classes account.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              value={email}
              disabled
              className="w-full border rounded-lg px-3 py-2 bg-gray-50 text-gray-700"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">New password</label>
            <input
              type="password"
              className="w-full border rounded-lg px-3 py-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              minLength={8}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Confirm password</label>
            <input
              type="password"
              className="w-full border rounded-lg px-3 py-2"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              minLength={8}
              required
            />
          </div>

          {error && (
            <div className="text-sm text-red-600">{error}</div>
          )}
          {message && (
            <div className="text-sm text-green-600">{message}</div>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className={`w-full py-2 rounded-lg text-white ${canSubmit ? "bg-black" : "bg-gray-400 cursor-not-allowed"}`}
          >
            {submitting ? "Saving…" : "Create password & activate"}
          </button>
        </form>

        <div className="text-xs text-gray-500 mt-4">
          Token: {token ? token.slice(0, 10) + "…" : "—"}
        </div>
      </div>
    </main>
  );
}
