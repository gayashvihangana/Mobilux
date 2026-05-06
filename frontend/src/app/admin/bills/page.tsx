import { Suspense } from "react";
import AdminBillsClient from "./BillsClient";

export default function AdminBillsPage() {
  return (
    <Suspense fallback={<div style={{ padding: "2rem" }}>Loading…</div>}>
      <AdminBillsClient />
    </Suspense>
  );
}
