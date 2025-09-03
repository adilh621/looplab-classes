"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getApiBase } from "@/lib/api";

type Me = {
  authenticated: boolean;
  email?: string;
  name?: string | null;
};

export default function Home() {
  const [me, setMe] = useState<Me | null>(null);
  const backend = getApiBase();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(`${backend}/session/me`, {
          credentials: "include", // sends cookie
          cache: "no-store",
        });
        const data = await res.json();
        if (mounted) setMe(data);
      } catch {
        if (mounted) setMe({ authenticated: false });
      }
    })();
    return () => {
      mounted = false;
    };
  }, [backend]);

  async function logout() {
    await fetch(`${backend}/auth/logout`, { method: "POST", credentials: "include" });
    setMe({ authenticated: false });
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-lg border rounded-2xl p-6 shadow-sm text-center space-y-4">
        {!me || me.authenticated === undefined ? (
          <p>Loading…</p>
        ) : me.authenticated ? (
          <>
            <h1 className="text-2xl font-semibold">
              Welcome back{me.name ? `, ${me.name}` : ""} 👋
            </h1>
            <p className="text-gray-600">You’re signed in as {me.email}</p>
            <div className="flex gap-3 justify-center">
              <button onClick={logout} className="px-4 py-2 rounded-lg bg-gray-200">
                Log out
              </button>
              <Link href="/dashboard" className="px-4 py-2 rounded-lg bg-black text-white">
                Go to Dashboard
              </Link>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-semibold">Log in to begin</h1>
            <div className="flex gap-3 justify-center">
              <Link href="/login" className="px-4 py-2 rounded-lg bg-black text-white">
                Log in
              </Link>
              <Link href="/sign-up" className="px-4 py-2 rounded-lg bg-gray-200">
                I have an invite
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
