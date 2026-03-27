"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const inputStyle = {
  width: "100%",
  padding: "12px",
  marginBottom: "16px",
  borderRadius: "8px",
  border: "1px solid #ddd",
};

export default function ConfirmPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [slotId, setSlotId] = useState(null);
  const [slot, setSlot] = useState(null);
  const [model, setModel] = useState(null);
  const [event, setEvent] = useState(null);

  const [customerName, setCustomerName] = useState("");
  const [customerNameKana, setCustomerNameKana] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [snsAccount, setSnsAccount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("square");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const id = searchParams.get("slot_id");
    setSlotId(id);
  }, [searchParams]);

  useEffect(() => {
    const fetchSlot = async () => {
      if (!slotId) return;

      // 1. booking_slots
      const { data: slotData, error: slotError } = await supabase
        .from("booking_slots")
        .select("*")
        .eq("id", slotId)
        .single();

      if (slotError) {
        console.error("slot取得エラー", slotError);
        return;
      }

      setSlot(slotData);

      // 2. event_entries
      const { data: entryData, error: entryError } = await supabase
        .from("event_entries")
        .select("*")
        .eq("id", slotData.event_entry_id)
        .single();

      if (entryError) {
        console.error("event_entries取得エラー", entryError);
        return;
      }

      // 3. models
      const { data: modelData, error: modelError } = await supabase
        .from("models")
        .select("*")
        .eq("id", entryData.model_id)
        .single();

      if (modelError) {
        console.error("models取得エラー", modelError);
      } else {
        setModel(modelData);
      }

      // 4. events
      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .select("*")
        .eq("id", entryData.event_id)
        .single();

      if (eventError) {
        console.error("events取得エラー", eventError);
      } else {
        setEvent(eventData);
      }
    };

    fetchSlot();
  }, [slotId]);

  const isValidSnsUrl = (value) => {
    const text = value.trim();
    return text.includes("x.com/") || text.includes("instagram.com/");
  };

  const handleSubmit = async () => {
    if (!slotId) {
      alert("予約枠情報が見つかりません。");
      return;
    }

    if (!customerName.trim()) {
      alert("お名前を入力してください。");
      return;
    }

    if (!email.trim()) {
      alert("メールアドレスを入力してください。");
      return;
    }

    if (!snsAccount.trim()) {
      alert("XまたはInstagramのURLを入力してください。");
      return;
    }

    if (!isValidSnsUrl(snsAccount)) {
      alert("XまたはInstagramのURL形式で入力してください。");
      return;
    }

    setLoading(true);

    const qrToken = crypto.randomUUID();

    const { error: reservationError } = await supabase
      .from("reservations")
      .insert([
        {
          booking_slot_id: slotId,
          customer_name: customerName,
          customer_name_kana: customerNameKana,
          address: address,
          email: email,
          phone: phone,
          sns_account: snsAccount,
          payment_method: paymentMethod,
          payment_status: "pending",
          reservation_status: "confirmed",
          qr_token: qrToken,
        },
      ]);

    if (reservationError) {
      console.error("reservation保存エラー", reservationError);
      alert("予約保存に失敗しました。");
      setLoading(false);
      return;
    }

    const { error: slotUpdateError } = await supabase
      .from("booking_slots")
      .update({ is_reserved: true })
      .eq("id", slotId);

    if (slotUpdateError) {
      console.error("slot更新エラー", slotUpdateError);
      alert("予約枠の更新に失敗しました。");
      setLoading(false);
      return;
    }

    // 予約完了メール送信
    await fetch("/api/send-booking-mail", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    customerName,
    modelName: model?.name || "未取得",
    modelImage: model?.image ? `${model.image}&w=800` : "",
    eventDate: event?.event_date || "未取得",
    eventType: event?.event_type || "studio",
    locationName: event?.location_name || "",
    address: event?.address || "",
    meetingPlace: event?.meeting_place || "",
    mapUrl: event?.map_url || event?.map_address || "",
    slotTime: slot?.slot_label || "未取得",
    paymentMethod,
    reservationId: qrToken,
    qrToken,
    customMessage: event?.custom_message || "",
    termsUrl: event?.terms_url || "https://photofleur.com",
  }),
});

    router.push(`/complete?slot_id=${slotId}`);
  };

  if (!slot) {
    return <p style={{ padding: "40px" }}>予約枠を読み込み中...</p>;
  }

  return (
    <main style={{ padding: "40px", maxWidth: "720px", margin: "0 auto" }}>
      <h1 style={{ marginBottom: "24px" }}>予約確認</h1>

      <div
        style={{
          padding: "16px",
          border: "1px solid #ddd",
          borderRadius: "12px",
          marginBottom: "24px",
        }}
      >
        <p>モデル：{model?.name || "読み込み中..."}</p>
        <p>時間：{slot.slot_label}</p>
        <p>料金：¥{slot.price}</p>
      </div>

      <input
        placeholder="お名前 ※必須"
        value={customerName}
        onChange={(e) => setCustomerName(e.target.value)}
        style={inputStyle}
      />

      <input
        placeholder="おなまえ（かな）"
        value={customerNameKana}
        onChange={(e) => setCustomerNameKana(e.target.value)}
        style={inputStyle}
      />

      <input
        placeholder="メールアドレス ※必須"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={inputStyle}
      />

      <input
        placeholder="電話番号"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        style={inputStyle}
      />

      <input
        placeholder="住所"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        style={inputStyle}
      />

      <div style={{ marginBottom: "20px" }}>
        <input
          placeholder="X（Instagram）URL ※どちらか必須"
          value={snsAccount}
          onChange={(e) => setSnsAccount(e.target.value)}
          style={{ ...inputStyle, marginBottom: "8px" }}
        />
        <p style={{ fontSize: "13px", color: "#666", marginTop: "8px" }}>
          XのURLを優先でご入力ください。Xがない場合はInstagramのURLをご入力ください。
        </p>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <label style={{ display: "block", marginBottom: "8px" }}>
          お支払い方法
        </label>

        <select
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          style={inputStyle}
        >
          <option value="square">クレジットカード</option>
          <option value="cash">現金</option>
        </select>

        <p style={{ fontSize: "13px", color: "#666", marginTop: "8px" }}>
          当日の受付をスムーズにするため、可能な限りクレジットカードでのお支払いにご協力ください。
        </p>
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading}
        style={{
          width: "100%",
          padding: "16px",
          background: "#2f2244",
          color: "#fff",
          border: "none",
          borderRadius: "10px",
          fontSize: "16px",
          cursor: "pointer",
        }}
      >
        {loading ? "送信中..." : "予約する"}
      </button>
    </main>
  );
}