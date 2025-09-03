// app/lib/auth.ts
export type ClientIntake = {
  id: number;
  email: string;
  parent_name?: string | null;
  student_name?: string | null;
  student_age?: number | null;
  phone?: string | null;
  timezone?: string | null;
  preferred_days?: string[] | null;
  preferred_times?: string[] | null;
  course?: string | null;
  service?: string | null;
  start_date?: string | null;
  notes?: string | null;
  source?: string | null;
  consent?: boolean | null;
  status: string;
};

export type Me = {
  authenticated: boolean;
  email?: string | null;
  name?: string | null;
  intake?: ClientIntake | null;
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
