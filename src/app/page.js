"use client";

import { useState } from "react";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // テストメール
  const handleSendTestMail = async () => {
    try {
      setLoading(true);
      setMessage("");

      const res = await fetch("/api/send-test-mail", {
        method: "POST",
      });

      const text = await res.text();

      if (!res.ok) {
        setMessage(`送信失敗: ${text}`);
        return;
      }

      setMessage(`テストメール送信成功: ${text}`);
    } catch (error) {
      setMessage(`エラー: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 前日メール
  const handleSendDayBeforeMail = async () => {
    try {
      setLoading(true);
      setMessage("");

      const res = await fetch("/api/send-day-before-mail", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          slot_id: "ここにslot_id",
          email: "ここに送信先メール",
        }),
      });

      const text = await res.text();

      if (!res.ok) {
        setMessage(`送信失敗: ${text}`);
        return;
      }

      setMessage(`前日メール送信成功: ${text}`);
    } catch (error) {
      setMessage(`エラー: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ padding: "40px" }}>
      <h1>テストページ</h1>

      {/* テストメール */}
      <button
        onClick={handleSendTestMail}
        disabled={loading}
        style={{
          marginTop: "20px",
          padding: "12px",
          background: "#000",
          color: "#fff",
          borderRadius: "8px",
          width: "240px",
        }}
      >
        テストメール送信
      </button>

      {/* 前日メール */}
      <button
        onClick={handleSendDayBeforeMail}
        disabled={loading}
        style={{
          marginTop: "20px",
          padding: "12px",
          background: "#2f2244",
          color: "#fff",
          borderRadius: "8px",
          width: "240px",
          display: "block",
        }}
      >
        前日メール送信
      </button>

      {message && (
        <p style={{ marginTop: "16px", whiteSpace: "pre-wrap" }}>
          {message}
        </p>
      )}
    </main>
  );
}