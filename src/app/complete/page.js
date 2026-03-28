"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

function CompleteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [slotId, setSlotId] = useState(null);
  const [slot, setSlot] = useState(null);
  const [reservation, setReservation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = searchParams.get("slot_id");
    setSlotId(id);
  }, [searchParams]);

  useEffect(() => {
    const fetchData = async () => {
      if (!slotId) return;

      const { data: slotData, error: slotError } = await supabase
        .from("booking_slots")
        .select("*")
        .eq("id", slotId)
        .single();

      if (slotError) {
        alert("予約枠の取得に失敗しました");
        setLoading(false);
        return;
      }

      setSlot(slotData);

      const { data: reservationRows, error: reservationError } = await supabase
        .from("reservations")
        .select("*")
        .eq("booking_slot_id", slotId);

      if (reservationError) {
        alert("予約情報の取得に失敗しました");
        setLoading(false);
        return;
      }

      setReservation(reservationRows?.[0] || null);
      setLoading(false);
    };

    fetchData();
  }, [slotId]);

  if (loading) {
    return <p style={{ padding: "40px" }}>読み込み中...</p>;
  }

  const paymentLabel =
    reservation?.payment_method === "square"
      ? "クレジットカード"
      : reservation?.payment_method === "cash"
      ? "現金"
      : "未取得";

  const lineMessage = `【予約通知】

お名前：${reservation?.customer_name || "未取得"}
予約時間：${slot?.slot_label || "未取得"}
お支払い方法：${paymentLabel}
SNS：
${reservation?.sns_account || "未取得"}

予約番号：
${reservation?.qr_token || "未取得"}`;

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f7f7f7",
        padding: "40px 20px",
      }}
    >
      <div
        style={{
          maxWidth: "720px",
          margin: "0 auto",
          background: "#fff",
          borderRadius: "20px",
          padding: "32px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
        }}
      >
        <h1
          style={{
            fontSize: "32px",
            marginBottom: "16px",
            color: "#2f2244",
          }}
        >
          ご予約ありがとうございます
        </h1>

        <p style={{ marginBottom: "24px", lineHeight: 1.8 }}>
          ご予約内容を受け付けました。<br />
          内容をご確認のうえ、当日お気をつけてお越しください。
        </p>

        <div
          style={{
            border: "1px solid #e5e5e5",
            borderRadius: "12px",
            padding: "20px",
            marginBottom: "24px",
            background: "#fafafa",
          }}
        >
          <p style={{ marginBottom: "10px" }}>
            <strong>予約時間：</strong>
            {slot?.slot_label || "未取得"}
          </p>

          <p style={{ marginBottom: "10px" }}>
            <strong>料金：</strong>
            ¥{slot?.price ?? "-"}
          </p>

          <p style={{ marginBottom: "10px" }}>
            <strong>お名前：</strong>
            {reservation?.customer_name || "未取得"}
          </p>

          <p style={{ marginBottom: "10px" }}>
            <strong>メールアドレス：</strong>
            {reservation?.email || "未取得"}
          </p>

          <p style={{ marginBottom: "10px" }}>
            <strong>SNS：</strong>
            {reservation?.sns_account ? (
              <a
                href={reservation.sns_account}
                target="_blank"
                rel="noreferrer"
                style={{ color: "#2f2244", textDecoration: "underline" }}
              >
                {reservation.sns_account}
              </a>
            ) : (
              "未取得"
            )}
          </p>

          <p style={{ marginBottom: "10px" }}>
            <strong>お支払い方法：</strong>
            {paymentLabel}
          </p>

          <p style={{ marginBottom: "0" }}>
            <strong>予約番号：</strong>
            {reservation?.qr_token || "未取得"}
          </p>
        </div>

        <div
          style={{
            fontSize: "14px",
            color: "#555",
            lineHeight: 1.8,
            marginBottom: "24px",
          }}
        >
          <p>※集合場所などの詳細は、開催日前日までにご案内いたします。</p>
          <p>※ご不明点がある場合は、運営までご連絡ください。</p>
        </div>

        <div
          style={{
            marginBottom: "24px",
            padding: "16px",
            background: "#fafafa",
            border: "1px solid #e5e5e5",
            borderRadius: "12px",
          }}
        >
          <p style={{ fontWeight: "700", marginBottom: "8px" }}>
            LINE送信用メッセージ
          </p>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              fontFamily: "inherit",
              fontSize: "14px",
              lineHeight: 1.7,
              margin: 0,
            }}
          >
            {lineMessage}
          </pre>
        </div>

        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <Link
            href="/models"
            style={{
              display: "inline-block",
              padding: "12px 20px",
              borderRadius: "10px",
              textDecoration: "none",
              background: "#2f2244",
              color: "#fff",
              fontWeight: "700",
            }}
          >
            モデル一覧へ戻る
          </Link>

          <button
            onClick={() => router.push("/")}
            style={{
              padding: "12px 20px",
              borderRadius: "10px",
              border: "1px solid #2f2244",
              background: "#fff",
              color: "#2f2244",
              fontWeight: "700",
              cursor: "pointer",
            }}
          >
            トップへ戻る
          </button>
        </div>
      </div>
    </main>
  );
}

export default function CompletePage() {
  return (
    <Suspense fallback={<div style={{ padding: "40px" }}>読み込み中...</div>}>
      <CompleteContent />
    </Suspense>
  );
}