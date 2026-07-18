import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "application/pdf": ".pdf",
};

// Dev-only local storage under public/uploads.
// Swapped for Cloudinary/S3 before cloud deployment.
export async function saveUploads(
  files: File[],
  subdir: "tickets" | "receipts",
  maxFiles = 4,
): Promise<{ urls?: string[]; error?: string }> {
  const valid = files.filter((f) => f.size > 0);
  if (valid.length === 0) return { urls: [] };
  if (valid.length > maxFiles) {
    return { error: `You can upload at most ${maxFiles} files.` };
  }

  const dir = path.join(process.cwd(), "public", "uploads", subdir);
  await mkdir(dir, { recursive: true });

  const urls: string[] = [];
  for (const file of valid) {
    const ext = ALLOWED_TYPES[file.type];
    if (!ext) {
      return { error: "Only JPG, PNG, WebP images or PDF files are allowed." };
    }
    if (file.size > MAX_FILE_SIZE) {
      return { error: "Each file must be smaller than 5 MB." };
    }
    const name = `${crypto.randomUUID()}${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(dir, name), buffer);
    urls.push(`/uploads/${subdir}/${name}`);
  }
  return { urls };
}
