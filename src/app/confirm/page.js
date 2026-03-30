"use client";

import { useEffect, useState } from "react";

export default function ConfirmPage() {
  const [loading, setLoading] = useState(false);
  const [slotId, setSlotId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      setSlotId(params.get("slot_id") || "");
    }
  }, []);

  const handleConfirm = async () => {
    try {
      if (!slotId) {
        alert("予約枠情報が取得できていません。もう一度お試しください。");
        return;
      }

      if (!name || !email) {
        alert("お名前とメールアドレスを入力してください。");
        return;
      }

      setLoading(true);

      const bookingRes = await fetch("/api/booking", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          slot_id: slotId,
          name,
          email,
        }),
      });

      if (!bookingRes.ok) {
        const text = await bookingRes.text();
        throw new Error(`予約保存に失敗しました: ${text}`);
      }

      const mailRes = await fetch("/api/send-booking-mail", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          slot_id: slotId,
          customerName: name,
          email,
        }),
      });

      if (!mailRes.ok) {
        const text = await mailRes.text();
        throw new Error(`メール送信に失敗しました: ${text}`);
      }

      window.location.href = `/complete?slot_id=${slotId}&email=${encodeURIComponent(email)}`;
    } catch (e) {
      alert("エラー：" + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "40px", maxWidth: "560px", margin: "0 auto" }}>
      <h1 style={{ marginBottom: "24px", fontSize: "32px" }}>予約確認</h1>

      <div style={{ marginBottom: "16px" }}>
        <label
          style={{
            display: "block",
            marginBottom: "8px",
            fontWeight: "700",
          }}
        >
          お名前
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例：阿部依花"
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: "8px",
            border: "1px solid #ccc",
            fontSize: "16px",
          }}
        />
      </div>

      <div style={{ marginBottom: "24px" }}>
        <label
          style={{
            display: "block",
            marginBottom: "8px",
            fontWeight: "700",
          }}
        >
          メールアドレス
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="例：example@mail.com"
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: "8px",
            border: "1px solid #ccc",
            fontSize: "16px",
          }}
        />
      </div>

      <button
        onClick={handleConfirm}
        disabled={loading}
        style={{
          width: "100%",
          marginTop: "8px",
          padding: "14px",
          background: "#000",
          color: "#fff",
          borderRadius: "8px",
          border: "none",
          cursor: "pointer",
          fontWeight: "700",
          fontSize: "16px",
        }}
      >
        {loading ? "処理中..." : "予約を確定する"}
      </button>
    </div>
  );
}