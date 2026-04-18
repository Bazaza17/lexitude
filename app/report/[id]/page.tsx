import { Suspense } from "react";
import PrintableReportContent from "./PrintableReportContent";

export default async function PrintableReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense
      fallback={
        <div style={{ padding: 48, fontFamily: "sans-serif" }}>
          Loading report…
        </div>
      }
    >
      <PrintableReportContent id={id} />
    </Suspense>
  );
}
