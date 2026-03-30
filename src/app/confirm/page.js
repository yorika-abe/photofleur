"use client";

import { useState } from "react";

export default function ConfirmPage({ searchParams }) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const handleConfirm = async () => {
    try {
      if (!name || !email) {
        alert("名前とメールアドレスを入力してください");
        return;
      }

      setLoading(true);

      // ① DBに保存
      await fetch("/api/booking", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          slot_id: searchParams?.slot_id,
          name,
          email,
        }),
      });

      // ② メール送信
      await fetch("/api/send-test-mail", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    slot_id: searchParams?.slot_id,
    name,
    email,
  }),
});

      // ③ 完了ページへ
      window.location.href = "/complete";
    } catch (e) {
      alert("エラー：" + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "40px", maxWidth: "500px", margin: "0 auto" }}>
      <h1 style={{ marginBottom: "24px" }}>予約確認</h1>

      {/* 名前入力 */}
      <input
        placeholder="お名前"
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={{
          width: "100%",
          padding: "12px",
          marginBottom: "16px",
          borderRadius: "8px",
          border: "1px solid #ccc",
        }}
      />

      {/* メール入力 */}
      <input
        placeholder="メールアドレス"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{
          width: "100%",
          padding: "12px",
          marginBottom: "24px",
          borderRadius: "8px",
          border: "1px solid #ccc",
        }}
      />

      {/* 確定ボタン */}
      <button
        onClick={handleConfirm}
        disabled={loading}
        style={{
          width: "100%",
          padding: "14px",
          background: "#000",
          color: "#fff",
          borderRadius: "8px",
          border: "none",
          fontWeight: "bold",
          cursor: "pointer",
        }}
      >
        {loading ? "処理中..." : "予約を確定する"}
      </button>
    </div>
  );
}