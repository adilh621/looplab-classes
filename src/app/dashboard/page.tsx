"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getApiBase } from "@/lib/api";
import type { Me } from "@/lib/auth";
import { InlineWidget } from "react-calendly";
import { GlassLayout, glassCard, buttonSecondary } from "../_components/auth/GlassLayout";

const WEEKDAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const COACH_EMAIL = "adilh621+looplab@gmail.com";

// --- local helpers to avoid `any` casts ---
type WithEmail = { email?: string };
type WithStatus = { status?: string };

function getIntakeEmail(me: Me | null): string | undefined {
  const intake = (me?.intake ?? undefined) as WithEmail | undefined;
  return intake?.email;
}
function getIntakeStatus(me: Me | null): string | undefined {
  const intake = (me?.intake ?? undefined) as WithStatus | undefined;
  return intake?.status;
}
function getErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  try { return JSON.stringify(e); } catch { return "Unknown error"; }
}

function formatRange(startIso?: string | null, endIso?: string | null) {
  if (!startIso) return null;
  const start = new Date(startIso);
  const end = endIso ? new Date(endIso) : null;

  const datePart = new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(start);

  const timeFmt = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  const startPart = timeFmt.format(start);
  const endPart = end ? timeFmt.format(end) : null;

  return endPart ? `${datePart}, ${startPart}–${endPart}` : `${datePart}, ${startPart}`;
}

function EditIconButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="ml-2 inline-flex items-center justify-center rounded-md p-1 text-white/60 hover:text-white/90 hover:bg-white/10 transition-colors duration-150"
      title={label}
      type="button"
    >
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
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="w-[min(92vw,720px)] rounded-3xl bg-white/10 border border-white/15 shadow-xl">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h3 id="modal-title" className="text-lg font-semibold text-white/90">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-white/60 hover:text-white/90 hover:bg-white/10 transition-colors duration-150"
            aria-label="Close"
            type="button"
          >
            ✕
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

/** ===== API types ===== */
type Booking = {
  id: number; // ensure backend /sessions includes id
  start_utc: string | null;
  end_utc: string | null;
  location_type: string | null;
  join_url: string | null;
  reschedule_url: string | null;
  cancel_url: string | null;
  calendly_event_uuid?: string | null;
  calendly_invitee_uuid?: string | null;
  status?: string | null;
};

type SessionsRes = {
  upcoming: Booking[];
  past: Booking[];
};

export default function DashboardPage() {
  const router = useRouter();
  const backend = getApiBase();
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  // modals
  const [openStudent, setOpenStudent] = useState(false);
  const [openDays, setOpenDays] = useState(false);

  // forms
  const [formStudent, setFormStudent] = useState({ student_name: "", student_age: "", service: "" });
  const [formDays, setFormDays] = useState<string[]>([]);

  // sessions
  const [sessions, setSessions] = useState<SessionsRes | null>(null);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [sessionsWithNotes, setSessionsWithNotes] = useState<Record<number, boolean>>({});

  // load session/me
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(`${backend}/session/me`, { credentials: "include", cache: "no-store" });
        const data: Me = await res.json();
        if (!mounted) return;
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

  // fetch sessions once authenticated
  useEffect(() => {
    let mounted = true;
    if (!me?.authenticated) return;

    (async () => {
      try {
        const r = await fetch(`${backend}/sessions?limit_past=10&limit_upcoming=5`, {
          credentials: "include",
          cache: "no-store",
        });
        const data: SessionsRes = await r.json();
        if (!mounted) return;
        setSessions(data);
      } catch {
        if (!mounted) return;
        setSessions({ upcoming: [], past: [] });
      } finally {
        if (mounted) setLoadingSessions(false);
      }
    })();

    return () => { mounted = false; };
  }, [backend, me?.authenticated]);

  // helpers (defined early for use in effects)
  const userEmail = me?.email ?? getIntakeEmail(me);

  // check for notes for each session
  useEffect(() => {
    let mounted = true;
    if (!me?.authenticated || !sessions || !userEmail) return;

    const allSessions = [...(sessions.upcoming ?? []), ...(sessions.past ?? [])];
    if (allSessions.length === 0) return;

    const uniqueIds = Array.from(new Set(allSessions.map(s => s.id)));

    (async () => {
      const map: Record<number, boolean> = {};
      
      await Promise.all(
        uniqueIds.map(async (id) => {
          try {
            const res = await fetch(
              `${backend}/session-notes?session_booking_id=${id}&status=published&parent_email=${encodeURIComponent(userEmail)}&limit=1`,
              {
                credentials: "include",
                cache: "no-store",
              }
            );
            if (!res.ok) {
              if (process.env.NODE_ENV !== "production") {
                console.error(`Failed to check notes for session ${id}:`, res.status);
              }
              return;
            }
            const data = await res.json();
            // Normalize response - could be array or object with items/data
            const notes = Array.isArray(data) 
              ? data 
              : (Array.isArray(data?.items) ? data.items : Array.isArray(data?.data) ? data.data : []);
            // Filter for published, parent-visible notes only
            const visibleNotes = notes.filter(
              (n: { status?: string; visibility?: string }) =>
                n.status === "published" &&
                (n.visibility === "parent" || n.visibility === "parent_and_student")
            );
            if (visibleNotes.length > 0) {
              map[id] = true;
            }
          } catch (err) {
            if (process.env.NODE_ENV !== "production") {
              console.error(`Error checking notes for session ${id}:`, err);
            }
            // On error, treat as "no notes" - don't block UI
          }
        })
      );

      if (!mounted) return;
      setSessionsWithNotes(map);
    })();

    return () => { mounted = false; };
  }, [backend, me?.authenticated, sessions, userEmail]);

  // helpers
  const parentName = me?.name ?? me?.intake?.parent_name ?? "there";
  const studentName = me?.intake?.student_name ?? "your student";
  const isCoach = (userEmail ?? "").toLowerCase() === COACH_EMAIL.toLowerCase();
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
    const meRes = await fetch(`${backend}/session/me`, { credentials: "include", cache: "no-store" });
    const meData: Me = await meRes.json();
    setMe(meData);
  }

  // Logout handler
  async function handleLogout() {
    try {
      await fetch(`${backend}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
      router.replace("/login");
    } catch (err) {
      console.error("Logout failed:", err);
      router.replace("/login");
    }
  }

  if (loading || !me) {
    return (
      <GlassLayout>
        <div className={`${glassCard} text-center text-white/80`}>Loading…</div>
      </GlassLayout>
    );
  }

  return (
    <GlassLayout maxWidth="5xl">
      <div className="space-y-6">
        {/* ===== Container 1: Welcome + Info + Preferred Days ===== */}
        <div className={glassCard}>
          <div className="space-y-1 text-center mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Welcome {parentName}! 👋</h1>
            <p className="text-white/70">Let&apos;s track {studentName}&apos;s progress{service ? ` in ${service}` : ""}.</p>
          </div>

          <section className="grid gap-4 sm:grid-cols-2">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <h2 className="font-medium mb-2 text-white/90">Account</h2>
              <dl className="text-sm space-y-1">
                <div className="flex justify-between">
                  <dt className="text-white/60">Parent</dt>
                  <dd className="text-white/90">{me.intake?.parent_name ?? "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-white/60">Email</dt>
                  <dd className="text-white/90">{me.email ?? getIntakeEmail(me) ?? "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-white/60">Timezone</dt>
                  <dd className="text-white/90">{me.intake?.timezone ?? "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-white/60">Phone</dt>
                  <dd className="text-white/90">{me.intake?.phone ?? "—"}</dd>
                </div>
              </dl>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-medium text-white/90">Student</h2>
                <EditIconButton onClick={openStudentEditor} label="Edit student info" />
              </div>
              <dl className="text-sm space-y-1">
                <div className="flex justify-between">
                  <dt className="text-white/60">Name</dt>
                  <dd className="text-white/90">{me.intake?.student_name ?? "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-white/60">Age</dt>
                  <dd className="text-white/90">{me.intake?.student_age ?? "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-white/60">Service</dt>
                  <dd className="text-white/90">{service ?? "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-white/60">Status</dt>
                  <dd className="text-white/90">{getIntakeStatus(me) ?? "—"}</dd>
                </div>
              </dl>
            </div>
          </section>

          <section className="mt-4 bg-white/5 border border-white/10 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-medium text-white/90">Preferred Days</h2>
              <EditIconButton onClick={openDaysEditor} label="Edit preferred days" />
            </div>
            {preferredDays.length ? (
              <div className="flex flex-wrap gap-2">
                {preferredDays.map((d) => (
                  <span key={d} className="px-3 py-1 rounded-full bg-white/10 border border-white/15 text-sm text-white/90">{d}</span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-white/60">No days selected yet.</p>
            )}
          </section>

        {process.env.NODE_ENV !== "production" && (
          <details className="mt-4 border rounded-xl p-4">
            <summary className="cursor-pointer font-medium">Debug: Intake payload</summary>
            <pre className="mt-2 text-xs overflow-auto">{JSON.stringify(me.intake, null, 2)}</pre>
          </details>
        )}

          <div className="mt-6 flex items-center justify-between">
            <Link href="/" className={buttonSecondary}>
              ← Back home
            </Link>
            <button onClick={handleLogout} className="px-5 py-2.5 rounded-full font-semibold text-black bg-white hover:scale-[1.02] transition-transform duration-200">
              Sign out
            </button>
          </div>
        </div>

        {/* ===== Container 2: Sessions (upcoming + previous together) + Calendly ===== */}
        <div className={glassCard}>
          <section className="overflow-hidden">
            <div className="px-1 pb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white/90">Sessions</h2>
              <span className="text-xs text-white/60">
                Upcoming • Previous
              </span>
            </div>

            <div className="space-y-3">
              {loadingSessions ? (
                <p className="text-sm text-white/60">Loading…</p>
              ) : (sessions?.upcoming.length ?? 0) + (sessions?.past.length ?? 0) === 0 ? (
                <p className="text-sm text-white/60">No sessions yet—book below.</p>
              ) : (
              [...(sessions?.upcoming ?? []).map(s => ({ ...s, kind: "upcoming" as const })),
               ...(sessions?.past ?? []).map(s => ({ ...s, kind: "past" as const }))]
               .map((s, i) => {
                const isPast = s.kind === "past";
                return (
                    <div
                      key={`${s.id}-${s.calendly_invitee_uuid ?? i}`}
                      className={[
                        "rounded-2xl border p-4 transition-colors duration-150",
                        isPast
                          ? "bg-white/5 border-white/10"
                          : "bg-white/8 border-white/15",
                      ].join(" ")}
                    >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-white/90">{formatRange(s.start_utc, s.end_utc)}</p>
                            <span
                              className={[
                                "text-xs px-2 py-0.5 rounded-full font-medium",
                                isPast
                                  ? "bg-red-600 text-white border border-red-700"
                                  : "bg-green-600 text-white border border-green-700",
                              ].join(" ")}
                            >
                              {isPast ? "Previous" : "Upcoming"}
                            </span>
                          </div>
                          <p className="text-sm text-white/70">
                            {s.location_type ? s.location_type.replace("_", " ") : "Online"}
                          </p>
                        </div>

                        {/* Actions for upcoming */}
                        <div className="flex flex-wrap gap-2">
                          {s.kind !== "past" && s.join_url && (
                            <a
                              href={s.join_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-2 rounded-full bg-white text-gray-900 text-sm font-medium hover:scale-[1.02] transition-transform duration-200"
                            >
                              Join
                            </a>
                          )}
                          {sessionsWithNotes[s.id] && (
                            <button
                              type="button"
                              onClick={() => router.push(`/notes/${s.id}`)}
                              className="px-3 py-2 rounded-full border border-white/20 bg-white/5 text-white text-sm font-medium hover:bg-white/10 transition-colors duration-150"
                            >
                              View note
                            </button>
                          )}
                          {s.kind !== "past" && s.reschedule_url && (
                            <a
                              href={s.reschedule_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-2 rounded-full border border-white/20 bg-white/5 text-white text-sm font-medium hover:bg-white/10 transition-colors duration-150"
                            >
                              Reschedule
                            </a>
                          )}
                          {s.kind !== "past" && s.cancel_url && (
                            <a
                              href={s.cancel_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-2 rounded-full border border-white/20 bg-white/5 text-white text-sm font-medium hover:bg-white/10 transition-colors duration-150"
                            >
                              Cancel
                            </a>
                          )}
                        </div>
                      </div>
                      {isCoach && (
                        <p className="mt-2 text-xs text-white/50">
                          Session ID: <span className="font-mono">{s.id}</span>
                        </p>
                      )}
                    </div>
                );
              })
            )}
          </div>
        </section>

            {/* Calendly booking */}
            <section className="mt-6 rounded-2xl border border-white/10 overflow-hidden bg-white/5">
              <div className="px-4 py-3 flex items-center justify-between">
                <h3 className="font-medium text-white/90">Book a session</h3>
                <span className="text-xs text-white/60">Powered by Calendly</span>
              </div>
          <div className="h-[720px]">
            <InlineWidget
              url="https://calendly.com/adilh621/code-coaching"
              styles={{ height: "100%", width: "100%" }}
              pageSettings={{
                hideEventTypeDetails: false,
                hideLandingPageDetails: false,
              }}
              prefill={{
                name: me.intake?.parent_name ?? undefined,
                email: (me.email ?? getIntakeEmail(me)) ?? undefined,
              }}
              utm={{
                utmMedium: "looplab-dashboard",
                utmSource: "looplab",
              }}
              />
            </div>
          </section>
        </div>
      </div>

      {/* Student modal */}
      <Modal open={openStudent} onClose={() => setOpenStudent(false)} title="Edit student info">
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const payload: { student_name: string | null; service: string | null; student_age?: number; } = {
              student_name: formStudent.student_name || null,
              service: formStudent.service || null,
            };
            if (formStudent.student_age) payload.student_age = Number(formStudent.student_age);
            try {
              await updateMe(payload);
              setOpenStudent(false);
            } catch (err: unknown) {
              alert(getErrorMessage(err));
            }
          }}
        >
          <label className="block text-sm">
            <span className="text-white/80 mb-2 block">Student name</span>
            <input
              className="mt-1 w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-transparent transition-shadow duration-200"
              value={formStudent.student_name}
              onChange={(e) => setFormStudent(s => ({ ...s, student_name: e.target.value }))}
            />
          </label>
          <label className="block text-sm">
            <span className="text-white/80 mb-2 block">Age</span>
            <input
              type="number"
              min={2}
              max={120}
              className="mt-1 w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-transparent transition-shadow duration-200"
              value={formStudent.student_age}
              onChange={(e) => setFormStudent(s => ({ ...s, student_age: e.target.value }))}
            />
          </label>
          <label className="block text-sm">
            <span className="text-white/80 mb-2 block">Service</span>
            <select
              className="mt-1 w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-transparent transition-shadow duration-200"
              value={formStudent.service}
              onChange={(e) => setFormStudent(s => ({ ...s, service: e.target.value }))}
            >
              <option value="" className="bg-gray-800">—</option>
              <option value="Coding" className="bg-gray-800">Coding</option>
              <option value="Math" className="bg-gray-800">Math</option>
            </select>
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpenStudent(false)} className="px-4 py-2 rounded-full border border-white/20 bg-white/5 text-white hover:bg-white/10 transition-colors duration-150">Cancel</button>
            <button type="submit" className="px-4 py-2 rounded-full bg-white text-gray-900 hover:scale-[1.02] transition-transform duration-200">Save</button>
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
            } catch (err: unknown) {
              alert(getErrorMessage(err));
            }
          }}
        >
          <div className="grid grid-cols-2 gap-2">
            {WEEKDAYS.map((d) => (
              <label key={d} className="flex items-center gap-2 text-sm text-white/90 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formDays.includes(d)}
                  onChange={(e) =>
                    setFormDays(cur =>
                      e.target.checked ? [...cur, d] : cur.filter(x => x !== d)
                    )
                  }
                  className="w-4 h-4 rounded border-white/20 bg-white/5 text-cyan-400 focus:ring-cyan-400/50"
                />
                {d}
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpenDays(false)} className="px-4 py-2 rounded-full border border-white/20 bg-white/5 text-white hover:bg-white/10 transition-colors duration-150">Cancel</button>
            <button type="submit" className="px-4 py-2 rounded-full bg-white text-gray-900 hover:scale-[1.02] transition-transform duration-200">Save</button>
          </div>
        </form>
      </Modal>
    </GlassLayout>
  );
}
