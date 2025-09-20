// app/coach/notes/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getApiBase } from "@/lib/api";
import type { Me } from "@/lib/auth";

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
  created_at: string;
  updated_at: string;
  emailed_to?: string[] | null;
  email_sent_at?: string | null;
};

type SessionNotesPage = { items: SessionNote[]; total: number };

type BookingMeta = {
  id: number;
  start_utc: string | null;
  end_utc: string | null;
};

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

export default function CoachNotesPage() {
  const backend = getApiBase();
  const router = useRouter();
  const params = useSearchParams();

  const [me, setMe] = useState<Me | null>(null);
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
        setMe(data);
        setLoadingMe(false);
        if (!data.authenticated) {
          router.replace("/login");
          return;
        }
        const userEmail = (data.email ?? (data as any).intake?.email) as string | undefined;
        if (userEmail?.toLowerCase() !== COACH_EMAIL.toLowerCase()) {
          // Not the coach, kick back to dashboard
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

      // lightweight booking meta: grab from first note if any (created route doesn’t return booking,
      // so we’ll also ping /sessions/upcoming as a weak fallback if needed)
      if (data.items?.length) {
        // We don’t have start/end in note payload; fall back to a simple meta: only id known here.
        setBookingMeta({ id, start_utc: null, end_utc: null });
      } else {
        setBookingMeta({ id, start_utc: null, end_utc: null });
      }
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
      loadNotesForBooking(initialBookingFromQuery);
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

  if (loadingMe) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-lg border rounded-2xl p-6 shadow-sm text-center">Loading…</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6 flex flex-col items-center gap-6 bg-gray-50">
      <div className="w-full max-w-5xl">
        <div className="mb-4">
          <h1 className="text-2xl font-semibold">Coach Notes</h1>
          <p className="text-gray-600 text-sm">Visible to Coach Adil only. Use a Session Booking ID to view/add notes.</p>
        </div>

        <form onSubmit={handleLoadClick} className="flex items-end gap-2 bg-white border p-4 rounded-xl">
          <label className="block text-sm">
            <span className="text-gray-600">Booking ID</span>
            <input
              className="mt-1 w-[220px] rounded-lg border p-2"
              inputMode="numeric"
              pattern="[0-9]*"
              value={bookingId ?? ""}
              onChange={(e) => setBookingId(e.target.value ? Number(e.target.value) : undefined)}
              placeholder="e.g. 123"
            />
          </label>
          <button type="submit" className="px-3 py-2 rounded-lg bg-black text-white">Load</button>
        </form>

        {typeof bookingId === "number" && (
          <div className="mt-6 grid gap-6">
            {/* Meta */}
            <section className="bg-white border rounded-xl p-4">
              <h2 className="font-medium mb-2">Session</h2>
              <p className="text-sm text-gray-600">
                Booking #{bookingId} {bookingMeta?.start_utc ? `• ${formatRange(bookingMeta.start_utc, bookingMeta.end_utc)}` : ""}
              </p>
            </section>

            {/* Existing notes */}
            <section className="bg-white border rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-medium">Existing notes</h2>
                {notesLoading && <span className="text-xs text-gray-500">Loading…</span>}
              </div>
              {notesError ? (
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
                        {n.content_md.length > 500 ? `${n.content_md.slice(0, 500)}…` : n.content_md}
                      </pre>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Composer */}
            <section className="bg-white border rounded-xl p-4">
              <h2 className="font-medium mb-2">New note</h2>
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  createNote().catch((err: unknown) => alert(getErrorMessage(err)));
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
                    className="mt-1 w-full rounded-lg border p-2 min-h-[160px]"
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    placeholder={`For today's session...\n\nProgress:\n- \n\nWhat we did:\n- \n\nNext steps:\n- `}
                  />
                </label>

                <div className="grid sm:grid-cols-3 gap-3">
                  <label className="block text-sm">
                    <span className="text-gray-600">Visibility</span>
                    <select
                      className="mt-1 w-full rounded-lg border p-2"
                      value={noteVisibility}
                      onChange={(e) => setNoteVisibility(e.target.value as "private" | "parent" | "parent_and_student")}
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
                      onChange={(e) => setNoteStatus(e.target.value as "draft" | "published")}
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
                  <button type="submit" className="px-3 py-2 rounded-lg bg-black text-white">Save note</button>
                </div>
              </form>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
