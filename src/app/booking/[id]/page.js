import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default async function BookingPage({ params }) {
  const { id } = await params;

  const { data: model } = await supabase
    .from("models")
    .select("*")
    .eq("id", id)
    .single();

  const { data: entries } = await supabase
    .from("event_entries")
    .select("*")
    .eq("model_id", id);

  let slots = [];

  if (entries && entries.length > 0) {
    const entryIds = entries.map((e) => e.id);

    const { data } = await supabase
      .from("booking_slots")
      .select("*")
      .in("event_entry_id", entryIds)
      .order("start_time", { ascending: true });

    slots = data || [];
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
        <h1 style={{ fontSize: "32px", marginBottom: "24px", color: "#2f2244" }}>
          {model?.name}の予約
        </h1>

        {slots.length === 0 ? (
          <p>予約枠がありません</p>
        ) : (
          <div style={{ display: "grid", gap: "16px" }}>
            {slots.map((slot) => (
              <div
                key={slot.id}
                style={{
                  border: "1px solid #e5e5e5",
                  borderRadius: "12px",
                  padding: "20px",
                  background: "#fafafa",
                }}
              >
                <p style={{ fontSize: "20px", fontWeight: "700", marginBottom: "8px" }}>
                  {slot.slot_label}
                </p>

                <p style={{ marginBottom: "16px" }}>¥{slot.price}</p>

                {slot.is_reserved ? (
                  <div
                    style={{
                      display: "inline-block",
                      background: "#ddd",
                      color: "#666",
                      padding: "10px 20px",
                      borderRadius: "8px",
                      fontWeight: "700",
                    }}
                  >
                    予約済み
                  </div>
                ) : (
                  <Link
                    href={`/confirm?slot_id=${slot.id}`}
                    style={{
                      display: "inline-block",
                      background: "#2f2244",
                      color: "#fff",
                      padding: "10px 20px",
                      borderRadius: "8px",
                      textDecoration: "none",
                      fontWeight: "700",
                    }}
                  >
                    予約する
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: "24px" }}>
          <Link
            href={`/models/${id}`}
            style={{
              display: "inline-block",
              padding: "12px 20px",
              borderRadius: "10px",
              border: "1px solid #2f2244",
              color: "#2f2244",
              textDecoration: "none",
              fontWeight: "700",
            }}
          >
            モデルページへ戻る
          </Link>
        </div>
      </div>
    </main>
  );
}