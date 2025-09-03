"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getApiBase } from "@/lib/api";

export default function SignUpPage() {
  const router = useRouter();
  const search = useSearchParams();
  const token = search.get("token") || "";
  const initialEmail = search.get("email") || "";

  const [email] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) setError("Missing invite token. Please use the link from your email.");
  }, [token]);

  const canSubmit = !!email && !!token && password.length >= 8 && password === confirm && !submitting;
  const backend = getApiBase();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!token) return setError("Missing invite token.");
    if (password !== confirm) return setError("Passwords do not match.");

    setSubmitting(true);
    try {
      const res = await fetch(`${backend}/auth/claim-invite-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // no cookie set yet here; backend just stores hash + activates
        body: JSON.stringify({ token, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.detail || `Request failed (${res.status})`);
      }
      // ✅ Redirect to login and prefill email so the user just enters password
      router.push(`/login?email=${encodeURIComponent(email)}`);
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
        <p className="text-sm text-gray-600 mb-6">Choose a password to activate your LoopLab Classes account.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input value={email} disabled className="w-full border rounded-lg px-3 py-2 bg-gray-50 text-gray-700" />
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

          {error && <div className="text-sm text-red-600">{error}</div>}

          <button
            type="submit"
            disabled={!canSubmit}
            className={`w-full py-2 rounded-lg text-white ${canSubmit ? "bg-black" : "bg-gray-400 cursor-not-allowed"}`}
          >
            {submitting ? "Saving…" : "Create password & activate"}
          </button>
        </form>
      </div>
    </main>
  );
}
