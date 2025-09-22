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

    async function fetchNotes() {
      setLoading(true);
      setErr(null);
      try {
        // Try a RESTful endpoint first, then fall back to query pattern.
        const tryUrls = [
          `${backend}/session-notes/by-session/${sessionId}`,
          `${backend}/session-notes?session_booking_id=${sessionId}`,
        ];

        let data: SessionNote[] | null = null;
        for (const url of tryUrls) {
          const r = await fetch(url, { credentials: "include", cache: "no-store" });
          if (r.ok) {
            data = (await r.json()) as SessionNote[] | null;
            break;
          }
        }

        if (!mounted) return;
        // Client-side safety filter: parents should only see published & parent-visible notes.
        const visible = (data ?? []).filter(
          (n) => n.status === "published" && (n.visibility === "parent" || n.visibility === "parent_and_student")
        );
        setNotes(visible);
      } catch (e) {
        if (!mounted) return;
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
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Instructor notes</h1>
          <Link href="/dashboard" className="px-3 py-2 rounded-lg bg-gray-100 text-sm">← Back to dashboard</Link>
        </div>

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
