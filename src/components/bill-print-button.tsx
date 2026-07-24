"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

// Print-to-PDF: opens the browser's print dialog on the exact bill on screen,
// so "Save as PDF" produces a file that's pixel-identical to the web bill.
// No separate PDF renderer to drift out of sync.
export function DownloadBillButton() {
  return (
    <Button onClick={() => window.print()} size="sm">
      <Printer className="size-4" /> Download / Print
    </Button>
  );
}

// When the bill is opened with ?print=1 (e.g. the admin's "Download" button),
// fire the print dialog automatically once the page has painted.
export function AutoPrint() {
  const params = useSearchParams();
  const shouldPrint = params.get("print") === "1";

  useEffect(() => {
    if (!shouldPrint) return;
    const t = setTimeout(() => window.print(), 400);
    return () => clearTimeout(t);
  }, [shouldPrint]);

  return null;
}
