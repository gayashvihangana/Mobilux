"use client";

import { useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Keep well under the ~4.5 MB serverless request-body cap — a body that's too
// big is rejected by the platform before any of our code runs, which is
// impossible to explain to the user from the server side.
const MAX_BYTES = 4 * 1024 * 1024;
const MAX_TOTAL_BYTES = 4 * 1024 * 1024;
const MAX_EDGE = 1600; // px on the long side after downscaling
const QUALITY = 0.82;

const isImage = (file: File) =>
  file.type === "image/jpeg" ||
  file.type === "image/png" ||
  file.type === "image/webp";

// Phone cameras produce 4–10 MB photos, far past what a server action can
// accept. Re-encoding in the browser keeps the upload well inside the limit
// and costs nothing in perceived quality at the sizes we display.
async function downscale(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  // Already small enough in both dimensions and bytes — leave it alone.
  if (scale === 1 && file.size <= MAX_BYTES) {
    bitmap.close();
    return file;
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", QUALITY),
  );
  if (!blob || blob.size >= file.size) return file;

  const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
  return new File([blob], name, { type: "image/jpeg", lastModified: Date.now() });
}

/**
 * File input that shrinks images and refuses anything still too large, so the
 * upload can't fail as an opaque server error after the user has waited.
 */
export function FileInput({
  className,
  onFilesChanged,
  ...props
}: React.ComponentProps<typeof Input> & {
  onFilesChanged?: (files: File[]) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    if (picked.length === 0) {
      setError(null);
      onFilesChanged?.([]);
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const processed: File[] = [];
      for (const file of picked) {
        processed.push(isImage(file) ? await downscale(file) : file);
      }

      const tooBig = processed.find((f) => f.size > MAX_BYTES);
      const total = processed.reduce((sum, f) => sum + f.size, 0);
      if (tooBig) {
        setError(
          `“${tooBig.name}” is still over 4 MB after compressing — please pick a smaller file.`,
        );
        if (ref.current) ref.current.value = "";
        onFilesChanged?.([]);
        return;
      }
      if (total > MAX_TOTAL_BYTES) {
        setError(
          "Those files add up to more than 4 MB — please pick fewer or smaller ones.",
        );
        if (ref.current) ref.current.value = "";
        onFilesChanged?.([]);
        return;
      }

      // Swap the compressed versions back into the input so the plain form
      // submit carries them — no extra wiring needed in each form.
      if (ref.current && processed.some((f, i) => f !== picked[i])) {
        const data = new DataTransfer();
        for (const file of processed) data.items.add(file);
        ref.current.files = data.files;
      }
      onFilesChanged?.(processed);
    } catch {
      // Compression is best-effort: an unreadable/odd image just goes as-is
      // and the server-side size check remains the backstop.
      setError(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="relative">
        <Input
          {...props}
          ref={ref}
          type="file"
          onChange={handleChange}
          className={cn(busy && "opacity-70", className)}
        />
        {busy ? (
          <Loader2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        ) : null}
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </>
  );
}
