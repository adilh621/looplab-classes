// app/lib/auth.ts
export type Me = {
  authenticated: boolean;
  email?: string;
  name?: string | null;
};

export async function fetchMe(backend: string, cookieHeader?: string): Promise<Me> {
  const res = await fetch(`${backend}/session/me`, {
    // In middleware we pass headers manually; in the browser we rely on credentials: "include"
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
    credentials: cookieHeader ? undefined : "include",
    cache: "no-store",
    next: { revalidate: 0 }, // ensure no caching on the Next side
  }).catch(() => null as Response | null);

  if (!res || !res.ok) return { authenticated: false };
  const data = (await res.json()) as Me;
  return data?.authenticated ? data : { authenticated: false };
}
