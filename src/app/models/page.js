import Link from "next/link";
import { supabase } from "../../lib/supabase";

export default async function ModelsPage() {
  const { data: models, error } = await supabase
    .from("models")
    .select("*");

  if (error) {
    return (
      <main style={{ padding: "40px" }}>
        <h1>モデル一覧</h1>
        <p>データの取得でエラーが起きました。</p>
        <pre style={{ whiteSpace: "pre-wrap", marginTop: "16px" }}>
          {error.message}
        </pre>
      </main>
    );
  }

  return (
    <main style={{ padding: "40px", background: "#f7f7f7", minHeight: "100vh" }}>
      <h1 style={{ fontSize: "32px", marginBottom: "24px", color: "#2f2244" }}>
        モデル一覧
      </h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: "24px",
        }}
      >
        {models?.map((model) => (
          <Link
            key={model.id}
            href={`/models/${model.id}`}
            style={{
              display: "block",
              background: "#fff",
              borderRadius: "16px",
              overflow: "hidden",
              textDecoration: "none",
              color: "#2f2244",
              boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
            }}
          >
            <div style={{ aspectRatio: "3 / 4", background: "#eee" }}>
              {model.image ? (
                <img
                  src={model.image}
                  alt={model.name || "model"}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : null}
            </div>

            <div style={{ padding: "16px" }}>
              <h2 style={{ fontSize: "20px", marginBottom: "8px" }}>
                {model.name || "名前なし"}
              </h2>
              <p style={{ color: "#666", margin: 0 }}>
                {model.name_en || ""}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}