export interface YouTubeVideo {
  id: string;
  canonicalUrl: string;
  embedUrl: string;
  thumbnailUrl: string;
  startSeconds?: number;
}

const VIDEO_ID_REGEX = /^[A-Za-z0-9_-]{11}$/;
const URL_REGEX = /(https?:\/\/[^\s]+|www\.[^\s]+\.[a-zA-Z]{2,})/g;
const TRAILING_PUNCTUATION = /[),.!?;:'"]+$/;

const isYouTubeHost = (hostname: string): boolean => {
  const host = hostname.toLowerCase().replace(/^www\./, "");
  return (
    host === "youtu.be" ||
    host === "youtube.com" ||
    host.endsWith(".youtube.com") ||
    host === "youtube-nocookie.com" ||
    host.endsWith(".youtube-nocookie.com")
  );
};

const parseStartSeconds = (value: string | null): number | undefined => {
  if (!value) return undefined;

  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) return Math.floor(numeric);

  const match = value.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  if (!match) return undefined;

  const total =
    (Number(match[1]) || 0) * 3600 +
    (Number(match[2]) || 0) * 60 +
    (Number(match[3]) || 0);

  return total > 0 ? total : undefined;
};

const extractVideoId = (url: URL): string | null => {
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  const path = url.pathname.replace(/\/+$/, "");

  if (host === "youtu.be") {
    const id = path.slice(1).split("/")[0];
    return VIDEO_ID_REGEX.test(id) ? id : null;
  }

  const fromQuery = url.searchParams.get("v");
  if (fromQuery && VIDEO_ID_REGEX.test(fromQuery)) return fromQuery;

  const match = path.match(/^\/(?:shorts|embed|live|v)\/([^/]+)/);
  const id = match?.[1];
  return id && VIDEO_ID_REGEX.test(id) ? id : null;
};

export function parseYouTubeUrl(rawUrl: string | null | undefined): YouTubeVideo | null {
  if (!rawUrl) return null;

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }

  if (!isYouTubeHost(url.hostname)) return null;

  const id = extractVideoId(url);
  if (!id) return null;

  const startSeconds = parseStartSeconds(
    url.searchParams.get("t") ??
      url.searchParams.get("start") ??
      url.hash.replace(/^#/, "").replace(/^t=/, "")
  );

  const canonicalUrl = `https://www.youtube.com/watch?v=${id}${
    startSeconds ? `&t=${startSeconds}s` : ""
  }`;
  const embedUrl = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0${
    startSeconds ? `&start=${startSeconds}` : ""
  }`;

  return {
    id,
    canonicalUrl,
    embedUrl,
    thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    startSeconds,
  };
}

export function extractYouTubeVideo(
  content: string | null | undefined
): YouTubeVideo | null {
  if (!content) return null;

  const withoutCodeBlocks = content.replace(/```[\s\S]*?```/g, " ");
  const matches = withoutCodeBlocks.match(URL_REGEX);
  if (!matches) return null;

  for (const match of matches) {
    const withProtocol = match.startsWith("www.") ? `https://${match}` : match;
    const cleaned = withProtocol.replace(TRAILING_PUNCTUATION, "");
    const video = parseYouTubeUrl(cleaned);
    if (video) return video;
  }

  return null;
}
