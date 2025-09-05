// app/dashboard/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getApiBase } from "@/lib/api";
import type { Me } from "@/lib/auth";

const WEEKDAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

function EditIconButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="ml-2 inline-flex items-center justify-center rounded-md p-1 text-gray-500 hover:text-gray-800 hover:bg-gray-100"
      title={label}
    >
      {/* simple pencil icon */}
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M12 20h9" strokeWidth="2" />
        <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" strokeWidth="2" />
      </svg>
    </button>
  );
}

function Modal({
  open,
  onClose,
  children,
  title,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title: string;
}) {
  if (!open) return null; // don’t render when closed

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="w-[min(92vw,520px)] rounded-2xl bg-white shadow-lg">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 id="modal-title" className="text-lg font-semibold">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-md p-1 hover:bg-gray-100"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}


export default function DashboardPage() {
  const router = useRouter();
  const backend = getApiBase();
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  // modal state
  const [openStudent, setOpenStudent] = useState(false);
  const [openDays, setOpenDays] = useState(false);

  // local form state
  const [formStudent, setFormStudent] = useState({ student_name: "", student_age: "", service: "" });
  const [formDays, setFormDays] = useState<string[]>([]);

  // load session
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(`${backend}/session/me`, { credentials: "include", cache: "no-store" });
        const data: Me = await res.json();
        if (!mounted) return;
        console.log("[looplab] /session/me", data);
        setMe(data);
        setLoading(false);
        if (!data.authenticated) router.replace("/login");
      } catch {
        if (!mounted) return;
        setMe({ authenticated: false } as Me);
        setLoading(false);
        router.replace("/login");
      }
    })();
    return () => { mounted = false; };
  }, [backend, router]);

  // helpers
  const parentName = me?.name ?? me?.intake?.parent_name ?? "there";
  const studentName = me?.intake?.student_name ?? "your student";
  const rawPreferred = me?.intake?.preferred_days as unknown;
  const preferredDays = useMemo(() => {
    if (Array.isArray(rawPreferred)) return rawPreferred as string[];
    if (typeof rawPreferred === "string") {
      try {
        const parsed = JSON.parse(rawPreferred);
        if (Array.isArray(parsed)) return parsed.map(String);
      } catch {}
      return rawPreferred.split(/,|\/| and /i).map(s => s.trim()).filter(Boolean);
    }
    return [];
  }, [rawPreferred]);

  const service = typeof me?.intake?.service === "string"
    ? (me!.intake!.service as string)
    : (me?.intake?.service != null ? String(me?.intake?.service) : undefined);

  // open modals with initial values
  const openStudentEditor = () => {
    setFormStudent({
      student_name: me?.intake?.student_name ?? "",
      student_age: me?.intake?.student_age ? String(me?.intake?.student_age) : "",
      service: service ?? "",
    });
    setOpenStudent(true);
  };

  const openDaysEditor = () => {
    setFormDays(preferredDays.length ? preferredDays : []);
    setOpenDays(true);
  };

  // PATCH /me helper
  async function updateMe(payload: Record<string, unknown>) {
    const res = await fetch(`${backend}/me`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Update failed (${res.status})`);
    // refresh session payload after save
    const meRes = await fetch(`${backend}/session/me`, { credentials: "include", cache: "no-store" });
    const meData: Me = await meRes.json();
    setMe(meData);
  }

  if (loading || !me) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-lg border rounded-2xl p-6 shadow-sm text-center">Loading…</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-2xl border rounded-2xl p-6 shadow-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold">Welcome {parentName}! 👋</h1>
          <p className="text-gray-600">Let&apos;s track {studentName}&apos;s progress{service ? ` in ${service}` : ""}.</p>
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
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-medium">Student</h2>
              <EditIconButton onClick={openStudentEditor} label="Edit student info" />
            </div>
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
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-medium">Preferred Days</h2>
            <EditIconButton onClick={openDaysEditor} label="Edit preferred days" />
          </div>
          {preferredDays.length ? (
            <div className="flex flex-wrap gap-2">
              {preferredDays.map((d) => (
                <span key={d} className="px-3 py-1 rounded-full bg-gray-100 text-sm">{d}</span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No days selected yet.</p>
          )}
        </section>

        {process.env.NODE_ENV !== "production" && (
          <details className="border rounded-xl p-4">
            <summary className="cursor-pointer font-medium">Debug: Intake payload</summary>
            <pre className="mt-2 text-xs overflow-auto">{JSON.stringify(me.intake, null, 2)}</pre>
          </details>
        )}

        <div className="flex items-center justify-between">
          <Link href="/" className="px-4 py-2 rounded-lg bg-gray-100">← Back home</Link>
          <Link href="/login" className="px-4 py-2 rounded-lg bg-black text-white">Switch account</Link>
        </div>
      </div>

      {/* Student modal */}
      <Modal open={openStudent} onClose={() => setOpenStudent(false)} title="Edit student info">
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const payload: {
              student_name: string | null;
              service: string | null;
              student_age?: number;
            } = {
              student_name: formStudent.student_name || null,
              service: formStudent.service || null,
            };
            if (formStudent.student_age) payload.student_age = Number(formStudent.student_age);
            try {
              await updateMe(payload);
              setOpenStudent(false);
            } catch (err) {
              alert(String(err));
            }
          }}
        >
          <label className="block text-sm">
            <span className="text-gray-600">Student name</span>
            <input
              className="mt-1 w-full rounded-lg border p-2"
              value={formStudent.student_name}
              onChange={(e) => setFormStudent(s => ({ ...s, student_name: e.target.value }))}
            />
          </label>
          <label className="block text-sm">
            <span className="text-gray-600">Age</span>
            <input
              type="number"
              min={2}
              max={120}
              className="mt-1 w-full rounded-lg border p-2"
              value={formStudent.student_age}
              onChange={(e) => setFormStudent(s => ({ ...s, student_age: e.target.value }))}
            />
          </label>
          <label className="block text-sm">
            <span className="text-gray-600">Service</span>
            <select
              className="mt-1 w-full rounded-lg border p-2"
              value={formStudent.service}
              onChange={(e) => setFormStudent(s => ({ ...s, service: e.target.value }))}
            >
              <option value="">—</option>
              <option value="Coding">Coding</option>
              <option value="Math">Math</option>
            </select>
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpenStudent(false)} className="px-3 py-2 rounded-lg bg-gray-100">Cancel</button>
            <button type="submit" className="px-3 py-2 rounded-lg bg-black text-white">Save</button>
          </div>
        </form>
      </Modal>

      {/* Preferred days modal */}
      <Modal open={openDays} onClose={() => setOpenDays(false)} title="Edit preferred days">
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await updateMe({ preferred_days: formDays });
              setOpenDays(false);
            } catch (err) {
              alert(String(err));
            }
          }}
        >
          <div className="grid grid-cols-2 gap-2">
            {WEEKDAYS.map((d) => (
              <label key={d} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={formDays.includes(d)}
                  onChange={(e) =>
                    setFormDays(cur =>
                      e.target.checked ? [...cur, d] : cur.filter(x => x !== d)
                    )
                  }
                />
                {d}
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpenDays(false)} className="px-3 py-2 rounded-lg bg-gray-100">Cancel</button>
            <button type="submit" className="px-3 py-2 rounded-lg bg-black text-white">Save</button>
          </div>
        </form>
      </Modal>
    </main>
  );
}
