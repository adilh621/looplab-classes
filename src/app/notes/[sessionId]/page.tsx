// app/notes/[sessionId]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getApiBase } from "@/lib/api";

type SessionNote = {
  id: number;
  session_booking_id: number;
  coach_name?: string | null;
  status: "draft" | "published";
  visibility: "private" | "parent" | "parent_and_student";
  title?: string | null;
  content_md: string;
  created_at: string; // ISO
  updated_at: string; // ISO
};

export default function SessionNotesPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();
  const backend = getApiBase();

  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<SessionNote[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
  let mounted = true;

  function normalizeToArray(json: unknown): SessionNote[] {
    if (Array.isArray(json)) return json as SessionNote[];
    if (json && typeof json === "object") {
      const obj = json as Record<string, unknown>;
      if (Array.isArray(obj.items)) return obj.items as SessionNote[];
      if (Array.isArray(obj.data)) return obj.data as SessionNote[];
      // Some backends return a single object for a single resource
      // Try to detect a single SessionNote shape:
      if (
        "id" in obj &&
        ("session_booking_id" in obj || "content_md" in obj || "status" in obj)
      ) {
        return [obj as SessionNote];
      }
    }
    return [];
  }

  async function fetchNotes() {
    setLoading(true);
    setErr(null);
    try {
      const urls = [
        `${backend}/session-notes/by-session/${sessionId}`,
        `${backend}/session-notes?session_booking_id=${sessionId}`,
      ];

      let raw: unknown = null;
      let ok = false;

      for (const url of urls) {
        const r = await fetch(url, { credentials: "include", cache: "no-store" });
        if (r.status === 204) { ok = true; raw = []; break; } // no content
        if (r.ok) { ok = true; raw = await r.json(); break; }
      }

      if (!mounted) return;
      if (!ok) {
        setNotes([]);
        setErr("Failed to load notes.");
        setLoading(false);
        return;
      }

      const arr = normalizeToArray(raw);

      // Parent-visible + published only (belt & suspenders)
      const visible = arr.filter(
        (n) => n.status === "published" && (n.visibility === "parent" || n.visibility === "parent_and_student")
      );

      setNotes(visible);
    } catch (e) {
      if (!mounted) return;
      setNotes([]);
      setErr(e instanceof Error ? e.message : "Failed to load notes.");
    } finally {
      if (mounted) setLoading(false);
    }
  }

  if (sessionId) fetchNotes();
  return () => { mounted = false; };
}, [backend, sessionId]);


  return (
    <main className="min-h-screen p-6 flex flex-col items-center">
      <div className="w-full max-w-3xl border rounded-2xl p-6 shadow-sm bg-white">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold">Session Notes</h1>
          <Link href="/dashboard" className="px-3 py-2 rounded-lg bg-gray-100 text-sm">← Back to dashboard</Link>
        </div>
        <p className="mt-1 text-sm text-gray-600 mb-6">
          These notes are written by your coach for this specific class session. They&apos;re here to help you track
          progress and what was covered.
        </p>

        {loading && <p className="mt-4 text-sm text-gray-500">Loading…</p>}
        {err && <p className="mt-4 text-sm text-rose-600">Error: {err}</p>}

        {!loading && !err && (notes?.length ?? 0) === 0 && (
          <div className="mt-6 rounded-xl border bg-gray-50 p-4">
            <p className="text-gray-700">No notes yet.</p>
            <p className="text-xs text-gray-500 mt-1">
              If your coach adds notes after the session and makes them visible to parents, they’ll appear here.
            </p>
          </div>
        )}

        {!loading && !err && (notes?.length ?? 0) > 0 && (
          <div className="mt-4 space-y-4">
            {notes!.map((n) => (
              <article key={n.id} className="rounded-xl border p-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-medium">{n.title || "Session note"}</h2>
                  <span className="text-xs text-gray-500">
                    {new Date(n.updated_at || n.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {n.coach_name ? `By ${n.coach_name}` : "Coach"}
                </p>
                {/* Render the markdown as plain text; swap to a markdown renderer later if desired */}
                <pre className="mt-3 whitespace-pre-wrap text-sm leading-6">{n.content_md}</pre>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
