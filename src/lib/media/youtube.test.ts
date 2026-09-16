import { describe, expect, it } from "vitest";
import { extractYouTubeVideo, parseYouTubeUrl } from "./youtube";

const ID = "dQw4w9WgXcQ";

describe("parseYouTubeUrl", () => {
  it("parses a standard watch URL", () => {
    const video = parseYouTubeUrl(`https://www.youtube.com/watch?v=${ID}`);
    expect(video).toMatchObject({
      id: ID,
      canonicalUrl: `https://www.youtube.com/watch?v=${ID}`,
      thumbnailUrl: `https://i.ytimg.com/vi/${ID}/hqdefault.jpg`,
    });
    expect(video?.embedUrl).toContain(`/embed/${ID}`);
  });

  it("parses youtu.be short links", () => {
    expect(parseYouTubeUrl(`https://youtu.be/${ID}`)?.id).toBe(ID);
  });

  it("parses shorts, embed and live paths", () => {
    expect(parseYouTubeUrl(`https://www.youtube.com/shorts/${ID}`)?.id).toBe(ID);
    expect(parseYouTubeUrl(`https://www.youtube.com/embed/${ID}`)?.id).toBe(ID);
    expect(parseYouTubeUrl(`https://www.youtube.com/live/${ID}`)?.id).toBe(ID);
  });

  it("parses subdomains such as music.youtube.com", () => {
    expect(
      parseYouTubeUrl(`https://music.youtube.com/watch?v=${ID}`)?.id
    ).toBe(ID);
  });

  it("keeps an explicit start time", () => {
    const video = parseYouTubeUrl(`https://youtu.be/${ID}?t=90`);
    expect(video?.startSeconds).toBe(90);
    expect(video?.embedUrl).toContain("start=90");
    expect(video?.canonicalUrl).toContain("t=90s");
  });

  it("understands h/m/s duration notation", () => {
    expect(
      parseYouTubeUrl(`https://www.youtube.com/watch?v=${ID}&t=1m30s`)
        ?.startSeconds
    ).toBe(90);
  });

  it("rejects non-YouTube hosts and malformed ids", () => {
    expect(parseYouTubeUrl(`https://example.com/watch?v=${ID}`)).toBeNull();
    expect(parseYouTubeUrl("https://www.youtube.com/watch?v=short")).toBeNull();
    expect(parseYouTubeUrl(`https://notyoutube.com/watch?v=${ID}`)).toBeNull();
    expect(parseYouTubeUrl(undefined)).toBeNull();
    expect(parseYouTubeUrl("not a url")).toBeNull();
  });
});

describe("extractYouTubeVideo", () => {
  it("finds a link inside surrounding text", () => {
    const video = extractYouTubeVideo(`check this https://youtu.be/${ID} out`);
    expect(video?.id).toBe(ID);
  });

  it("strips trailing punctuation", () => {
    const video = extractYouTubeVideo(`look (https://youtu.be/${ID}).`);
    expect(video?.id).toBe(ID);
  });

  it("ignores links inside code fences", () => {
    expect(
      extractYouTubeVideo("```\nhttps://youtu.be/" + ID + "\n```")
    ).toBeNull();
  });

  it("returns the first video when several are present", () => {
    const first = "abcdefghijk";
    const video = extractYouTubeVideo(
      `https://youtu.be/${first} and https://youtu.be/${ID}`
    );
    expect(video?.id).toBe(first);
  });

  it("returns null when there is no video", () => {
    expect(extractYouTubeVideo("hello world")).toBeNull();
    expect(extractYouTubeVideo("")).toBeNull();
    expect(extractYouTubeVideo(null)).toBeNull();
  });
});
