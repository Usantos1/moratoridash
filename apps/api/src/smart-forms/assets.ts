import { createHash, randomBytes } from "node:crypto";
import { mkdir, writeFile, readFile, access } from "node:fs/promises";
import { join, extname } from "node:path";
import { constants } from "node:fs";

const UPLOAD_DIR = join(process.cwd(), "uploads", "smart-forms");

const MIME_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

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
  // impede path traversal
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "");
  return join(UPLOAD_DIR, safe);
}

export async function readUpload(filename: string) {
  const path = uploadPath(filename);
  await access(path, constants.R_OK);
  return readFile(path);
}

export function publicUploadUrl(filename: string, baseUrl?: string) {
  const base = (baseUrl || "").replace(/\/$/, "");
  return `${base}/api/uploads/${filename}`;
}
