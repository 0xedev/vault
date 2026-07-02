import { randomUUID } from "crypto";

const MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/svg+xml": "svg",
};

export function extensionFromMime(mime: string) {
  return MIME_EXTENSIONS[mime.toLowerCase()] || "bin";
}

export function blobObjectKey(prefix: string, mime: string) {
  const cleanPrefix = prefix.replace(/^\/+|\/+$/g, "");
  return `${cleanPrefix}/${randomUUID()}.${extensionFromMime(mime)}`;
}
