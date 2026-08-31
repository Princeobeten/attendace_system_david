import { Suspense } from "react";
import ReportsClient from "./ReportsClient";

export default function ReportsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Loading report…</p>}>
      <ReportsClient />
    </Suspense>
  );
}
