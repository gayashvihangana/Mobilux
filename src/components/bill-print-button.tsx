"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function DownloadBillButton({
  ticketId,
  ticketNumber,
}: {
  ticketId: string;
  ticketNumber: string;
}) {
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    setDownloading(true);
    try {
      const res = await fetch(`/bill/${ticketId}/pdf`);
      if (!res.ok) throw new Error("Failed to generate PDF");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Mobilux-${ticketNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Couldn't generate the bill PDF. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Button onClick={handleDownload} size="sm" disabled={downloading}>
      {downloading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Download className="size-4" />
      )}
      {downloading ? "Preparing…" : "Download bill"}
    </Button>
  );
}
