// app/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getApiBase } from "@/lib/api";
import type { Me } from "@/lib/auth";

export default function DashboardPage() {
  const router = useRouter();
  const backend = getApiBase();
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(`${backend}/session/me`, {
          credentials: "include",
          cache: "no-store",
        });
        const data: Me = await res.json();
        if (!mounted) return;
        console.log("[looplab] /session/me", data); // debug: see exactly what we got
        setMe(data);
        setLoading(false);

        // If not authenticated, bounce to login
        if (!data.authenticated) {
          router.replace("/login");
        }
      } catch {
        if (!mounted) return;
        setMe({ authenticated: false } as Me);
        setLoading(false);
        router.replace("/login");
      }
    })();
    return () => {
      mounted = false;
    };
  }, [backend, router]);

  if (loading || !me) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-lg border rounded-2xl p-6 shadow-sm text-center">Loading…</div>
      </main>
    );
  }

  // Safe fallbacks
  const parentName = me.name ?? me.intake?.parent_name ?? "there";
  const studentName = me.intake?.student_name ?? "your student";

  // Prefer array; if string, try JSON -> fallback to splitting by , / " and "
  const rawPreferred = me.intake?.preferred_days as unknown;
  const preferredDays = Array.isArray(rawPreferred)
    ? (rawPreferred as string[])
    : typeof rawPreferred === "string"
      ? (() => {
          try {
            const parsed = JSON.parse(rawPreferred);
            return Array.isArray(parsed) ? parsed.map(String) : rawPreferred.split(/,|\/| and /i).map(s => s.trim()).filter(Boolean);
          } catch {
            return rawPreferred.split(/,|\/| and /i).map(s => s.trim()).filter(Boolean);
          }
        })()
      : [];

  const service = typeof me.intake?.service === "string"
    ? me.intake!.service!
    : (me.intake?.service != null ? String(me.intake.service) : undefined);

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-2xl border rounded-2xl p-6 shadow-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold">
            Welcome {parentName}! 👋
          </h1>
          <p className="text-gray-600">
            Let&apos;s track {studentName}&apos;s progress{service ? ` in ${service}` : ""}.
          </p>
        </div>

        <section className="grid gap-4 sm:grid-cols-2">
          <div className="border rounded-xl p-4">
            <h2 className="font-medium mb-2">Account</h2>
            <dl className="text-sm space-y-1">
              <div className="flex justify-between">
                <dt className="text-gray-500">Parent</dt>
                <dd>{me.intake?.parent_name ?? "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Email</dt>
                <dd>{me.email ?? me.intake?.email ?? "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Timezone</dt>
                <dd>{me.intake?.timezone ?? "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Phone</dt>
                <dd>{me.intake?.phone ?? "—"}</dd>
              </div>
            </dl>
          </div>

          <div className="border rounded-xl p-4">
            <h2 className="font-medium mb-2">Student</h2>
            <dl className="text-sm space-y-1">
              <div className="flex justify-between">
                <dt className="text-gray-500">Name</dt>
                <dd>{me.intake?.student_name ?? "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Age</dt>
                <dd>{me.intake?.student_age ?? "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Service</dt>
                <dd>{service ?? "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Status</dt>
                <dd>{me.intake?.status ?? "—"}</dd>
              </div>
            </dl>
          </div>
        </section>

        <section className="border rounded-xl p-4">
          <h2 className="font-medium mb-2">Preferred Days</h2>
          {preferredDays.length ? (
            <div className="flex flex-wrap gap-2">
              {preferredDays.map((d) => (
                <span key={d} className="px-3 py-1 rounded-full bg-gray-100 text-sm">
                  {d}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No days selected yet.</p>
          )}
        </section>

        {process.env.NODE_ENV !== "production" && (
          <details className="border rounded-xl p-4">
            <summary className="cursor-pointer font-medium">Debug: Intake payload</summary>
            <pre className="mt-2 text-xs overflow-auto">
              {JSON.stringify(me.intake, null, 2)}
            </pre>
          </details>
        )}

        <div className="flex items-center justify-between">
          <Link href="/" className="px-4 py-2 rounded-lg bg-gray-100">
            ← Back home
          </Link>
          <Link href="/login" className="px-4 py-2 rounded-lg bg-black text-white">
            Switch account
          </Link>
        </div>
      </div>
    </main>
  );
}
