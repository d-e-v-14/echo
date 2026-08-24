const SAFE_PROTOCOLS = new Set(["http:", "https:", "blob:"]);
const SAFE_MEDIA_PROTOCOLS = new Set(["http:", "https:", "blob:", "data:"]);

export function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url, "http://localhost");
    return SAFE_PROTOCOLS.has(parsed.protocol);
  } catch {
    return false;
  }
}

export function isSafeMediaUrl(url: string): boolean {
  try {
    const parsed = new URL(url, "http://localhost");
    return SAFE_MEDIA_PROTOCOLS.has(parsed.protocol);
  } catch {
    return false;
  }
}

export function safeHref(url: string | undefined | null): string | undefined {
  if (!url) return undefined;
  return isSafeUrl(url) ? url : undefined;
}