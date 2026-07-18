import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { put } from "@vercel/blob";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "application/pdf": ".pdf",
};

// Uses Vercel Blob in production (BLOB_READ_WRITE_TOKEN set);
// falls back to local public/uploads for development.
export async function saveUploads(
  files: File[],
  subdir: "tickets" | "receipts" | "products",
  maxFiles = 4,
): Promise<{ urls?: string[]; error?: string }> {
  const valid = files.filter((f) => f.size > 0);
  if (valid.length === 0) return { urls: [] };
  if (valid.length > maxFiles) {
    return { error: `You can upload at most ${maxFiles} files.` };
  }

  for (const file of valid) {
    if (!ALLOWED_TYPES[file.type]) {
      return { error: "Only JPG, PNG, WebP images or PDF files are allowed." };
    }
    if (file.size > MAX_FILE_SIZE) {
      return { error: "Each file must be smaller than 5 MB." };
    }
  }

  const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN;
  const urls: string[] = [];

  if (useBlob) {
    for (const file of valid) {
      const name = `${subdir}/${crypto.randomUUID()}${ALLOWED_TYPES[file.type]}`;
      const blob = await put(name, file, {
        access: "public",
        contentType: file.type,
      });
      urls.push(blob.url);
    }
    return { urls };
  }

  const dir = path.join(process.cwd(), "public", "uploads", subdir);
  await mkdir(dir, { recursive: true });
  for (const file of valid) {
    const name = `${crypto.randomUUID()}${ALLOWED_TYPES[file.type]}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(dir, name), buffer);
    urls.push(`/uploads/${subdir}/${name}`);
  }
  return { urls };
}
