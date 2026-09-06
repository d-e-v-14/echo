/**
 * Resolved API base URL with any trailing slashes stripped, so callers can
 * safely append `/api/...` paths without producing a double slash
 * (`host//api/...`) which the backend rejects with a 404.
 */
const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

export function buildApiUrl(path: string): string {
  return `${API_BASE_URL}/${path.replace(/^\/+/, "")}`;
}