// app/coach/notes/page.tsx
"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getApiBase } from "@/lib/api";
import type { Me } from "@/lib/auth";
import { GlassLayout, glassCard, buttonPrimary, buttonSecondary, inputStyle } from "../../_components/auth/GlassLayout";

const COACH_EMAIL = "adilh621+looplab@gmail.com";

// ---- types ----
type SessionNote = {
  id: number;
  session_booking_id: number;
  coach_name?: string | null;
  status: "draft" | "published";
  visibility: "private" | "parent" | "parent_and_student";
  title?: string | null;
  content_md: string;
  created_at: string; // ISO string from API
  updated_at: string; // ISO string from API
  emailed_to?: string[] | null;
  email_sent_at?: string | null;
};

type SessionNotesPage = { items: SessionNote[]; total: number };

type BookingMeta = {
  id: number;
  start_utc: string | null;
  end_utc: string | null;
};

// Session types (matching dashboard)
type Booking = {
  id: number;
  start_utc: string | null;
  end_utc: string | null;
  location_type: string | null;
  join_url: string | null;
  reschedule_url: string | null;
  cancel_url: string | null;
  calendly_event_uuid?: string | null;
  calendly_invitee_uuid?: string | null;
  status?: string | null;
  // Optional parent info (included in admin mode)
  parent_email?: string | null;
  parent_name?: string | null;
};

type SessionsRes = {
  upcoming: Booking[];
  past: Booking[];
};

// helper: safely read intake.email without `any`
type WithEmail = { email?: string };
function getIntakeEmail(me: Me): string | undefined {
  const intake = (me.intake ?? undefined) as WithEmail | undefined;
  return intake?.email;
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
    weekday: "short", month: "short", day: "numeric",
  }).format(start);
  const timeFmt = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
  const startPart = timeFmt.format(start);
  const endPart = end ? timeFmt.format(end) : null;
  return endPart ? `${datePart}, ${startPart}–${endPart}` : `${datePart}, ${startPart}`;
}

// Session row component for the session list
function SessionRow({ session, onPickId }: { session: Booking; onPickId: (id: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 p-3 bg-white/6 border border-white/10 rounded-2xl hover:bg-white/8 transition-colors duration-150">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-medium text-white/90">ID: {session.id}</span>
          {session.status && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 border border-white/15 text-white/70">
              {session.status}
            </span>
          )}
        </div>
        <p className="text-xs text-white/70 mt-0.5">
          {formatRange(session.start_utc, session.end_utc) || "No date"}
          {session.location_type && ` • ${session.location_type.replace("_", " ")}`}
          {session.parent_name && ` • ${session.parent_name}`}
          {session.parent_email && !session.parent_name && ` • ${session.parent_email}`}
        </p>
      </div>
      <button
        type="button"
        onClick={() => {
          onPickId(session.id);
          if (navigator.clipboard?.writeText) {
            navigator.clipboard.writeText(String(session.id)).catch(() => {});
          }
        }}
        className="px-3 py-1.5 rounded-full bg-white text-gray-900 text-sm font-medium hover:scale-[1.02] transition-transform duration-200"
      >
        Use ID
      </button>
    </div>
  );
}

// Session list component
function CoachSessionList({ onSelectBookingId }: { onSelectBookingId: (id: number) => void }) {
  const backend = getApiBase();
  const [upcomingSessions, setUpcomingSessions] = useState<Booking[]>([]);
  const [pastSessions, setPastSessions] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const r = await fetch(`${backend}/sessions?limit_past=50&limit_upcoming=50&admin_all=true`, {
          credentials: "include",
          cache: "no-store",
        });
        if (!r.ok) throw new Error(`Failed to load sessions (${r.status})`);
        const data: SessionsRes = await r.json();
        if (!mounted) return;
        setUpcomingSessions(data.upcoming || []);
        setPastSessions(data.past || []);
        setError(null);
      } catch (e: unknown) {
        if (!mounted) return;
        setError(getErrorMessage(e));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [backend]);

  return (
    <section className={`${glassCard} bg-white/8`}>
      <h2 className="text-lg font-semibold mb-4 text-white/90">Your Sessions</h2>
      {loading && <p className="mt-2 text-sm text-white/60">Loading sessions…</p>}
      {error && <p className="mt-2 text-sm text-red-300">{error}</p>}

      {!loading && !error && (
        <>
          <div className="mt-3">
            <h3 className="text-sm font-medium text-white/80">Upcoming</h3>
            <div className="mt-2 space-y-2">
              {upcomingSessions.length === 0 && (
                <p className="text-sm text-white/60">No upcoming sessions.</p>
              )}
              {upcomingSessions.map((session) => (
                <SessionRow key={session.id} session={session} onPickId={onSelectBookingId} />
              ))}
            </div>
          </div>

          <div className="mt-4">
            <h3 className="text-sm font-medium text-white/80">Past</h3>
            <div className="mt-2 space-y-2">
              {pastSessions.length === 0 && (
                <p className="text-sm text-white/60">No past sessions.</p>
              )}
              {pastSessions.map((session) => (
                <SessionRow key={session.id} session={session} onPickId={onSelectBookingId} />
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
}

/** Page wrapper: provides Suspense boundary for useSearchParams usage */
export default function CoachNotesPage() {
  return (
    <Suspense
      fallback={
        <GlassLayout>
          <div className={`${glassCard} text-center text-white/80`}>Loading…</div>
        </GlassLayout>
      }
    >
      <NotesClient />
    </Suspense>
  );
}

/** Inner client component that uses useSearchParams */
function NotesClient() {
  const backend = getApiBase();
  const router = useRouter();
  const params = useSearchParams();

  const [loadingMe, setLoadingMe] = useState(true);

  // guard + bootstrap bookingId from query
  const initialBookingFromQuery = useMemo(() => {
    const q = params.get("booking");
    return q ? Number(q) : undefined;
  }, [params]);

  // selected booking state (coach manually loads by ID)
  const [bookingId, setBookingId] = useState<number | undefined>(initialBookingFromQuery);
  const [bookingMeta, setBookingMeta] = useState<BookingMeta | null>(null);

  // notes state
  const [notes, setNotes] = useState<SessionNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [notesError, setNotesError] = useState<string | null>(null);

  // composer
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteVisibility, setNoteVisibility] = useState<"private"|"parent"|"parent_and_student">("parent");
  const [noteStatus, setNoteStatus] = useState<"draft"|"published">("draft");
  const [noteEmailOnPublish, setNoteEmailOnPublish] = useState(true);

  // load /session/me and gate
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const r = await fetch(`${backend}/session/me`, { credentials: "include", cache: "no-store" });
        const data: Me = await r.json();
        if (!mounted) return;
        setLoadingMe(false);
        if (!data.authenticated) {
          router.replace("/login");
          return;
        }
        const userEmail = data.email ?? getIntakeEmail(data);
        if ((userEmail ?? "").toLowerCase() !== COACH_EMAIL.toLowerCase()) {
          router.replace("/dashboard");
        }
      } catch {
        if (!mounted) return;
        setLoadingMe(false);
        router.replace("/login");
      }
    })();
    return () => { mounted = false; };
  }, [backend, router]);

  // load notes (and a tiny bit of booking meta) when bookingId changes
  async function loadNotesForBooking(id: number) {
    setNotesError(null);
    setNotes([]);
    setNotesLoading(true);
    setBookingMeta(null);
    try {
      const r = await fetch(`${backend}/session-notes?session_booking_id=${id}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!r.ok) throw new Error(`Failed to load notes (${r.status})`);
      const data: SessionNotesPage = await r.json();
      setNotes(data.items || []);
      setBookingMeta({ id, start_utc: null, end_utc: null });
    } catch (e: unknown) {
      setNotesError(getErrorMessage(e));
    } finally {
      setNotesLoading(false);
    }
  }

  // auto-load if query had booking
  useEffect(() => {
    if (typeof initialBookingFromQuery === "number" && !Number.isNaN(initialBookingFromQuery)) {
      setBookingId(initialBookingFromQuery);
      void loadNotesForBooking(initialBookingFromQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLoadClick(e: React.FormEvent) {
    e.preventDefault();
    if (!bookingId || Number.isNaN(bookingId)) {
      alert("Enter a valid Booking ID.");
      return;
    }
    // persist booking param in URL
    const search = new URLSearchParams(Array.from(params.entries()));
    search.set("booking", String(bookingId));
    router.replace(`/coach/notes?${search.toString()}`);
    await loadNotesForBooking(bookingId);
  }

  function handleSelectBookingId(id: number) {
    setBookingId(id);
    // Optionally update URL and load notes immediately
    const search = new URLSearchParams(Array.from(params.entries()));
    search.set("booking", String(id));
    router.replace(`/coach/notes?${search.toString()}`);
    void loadNotesForBooking(id);
  }

  async function createNote() {
    if (!bookingId) return;
    if (!noteContent.trim()) {
      alert("Write something in the note first.");
      return;
    }
    const payload = {
      session_booking_id: bookingId,
      title: noteTitle || null,
      content_md: noteContent,
      visibility: noteVisibility,
      status: noteStatus,
      send_email: noteStatus === "published" ? noteEmailOnPublish : false,
      coach_name: "Coach Adil",
    };
    const res = await fetch(`${backend}/session-notes`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      alert(`Create note failed (${res.status}) ${text}`);
      return;
    }
    await loadNotesForBooking(bookingId);
    setNoteTitle("");
    setNoteContent("");
    setNoteVisibility("parent");
    setNoteStatus("draft");
    setNoteEmailOnPublish(true);
    alert("Note saved.");
  }

  // --- NEW: delete a note ---
  async function deleteNote(noteId: number) {
    if (!bookingId) return;
    const ok = confirm("Delete this note? This cannot be undone.");
    if (!ok) return;
    const res = await fetch(`${backend}/session-notes/${noteId}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      alert(`Delete failed (${res.status}) ${text}`);
      return;
    }
    await loadNotesForBooking(bookingId);
  }

  // --- NEW: toggle note status Draft ⇄ Published ---
  async function toggleStatus(note: SessionNote) {
    if (!bookingId) return;
    const next: "draft" | "published" = note.status === "published" ? "draft" : "published";
    let send_email = false;
    if (next === "published") {
      send_email = confirm("Publish this note and email the parent now?");
    }
    const res = await fetch(`${backend}/session-notes/${note.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next, send_email }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      alert(`Update failed (${res.status}) ${text}`);
      return;
    }
    await loadNotesForBooking(bookingId);
  }

  if (loadingMe) {
    return (
      <GlassLayout>
        <div className={`${glassCard} text-center text-white/80`}>Loading…</div>
      </GlassLayout>
    );
  }

  return (
    <GlassLayout maxWidth="5xl">
      <div className="space-y-6">
        {/* Header */}
        <div className={glassCard}>
          <div className="mb-4">
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Coach Notes</h1>
            <p className="text-white/70 text-sm">Visible to Coach Adil only. Use a Session Booking ID to view/add notes.</p>
          </div>
          <Link href="/dashboard" className={buttonSecondary}>
            ← Back to dashboard
          </Link>
        </div>

        {/* Workflow explanation */}
        <div className={`${glassCard} bg-white/8`}>
          <p className="font-semibold mb-2 text-white/90">How this page works</p>
          <p className="mb-2 text-white/70 text-sm">
            Each note is attached to a specific <span className="font-mono text-white/90">session_booking_id</span>, which matches the
            session ID shown on the parent dashboard.
          </p>
          <p className="mb-2 text-white/70 text-sm">
            Workflow:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-white/70 text-sm">
            <li>Parent books a session via Calendly → it appears on their dashboard.</li>
            <li>You copy the <span className="font-mono text-white/90">Session ID</span> from the dashboard.</li>
            <li>Paste that ID here as the <span className="font-mono text-white/90">session_booking_id</span> to create notes.</li>
            <li>Published notes with parent visibility will appear on the parent side under that same session.</li>
          </ul>
        </div>

        {/* Booking chooser */}
        <form onSubmit={handleLoadClick} className={`${glassCard} flex flex-wrap items-end gap-2`}>
          <label className="block text-sm">
            <span className="text-white/80 mb-2 block">Booking ID</span>
            <input
              className={`${inputStyle} w-[220px]`}
              inputMode="numeric"
              pattern="[0-9]*"
              value={bookingId ?? ""}
              onChange={(e) => setBookingId(e.target.value ? Number(e.target.value) : undefined)}
              placeholder="e.g. 123"
            />
          </label>
          <button type="submit" className="px-5 py-2.5 rounded-full font-semibold text-gray-900 bg-white hover:scale-[1.02] transition-transform duration-200">Load</button>
        </form>

        {/* Session list */}
        <CoachSessionList onSelectBookingId={handleSelectBookingId} />

        {typeof bookingId === "number" && (
          <div className="space-y-6">
            {/* Session Meta */}
            <section className={`${glassCard} bg-white/8`}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-medium text-white/90">Session</h2>
                  <p className="text-sm text-white/70">
                    Booking #{bookingId} {bookingMeta?.start_utc ? `• ${formatRange(bookingMeta.start_utc, bookingMeta.end_utc)}` : ""}
                  </p>
                </div>
                {notesLoading && <span className="text-xs text-white/60">Loading…</span>}
              </div>
            </section>

            {/* Two-column layout on desktop: Composer (left) • Existing notes (right) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Composer */}
              <section className={`${glassCard} bg-white/8`}>
                <h2 className="font-medium mb-3 text-white/90">New note</h2>
                <form
                  className="space-y-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void createNote();
                  }}
                >
                  <label className="block text-sm">
                    <span className="text-white/80 mb-2 block">Title (optional)</span>
                    <input
                      className={inputStyle}
                      value={noteTitle}
                      onChange={(e) => setNoteTitle(e.target.value)}
                    />
                  </label>

                  <label className="block text-sm">
                    <span className="text-white/80 mb-2 block">Content (Markdown)</span>
                    <textarea
                      className={`${inputStyle} min-h-[200px] resize-none`}
                      value={noteContent}
                      onChange={(e) => setNoteContent(e.target.value)}
                      placeholder={`For today's session...\n\nProgress:\n- \n\nWhat we did:\n- \n\nNext steps:\n- `}
                    />
                  </label>

                  <div className="grid sm:grid-cols-3 gap-3">
                    <label className="block text-sm">
                      <span className="text-white/80 mb-2 block">Visibility</span>
                      <select
                        className={inputStyle}
                        value={noteVisibility}
                        onChange={(e) => setNoteVisibility(e.target.value as "private" | "parent" | "parent_and_student")}
                      >
                        <option value="private" className="bg-gray-800">Private (staff only)</option>
                        <option value="parent" className="bg-gray-800">Parent</option>
                        <option value="parent_and_student" className="bg-gray-800">Parent & Student</option>
                      </select>
                    </label>

                    <label className="block text-sm">
                      <span className="text-white/80 mb-2 block">Status</span>
                      <select
                        className={inputStyle}
                        value={noteStatus}
                        onChange={(e) => setNoteStatus(e.target.value as "draft" | "published")}
                      >
                        <option value="draft" className="bg-gray-800">Draft</option>
                        <option value="published" className="bg-gray-800">Published</option>
                      </select>
                    </label>

                    <label className="flex items-center gap-2 text-sm mt-6 sm:mt-[30px] text-white/90">
                      <input
                        type="checkbox"
                        checked={noteEmailOnPublish}
                        onChange={(e) => setNoteEmailOnPublish(e.target.checked)}
                        disabled={noteStatus !== "published"}
                        className="w-4 h-4 rounded border-white/20 bg-white/5 text-cyan-400 focus:ring-cyan-400/50"
                      />
                      Email parent on publish
                    </label>
                  </div>

                  <div className="flex justify-end gap-2">
                    <button type="submit" className="px-5 py-2.5 rounded-full font-semibold text-black bg-white hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-400/50 transition-colors duration-200">
                      Save
                    </button>
                  </div>
                </form>
              </section>

              {/* Existing notes */}
              <section className={`${glassCard} bg-white/8`}>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-medium text-white/90">Existing notes</h2>
                </div>

                {notesError ? (
                  <p className="text-sm text-red-300">{notesError}</p>
                ) : notes.length === 0 ? (
                  <p className="text-sm text-white/60">No notes yet.</p>
                ) : (
                  <ul className="space-y-3">
                    {notes.map(n => (
                      <li key={n.id} className="bg-white/6 border border-white/10 rounded-2xl p-4 hover:bg-white/8 transition-colors duration-150">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium truncate text-white/90">{n.title || "(Untitled note)"}</p>
                              <span
                                className={[
                                  "text-xs px-2 py-0.5 rounded-full",
                                  n.status === "published"
                                    ? "bg-cyan-400/20 border border-cyan-400/30 text-white/90"
                                    : "bg-white/10 border border-white/15 text-white/70",
                                ].join(" ")}
                              >
                                {n.status === "published" ? "Published" : "Draft"}
                              </span>
                            </div>
                            <p className="text-xs text-white/60">
                              {new Date(n.created_at).toLocaleString()} • {n.coach_name ?? "Coach"} • {n.visibility}
                            </p>
                          </div>

                          {/* Actions */}
                          <div className="flex flex-wrap gap-2 shrink-0">
                            <button
                              onClick={() => void toggleStatus(n)}
                              className="px-2.5 py-1.5 rounded-full text-sm border border-white/20 bg-white/5 text-white hover:bg-white/10 transition-colors duration-150"
                              title={n.status === "published" ? "Revert to Draft" : "Publish"}
                              type="button"
                            >
                              {n.status === "published" ? "Mark Draft" : "Publish"}
                            </button>
                            <button
                              onClick={() => void deleteNote(n.id)}
                              className="px-2.5 py-1.5 rounded-full text-sm border border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20 transition-colors duration-150"
                              title="Delete note"
                              type="button"
                            >
                              Delete
                            </button>
                          </div>
                        </div>

                        <pre className="mt-2 text-sm whitespace-pre-wrap break-words text-white/80">
                          {n.content_md.length > 800 ? `${n.content_md.slice(0, 800)}…` : n.content_md}
                        </pre>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </div>
        )}
      </div>
    </GlassLayout>
  );
}
