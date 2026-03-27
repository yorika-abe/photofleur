import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default async function ModelDetailPage({ params }) {
  const { id } = await params;

  const { data: model, error } = await supabase
    .from("models")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !model) {
    return (
      <main style={{ padding: "40px" }}>
        <h1>モデルが見つかりません</h1>
        <Link href="/models">モデル一覧に戻る</Link>
      </main>
    );
  }

  return (
    <main style={{ background: "#f7f7f7", minHeight: "100vh", padding: "40px" }}>
      <div
        style={{
          maxWidth: "1000px",
          margin: "0 auto",
          background: "#fff",
          borderRadius: "24px",
          padding: "32px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "32px",
          }}
        >
          <div>
            {model.image ? (
              <img
                src={model.image}
                alt={model.name}
                style={{
                  width: "100%",
                  aspectRatio: "3 / 4",
                  objectFit: "cover",
                  borderRadius: "20px",
                }}
              />
            ) : null}
          </div>

          <div>
            <h1 style={{ fontSize: "40px", color: "#2f2244", marginBottom: "8px" }}>
              {model.name}
            </h1>

            <p style={{ fontSize: "18px", color: "#666", marginBottom: "24px" }}>
              {model.name_en}
            </p>

            <p style={{ marginBottom: "16px", lineHeight: 1.8 }}>
              {model.bio}
            </p>

            <p>身長：{model.height}cm</p>
            <p>靴サイズ：{model.shoe_size}</p>
            <p>誕生日：{model.birthday}</p>
            <p>ストリート料金：¥{model.street_price} / {model.duration_street}</p>
            <p>スタジオ料金：¥{model.studio_price} / {model.duration_studio} + studio fee</p>

            {model.sns ? (
              <p style={{ marginTop: "16px" }}>
                <a href={model.sns} target="_blank" rel="noreferrer">
                  Xを見る
                </a>
              </p>
            ) : null}

            <div style={{ marginTop: "32px", display: "flex", gap: "16px" }}>
              <Link
                href={`/booking/${model.id}`}
                style={{
                  display: "inline-block",
                  padding: "14px 24px",
                  background: "#2f2244",
                  color: "#fff",
                  borderRadius: "12px",
                  textDecoration: "none",
                  fontWeight: "700",
                }}
              >
                予約する
              </Link>

              <Link
                href="/models"
                style={{
                  display: "inline-block",
                  padding: "14px 24px",
                  border: "1px solid #2f2244",
                  color: "#2f2244",
                  borderRadius: "12px",
                  textDecoration: "none",
                  fontWeight: "700",
                }}
              >
                モデル一覧へ戻る
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}