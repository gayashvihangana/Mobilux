import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { put } from "@vercel/blob";

// Serverless hosts cap a request body at ~4.5 MB, so anything larger never
// even reaches this code. Keeping our own limit under that means the user
// gets a real message instead of a platform-level failure.
const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4 MB per file
const MAX_TOTAL_SIZE = 4 * 1024 * 1024; // 4 MB per submission

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "application/pdf": ".pdf",
};

// Anywhere the filesystem is read-only (Vercel and friends), writing to
// public/uploads throws EROFS mid-action and the whole page 500s. Blob
// storage is the only option there, so say so plainly instead of crashing.
const IS_SERVERLESS = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;

const STORAGE_NOT_CONFIGURED =
  "File uploads aren't set up on this deployment yet. Connect a Vercel Blob store and set BLOB_READ_WRITE_TOKEN, then redeploy.";

// Uses Vercel Blob when BLOB_READ_WRITE_TOKEN is set; falls back to local
// public/uploads for development only. Never throws — every failure comes
// back as { error } so the calling form can show it.
export async function saveUploads(
  files: File[],
  subdir: "tickets" | "receipts" | "products" | "avatars" | "branding",
  maxFiles = 4,
): Promise<{ urls?: string[]; error?: string }> {
  const valid = files.filter((f) => f.size > 0);
  if (valid.length === 0) return { urls: [] };
  if (valid.length > maxFiles) {
    return { error: `You can upload at most ${maxFiles} files.` };
  }

  let total = 0;
  for (const file of valid) {
    if (!ALLOWED_TYPES[file.type]) {
      return { error: "Only JPG, PNG, WebP images or PDF files are allowed." };
    }
    if (file.size > MAX_FILE_SIZE) {
      return { error: "Each file must be smaller than 4 MB." };
    }
    total += file.size;
  }
  if (total > MAX_TOTAL_SIZE) {
    return {
      error: "Those files add up to more than 4 MB — try fewer or smaller ones.",
    };
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;

  if (token) {
    try {
      const urls: string[] = [];
      for (const file of valid) {
        const name = `${subdir}/${crypto.randomUUID()}${ALLOWED_TYPES[file.type]}`;
        const blob = await put(name, file, {
          access: "public",
          contentType: file.type,
          token,
        });
        urls.push(blob.url);
      }
      return { urls };
    } catch (e) {
      console.error("Blob upload failed", e);
      return {
        error: "We couldn't store that file just now. Please try again.",
      };
    }
  }

  if (IS_SERVERLESS || process.env.NODE_ENV === "production") {
    console.error(
      "Upload attempted without BLOB_READ_WRITE_TOKEN on a read-only host.",
    );
    return { error: STORAGE_NOT_CONFIGURED };
  }

  try {
    const dir = path.join(process.cwd(), "public", "uploads", subdir);
    await mkdir(dir, { recursive: true });
    const urls: string[] = [];
    for (const file of valid) {
      const name = `${crypto.randomUUID()}${ALLOWED_TYPES[file.type]}`;
      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(path.join(dir, name), buffer);
      urls.push(`/uploads/${subdir}/${name}`);
    }
    return { urls };
  } catch (e) {
    console.error("Local upload failed", e);
    return { error: "We couldn't save that file. Please try again." };
  }
}
