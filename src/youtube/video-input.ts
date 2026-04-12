import { AppError, EXIT_CODE } from "../errors.js";

const videoIdPattern = /^[\w-]{11}$/u;
const pathVideoSegments = new Set(["shorts", "embed", "v", "live"]);

const fromYoutuBe = (url: URL): string | undefined => {
  const id = url.pathname.slice(1).split("/")[0] ?? "";
  return videoIdPattern.test(id) ? id : undefined;
};

const fromYoutubeCom = (url: URL): string | undefined => {
  const watchId = url.searchParams.get("v");

  if (watchId && videoIdPattern.test(watchId)) {
    return watchId;
  }

  const segments = url.pathname.split("/").filter(Boolean);
  const [first, second] = segments;

  if (first && pathVideoSegments.has(first) && second && videoIdPattern.test(second)) {
    return second;
  }

  return undefined;
};

export const parseVideoInput = (input: string): string => {
  const value = input.trim();

  if (value.length === 0) {
    throw new AppError("A video URL or ID is required.", EXIT_CODE.usageError);
  }

  if (videoIdPattern.test(value)) {
    return value;
  }

  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new AppError(`Invalid video URL or ID: ${value}`, EXIT_CODE.usageError);
  }

  const host = url.hostname.replace(/^www\./u, "").replace(/^m\./u, "");
  const resolved = host === "youtu.be" ? fromYoutuBe(url) : undefined;
  const fallback = host === "youtube.com" ? fromYoutubeCom(url) : undefined;
  const videoId = resolved ?? fallback;

  if (!videoId) {
    throw new AppError(`Could not extract video ID from: ${value}`, EXIT_CODE.usageError);
  }

  return videoId;
};
