import { createHash, randomBytes } from "node:crypto";
import { mkdir, writeFile, readFile, access } from "node:fs/promises";
import { join, extname } from "node:path";
import { constants } from "node:fs";

/** Sempre em apps/api/uploads/smart-forms — independente do cwd do PM2. */
const API_ROOT = join(__dirname, "..", "..");
const UPLOAD_DIR = join(API_ROOT, "uploads", "smart-forms");
/** Fallback: uploads salvos quando o cwd era a raiz do monorepo. */
const LEGACY_UPLOAD_DIRS = [
  join(process.cwd(), "uploads", "smart-forms"),
  join(API_ROOT, "..", "..", "uploads", "smart-forms"),
];

const MIME_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

export function safeUploadFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "");
}

export async function ensureUploadDir() {
  await mkdir(UPLOAD_DIR, { recursive: true });
}

export async function saveBase64Image(input: {
  dataUrl: string;
  maxBytes?: number;
}): Promise<{ filename: string; mime: string; bytes: number }> {
  const maxBytes = input.maxBytes ?? 8 * 1024 * 1024;
  const match = /^data:(image\/(?:png|jpe?g|webp|gif));base64,(.+)$/i.exec(
    input.dataUrl.trim()
  );
  if (!match) {
    throw new Error("Envie uma imagem PNG, JPG, WebP ou GIF (data URL)");
  }
  const mime = match[1].toLowerCase().replace("image/jpg", "image/jpeg");
  const buf = Buffer.from(match[2], "base64");
  if (buf.length > maxBytes) {
    throw new Error("Arquivo maior que 8 MB");
  }
  await ensureUploadDir();
  const ext = MIME_EXT[mime] || ".bin";
  const hash = createHash("sha1").update(buf).digest("hex").slice(0, 10);
  const filename = `${Date.now().toString(36)}_${randomBytes(4).toString("hex")}_${hash}${ext}`;
  await writeFile(join(UPLOAD_DIR, filename), buf);
  return { filename, mime, bytes: buf.length };
}

export function uploadPath(filename: string) {
  return join(UPLOAD_DIR, safeUploadFilename(filename));
}

export async function readUpload(filename: string) {
  const safe = safeUploadFilename(filename);
  const candidates = [join(UPLOAD_DIR, safe), ...LEGACY_UPLOAD_DIRS.map((d) => join(d, safe))];
  let lastErr: unknown;
  for (const path of candidates) {
    try {
      await access(path, constants.R_OK);
      return readFile(path);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr ?? new Error("Arquivo não encontrado");
}

/** URL relativa — funciona no admin (proxy Vite) e no app principal. */
export function publicUploadUrl(filename: string, baseUrl?: string) {
  const path = `/api/uploads/${safeUploadFilename(filename)}`;
  const base = (baseUrl || "").replace(/\/$/, "");
  return base ? `${base}${path}` : path;
}

export function absolutizeAssetUrl(url: string | undefined | null, baseUrl: string): string | undefined {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/")) return `${baseUrl.replace(/\/$/, "")}${url}`;
  return url;
}

export function uploadMime(filename: string) {
  const MIME: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
  };
  return MIME[extname(safeUploadFilename(filename)).toLowerCase()] || "application/octet-stream";
}
