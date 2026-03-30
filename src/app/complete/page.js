"use client";

import { Suspense, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

function CompleteContent() {
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(null);
  const [slot, setSlot] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (typeof window === "undefined") return;

        const params = new URLSearchParams(window.location.search);
        const slotId = params.get("slot_id");
        const email = params.get("email");

        if (!slotId || !email) {
          setLoading(false);
          return;
        }

        // ① 予約情報取得
        const { data: bookingData, error: bookingError } = await supabase
          .from("bookings")
          .select("*")
          .eq("slot_id", slotId)
          .eq("email", email)
          .order("id", { ascending: false })
          .limit(1)
          .single();

        if (bookingError) {
          console.error("booking取得エラー:", bookingError);
        } else {
          setBooking(bookingData);
        }

        // ② 予約枠取得
        const { data: slotData, error: slotError } = await supabase
          .from("booking_slots")
          .select("*")
          .eq("id", slotId)
          .single();

        if (slotError) {
          console.error("slot取得エラー:", slotError);
        } else {
          setSlot(slotData);
        }
      } catch (error) {
        console.error("complete取得エラー:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div style={{ padding: "40px" }}>読み込み中...</div>;
  }

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
          <p style={{ marginBottom: "12px" }}>
            <strong>お名前：</strong>
            {booking?.name || "未取得"}
          </p>

          <p style={{ marginBottom: "12px" }}>
            <strong>メールアドレス：</strong>
            {booking?.email || "未取得"}
          </p>

          <p style={{ marginBottom: "12px" }}>
            <strong>予約枠：</strong>
            {slot?.slot_label || "未取得"}
          </p>

          <p style={{ marginBottom: "0" }}>
            <strong>料金：</strong>
            ¥{slot?.price ?? "未取得"}
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
          <p>※開催場所や当日の詳細は、開催日前日までにご案内いたします。</p>
          <p>※ご不明点がございましたら、公式LINEよりご連絡ください。</p>
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

          <Link
            href="/"
            style={{
              display: "inline-block",
              padding: "12px 20px",
              borderRadius: "10px",
              textDecoration: "none",
              border: "1px solid #2f2244",
              color: "#2f2244",
              fontWeight: "700",
            }}
          >
            トップへ戻る
          </Link>
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