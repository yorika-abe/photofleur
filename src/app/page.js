"use client";

import { useState } from "react";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSendTestMail = async () => {
    try {
      setLoading(true);
      setMessage("");

      const res = await fetch("/api/send-test-mail", { method: "POST" });
      const text = await res.text();

      if (!res.ok) {
        setMessage(`送信失敗: ${text}`);
        return;
      }

      setMessage(`送信成功: ${text}`);
    } catch (error) {
      setMessage(`エラー: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ padding: "40px" }}>
      <h1>テストページ</h1>

      <button
        onClick={handleSendTestMail}
        disabled={loading}
        style={{
          marginTop: "20px",
          padding: "12px",
          background: loading ? "#666" : "#000",
          color: "#fff",
          border: "none",
          borderRadius: "8px",
          width: "240px",
          cursor: loading ? "default" : "pointer",
        }}
      >
        {loading ? "送信中..." : "テストメール送信"}
      </button>

      {message && (
        <p style={{ marginTop: "16px", whiteSpace: "pre-wrap" }}>{message}</p>
      )}
    </main>
  );
}