"use client";

import { useState } from "react";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [slotId, setSlotId] = useState("");
  const [email, setEmail] = useState("");

  const handleSendTestMail = async () => {
    try {
      setLoading(true);
      setMessage("");

      const res = await fetch("/api/send-test-mail", {
        method: "POST",
      });

      const text = await res.text();

      if (!res.ok) {
        setMessage(`テストメール送信失敗: ${text}`);
        return;
      }

      setMessage(`テストメール送信成功: ${text}`);
    } catch (error) {
      setMessage(`エラー: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSendDayBeforeMail = async () => {
    try {
      if (!slotId || !email) {
        setMessage("slot_id と email を入力してください");
        return;
      }

      setLoading(true);
      setMessage("");

      const res = await fetch("/api/send-day-before-mail", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          slot_id: slotId,
          email,
        }),
      });

      const text = await res.text();

      if (!res.ok) {
        setMessage(`前日メール送信失敗: ${text}`);
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
    <main style={{ padding: "40px", maxWidth: "640px", margin: "0 auto" }}>
      <h1 style={{ marginBottom: "24px" }}>テストページ</h1>

      <div style={{ marginBottom: "32px" }}>
        <button
          onClick={handleSendTestMail}
          disabled={loading}
          style={{
            padding: "12px 20px",
            background: "#000",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "700",
          }}
        >
          {loading ? "送信中..." : "テストメール送信"}
        </button>
      </div>

      <div
        style={{
          border: "1px solid #ddd",
          borderRadius: "12px",
          padding: "20px",
          background: "#fafafa",
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: "16px", fontSize: "20px" }}>
          前日メール送信テスト
        </h2>

        <div style={{ marginBottom: "16px" }}>
          <label
            style={{
              display: "block",
              marginBottom: "8px",
              fontWeight: "700",
            }}
          >
            slot_id
          </label>
          <input
            type="text"
            value={slotId}
            onChange={(e) => setSlotId(e.target.value)}
            placeholder="例: 予約枠のID"
            style={{
              width: "100%",
              padding: "12px",
              border: "1px solid #ccc",
              borderRadius: "8px",
              fontSize: "16px",
            }}
          />
        </div>

        <div style={{ marginBottom: "16px" }}>
          <label
            style={{
              display: "block",
              marginBottom: "8px",
              fontWeight: "700",
            }}
          >
            送信先メールアドレス
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="例: example@mail.com"
            style={{
              width: "100%",
              padding: "12px",
              border: "1px solid #ccc",
              borderRadius: "8px",
              fontSize: "16px",
            }}
          />
        </div>

        <button
          onClick={handleSendDayBeforeMail}
          disabled={loading}
          style={{
            padding: "12px 20px",
            background: "#2f2244",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "700",
          }}
        >
          {loading ? "送信中..." : "前日メール送信"}
        </button>
      </div>

      {message && (
        <p
          style={{
            marginTop: "24px",
            whiteSpace: "pre-wrap",
            lineHeight: 1.8,
          }}
        >
          {message}
        </p>
      )}
    </main>
  );
}