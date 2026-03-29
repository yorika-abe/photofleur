"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

function CompleteContent() {
  const searchParams = useSearchParams();

  return (
    <div style={{ padding: "40px" }}>
      完了ページ（仮2）
    </div>
  );
}

export default function CompletePage() {
  return (
    <Suspense fallback={<div style={{ padding: "40px" }}>読み込み中...</div>}>
      <CompleteContent />
    </Suspense>
  );
}