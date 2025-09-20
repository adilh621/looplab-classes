// app/dashboard/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getApiBase } from "@/lib/api";
import type { Me } from "@/lib/auth";
import { InlineWidget } from "react-calendly";
// --- local helpers to avoid `any` casts ---
type WithEmail = { email?: string };
type WithStatus = { status?: string };

function getIntakeEmail(me: Me | null): string | undefined {
  const intake = me?.intake as unknown as WithEmail | undefined;
  return intake?.email;
}
function getIntakeStatus(me: Me | null): string | undefined {
  const intake = me?.intake as unknown as WithStatus | undefined;
  return intake?.status;
}
function getErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  try { return JSON.stringify(e); } catch { return "Unknown error"; }
}


const WEEKDAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

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
      className="ml-2 inline-flex items-center justify-center rounded-md p-1 text-gray-500 hover:text-gray-800 hover:bg-gray-100"
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="w-[min(92vw,720px)] rounded-2xl bg-white shadow-lg">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 id="modal-title" className="text-lg font-semibold">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-md p-1 hover:bg-gray-100"
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
  id: number;                     // <--- requires backend change
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

type SessionNote = {
  id: number;
  session_booking_id: number;
  coach_name?: string | null;
  status: "draft" | "published";
  visibility: "private" | "parent" | "parent_and_student";
  title?: string | null;
  content_md: string;
  created_at: string;
  updated_at: string;
  emailed_to?: string[] | null;
  email_sent_at?: string | null;
};

type SessionNotesPage = { items: SessionNote[]; total: number };

export default function DashboardPage() {
  const router = useRouter();
  const backend = getApiBase();
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  // modals
  const [openStudent, setOpenStudent] = useState(false);
  const [openDays, setOpenDays] = useState(false);

  // NEW: notes modal state
  const [openNotes, setOpenNotes] = useState(false);
  const [activeBooking, setActiveBooking] = useState<Booking | null>(null);
  const [notesLoading, setNotesLoading] = useState(false);
  const [notesError, setNotesError] = useState<string | null>(null);
  const [notes, setNotes] = useState<SessionNote[]>([]);

  // NEW: create note form state
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteVisibility, setNoteVisibility] = useState<"private"|"parent"|"parent_and_student">("parent");
  const [noteStatus, setNoteStatus] = useState<"draft"|"published">("draft");
  const [noteEmailOnPublish, setNoteEmailOnPublish] = useState(true);

  // forms
  const [formStudent, setFormStudent] = useState({ student_name: "", student_age: "", service: "" });
  const [formDays, setFormDays] = useState<string[]>([]);

  // sessions
  const [sessions, setSessions] = useState<SessionsRes | null>(null);
  const [loadingSessions, setLoadingSessions] = useState(true);

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

  // NEW: open notes modal for a booking
  const openNotesFor = async (booking: Booking) => {
    setActiveBooking(booking);
    setNotes([]);
    setNotesError(null);
    setNoteTitle("");
    setNoteContent("");
    setNoteVisibility("parent");
    setNoteStatus("draft");
    setNoteEmailOnPublish(true);

    setOpenNotes(true);
    setNotesLoading(true);
    try {
      const r = await fetch(`${backend}/session-notes?session_booking_id=${booking.id}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!r.ok) throw new Error(`Failed to load notes (${r.status})`);
      const data: SessionNotesPage = await r.json();
      setNotes(data.items || []);
    } catch (e: any) {
      setNotesError(e?.message || "Failed to load notes");
    } finally {
      setNotesLoading(false);
    }
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

  // NEW: create note helper
  async function createNote() {
    if (!activeBooking) return;
    if (!noteContent.trim()) {
      alert("Write something in the note first.");
      return;
    }
    const payload = {
      session_booking_id: activeBooking.id,
      title: noteTitle || null,
      content_md: noteContent,
      visibility: noteVisibility,
      status: noteStatus,
      send_email: noteStatus === "published" ? noteEmailOnPublish : false,
    };
    const res = await fetch(`${backend}/session-notes`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Create note failed (${res.status}) ${text}`);
    }
    // refresh list
    const r = await fetch(`${backend}/session-notes?session_booking_id=${activeBooking.id}`, {
      credentials: "include",
      cache: "no-store",
    });
    const data: SessionNotesPage = await r.json();
    setNotes(data.items || []);
    // reset editor, keep modal open
    setNoteTitle("");
    setNoteContent("");
    setNoteVisibility("parent");
    setNoteStatus("draft");
    setNoteEmailOnPublish(true);
  }

  if (loading || !me) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-lg border rounded-2xl p-6 shadow-sm text-center">Loading…</div>
      </main>
    );
  }

  /** Build a single list: upcoming first, then past */
  const combinedSessions: Array<Booking & { kind: "upcoming" | "past" }> = [
    ...(sessions?.upcoming ?? []).map(s => ({ ...s, kind: "upcoming" as const })),
    ...(sessions?.past ?? []).map(s => ({ ...s, kind: "past" as const })),
  ];

  return (
    <main className="min-h-screen p-6 flex flex-col items-center gap-6">
      {/* ===== Container 1: Welcome + Info + Preferred Days ===== */}
      <div className="w-full max-w-5xl border rounded-2xl p-6 shadow-sm bg-white">
        <div className="space-y-1 text-center mb-6">
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
                <dd>{me.email ?? (me as any).intake?.email ?? "—"}</dd>
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
                <dd>{(me.intake as any)?.status ?? "—"}</dd>
              </div>
            </dl>
          </div>
        </section>

        <section className="mt-4 border rounded-xl p-4">
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
          <details className="mt-4 border rounded-xl p-4">
            <summary className="cursor-pointer font-medium">Debug: Intake payload</summary>
            <pre className="mt-2 text-xs overflow-auto">{JSON.stringify(me.intake, null, 2)}</pre>
          </details>
        )}

        <div className="mt-4 flex items-center justify-between">
          <Link href="/" className="px-4 py-2 rounded-lg bg-gray-100">← Back home</Link>
          <Link href="/login" className="px-4 py-2 rounded-lg bg-black text-white">Switch account</Link>
        </div>
      </div>

      {/* ===== Container 2: Sessions (upcoming + previous together) + Calendly ===== */}
      <div className="w-full max-w-5xl border rounded-2xl p-6 shadow-sm bg-white">
        <section className="overflow-hidden">
          <div className="px-1 pb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Sessions</h2>
            <span className="text-xs text-gray-500">
              Upcoming in white • Previous in red
            </span>
          </div>

          <div className="space-y-3">
            {loadingSessions ? (
              <p className="text-sm text-gray-500">Loading…</p>
            ) : combinedSessions.length === 0 ? (
              <p className="text-sm text-gray-500">No sessions yet—book below.</p>
            ) : (
              combinedSessions.map((s, i) => {
                const isPast = s.kind === "past";
                return (
                  <div
                    key={`${s.id}-${s.calendly_invitee_uuid ?? i}`}
                    className={[
                      "rounded-xl border p-4",
                      isPast
                        ? "bg-rose-50 border-rose-200"
                        : "bg-white border-gray-200",
                    ].join(" ")}
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{formatRange(s.start_utc, s.end_utc)}</p>
                          <span
                            className={[
                              "text-xs px-2 py-0.5 rounded-full",
                              isPast
                                ? "bg-rose-100 text-rose-800"
                                : "bg-gray-100 text-gray-700",
                            ].join(" ")}
                          >
                            {isPast ? "Previous" : "Upcoming"}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          {s.location_type ? s.location_type.replace("_", " ") : "Online"}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="px-3 py-2 rounded-lg bg-gray-100 text-sm"
                          onClick={() => openNotesFor(s)}
                          title="View or add notes for this session"
                        >
                          Notes
                        </button>
                        {!isPast && s.join_url && (
                          <a
                            href={s.join_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-2 rounded-lg bg-black text-white text-sm"
                          >
                            Join
                          </a>
                        )}
                        {!isPast && s.reschedule_url && (
                          <a
                            href={s.reschedule_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-2 rounded-lg bg-gray-100 text-sm"
                          >
                            Reschedule
                          </a>
                        )}
                        {!isPast && s.cancel_url && (
                          <a
                            href={s.cancel_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-2 rounded-lg bg-gray-100 text-sm"
                          >
                            Cancel
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Calendly booking (kept with sessions) */}
        <section className="mt-6 rounded-xl border overflow-hidden">
          <div className="px-4 py-3 flex items-center justify-between bg-white">
            <h3 className="font-medium">Book a session</h3>
            <span className="text-xs text-gray-500">Powered by Calendly</span>
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
                email: (me.email ?? (me as any).intake?.email) ?? undefined,
              }}
              utm={{
                utmMedium: "looplab-dashboard",
                utmSource: "looplab",
              }}
            />
          </div>
        </section>
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

      {/* ===== Notes modal ===== */}
      <Modal
        open={openNotes}
        onClose={() => setOpenNotes(false)}
        title={activeBooking ? `Session Notes · ${formatRange(activeBooking.start_utc, activeBooking.end_utc)}` : "Session Notes"}
      >
        {!activeBooking ? (
          <p className="text-sm text-gray-500">No session selected.</p>
        ) : (
          <div className="grid gap-6">
            {/* Existing notes */}
            <section>
              <h4 className="font-medium mb-2">Existing notes</h4>
              {notesLoading ? (
                <p className="text-sm text-gray-500">Loading…</p>
              ) : notesError ? (
                <p className="text-sm text-red-600">{notesError}</p>
              ) : notes.length === 0 ? (
                <p className="text-sm text-gray-500">No notes yet.</p>
              ) : (
                <ul className="space-y-2">
                  {notes.map(n => (
                    <li key={n.id} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{n.title || "(Untitled note)"}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(n.created_at).toLocaleString()} • {n.coach_name ?? "Coach"} • {n.visibility} • {n.status}
                          </p>
                        </div>
                        {n.status === "published" ? (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">Published</span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800">Draft</span>
                        )}
                      </div>
                      <pre className="mt-2 text-sm whitespace-pre-wrap break-words text-gray-700">
                        {n.content_md.length > 400 ? `${n.content_md.slice(0, 400)}…` : n.content_md}
                      </pre>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Composer */}
            <section>
              <h4 className="font-medium mb-2">New note</h4>
              <form
                className="space-y-3"
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    await createNote();
                    alert(noteStatus === "published" && noteEmailOnPublish
                      ? "Note published and email sent (if address on file)."
                      : noteStatus === "published"
                        ? "Note published."
                        : "Draft saved.");
                  } catch (err: any) {
                    alert(err?.message || "Failed to create note");
                  }
                }}
              >
                <label className="block text-sm">
                  <span className="text-gray-600">Title (optional)</span>
                  <input
                    className="mt-1 w-full rounded-lg border p-2"
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                  />
                </label>

                <label className="block text-sm">
                  <span className="text-gray-600">Content (Markdown)</span>
                  <textarea
                    className="mt-1 w-full rounded-lg border p-2 min-h-[140px]"
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    placeholder={`For today's session... \n\nNext steps...\n\nHomework...`}
                  />
                </label>

                <div className="grid sm:grid-cols-3 gap-3">
                  <label className="block text-sm">
                    <span className="text-gray-600">Visibility</span>
                    <select
                      className="mt-1 w-full rounded-lg border p-2"
                      value={noteVisibility}
                      onChange={(e) => setNoteVisibility(e.target.value as any)}
                    >
                      <option value="private">Private (staff only)</option>
                      <option value="parent">Parent</option>
                      <option value="parent_and_student">Parent & Student</option>
                    </select>
                  </label>

                  <label className="block text-sm">
                    <span className="text-gray-600">Status</span>
                    <select
                      className="mt-1 w-full rounded-lg border p-2"
                      value={noteStatus}
                      onChange={(e) => setNoteStatus(e.target.value as any)}
                    >
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                    </select>
                  </label>

                  <label className="flex items-center gap-2 text-sm mt-6 sm:mt-[30px]">
                    <input
                      type="checkbox"
                      checked={noteEmailOnPublish}
                      onChange={(e) => setNoteEmailOnPublish(e.target.checked)}
                      disabled={noteStatus !== "published"}
                    />
                    Email parent on publish
                  </label>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setOpenNotes(false)}
                    className="px-3 py-2 rounded-lg bg-gray-100"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-2 rounded-lg bg-black text-white"
                  >
                    Save note
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}
      </Modal>
    </main>
  );
}
