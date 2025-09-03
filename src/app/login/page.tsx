// app/login/page.tsx
"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getApiBase } from "@/lib/api";

export const dynamic = "force-dynamic";

function LoginInner() {
  const router = useRouter();
  const search = useSearchParams();
  const initialEmail = search.get("email") || "";

  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const backend = getApiBase();

  useEffect(() => {
    if (!backend) setError("Backend URL not configured.");
  }, [backend]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`${backend}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // set cookie
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.detail || `Login failed (${res.status})`);
      }
      router.push("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message || "Something went wrong." : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md border rounded-2xl p-6 shadow-sm">
        <h1 className="text-2xl font-semibold mb-2">Log in</h1>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Email</label>
            <input
              type="email"
              className="w-full border rounded-lg px-3 py-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Password</label>
            <input
              type="password"
              className="w-full border rounded-lg px-3 py-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <button
            type="submit"
            disabled={submitting}
            className={`w-full py-2 rounded-lg text-white ${submitting ? "bg-gray-400" : "bg-black"}`}
          >
            {submitting ? "Logging in…" : "Log in"}
          </button>
        </form>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center">Loading…</div>}>
      <LoginInner />
    </Suspense>
  );
}
