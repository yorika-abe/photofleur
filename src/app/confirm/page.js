"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

function ConfirmContent() {
  const searchParams = useSearchParams();

  return (
    <div style={{ padding: "40px" }}>
      確認ページ（仮）
    </div>
  );
}

export default function ConfirmPage() {
  return (
    <Suspense fallback={<div style={{ padding: "40px" }}>読み込み中...</div>}>
      <ConfirmContent />
    </Suspense>
  );
}