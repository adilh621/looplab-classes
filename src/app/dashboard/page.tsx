// app/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import { getApiBase } from "@/lib/api";
import type { Me } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default function Dashboard() {
  const [me, setMe] = useState<Me | null>(null);
  const backend = getApiBase();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(`${backend}/session/me`, {
          credentials: "include",
          cache: "no-store",
        });
        const data = await res.json();
        if (mounted) setMe(data);
      } catch {
        if (mounted) setMe({ authenticated: false });
      }
    })();
    return () => { mounted = false; };
  }, [backend]);

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-2xl border rounded-2xl p-6 shadow-sm">
        {!me || me.authenticated === undefined ? (
          <p>Loading…</p>
        ) : (
          <>
            <h1 className="text-2xl font-semibold mb-2">Dashboard</h1>
            <p className="text-gray-600">Welcome{me?.name ? `, ${me.name}` : ""}! 🎉</p>
          </>
        )}
      </div>
    </main>
  );
}
