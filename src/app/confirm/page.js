"use client";

import { useState } from "react";

export default function ConfirmPage({ searchParams }) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    try {
      setLoading(true);

      await fetch("/api/booking", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          slot_id: searchParams.slot_id,
          name: "テスト太郎",
          email: "yorikarin1101@icloud.com",
        }),
      });

      await fetch("/api/send-test-mail", {
        method: "POST",
      });

      window.location.href = "/complete";
    } catch (e) {
      alert("エラー：" + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "40px" }}>
      <h1>予約確認</h1>

      <button
        onClick={handleConfirm}
        disabled={loading}
        style={{
          marginTop: "20px",
          padding: "12px",
          background: "#000",
          color: "#fff",
          borderRadius: "8px",
          border: "none",
          cursor: "pointer",
        }}
      >
        {loading ? "処理中..." : "予約を確定する"}
      </button>
    </div>
  );
}