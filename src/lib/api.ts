// app/lib/api.ts
export function getApiBase() {
  const base = process.env.NEXT_PUBLIC_BACKEND_URL?.trim();
  if (!base) {
    if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
      console.error("NEXT_PUBLIC_BACKEND_URL is not set.");
    }
    return "http://127.0.0.1:8000";
  }
  if (!/^https?:\/\//i.test(base)) {
    if (process.env.NODE_ENV === "development") {
      console.error("NEXT_PUBLIC_BACKEND_URL must start with http:// or https://");
    }
  }
  return base.replace(/\/+$/, "");
}
