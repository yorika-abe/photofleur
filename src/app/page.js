"use client";

export default function Home() {
  return (
    <main style={{ padding: "40px" }}>
      <h1>テストページ</h1>

      <button
        onClick={async () => {
          const res = await fetch("/api/send-test-mail", { method: "POST" });
          const data = await res.json();
          alert(JSON.stringify(data));
        }}
        style={{
          marginTop: "20px",
          padding: "12px",
          background: "#000",
          color: "#fff",
          border: "none",
          borderRadius: "8px",
          width: "240px",
          cursor: "pointer",
        }}
      >
        テストメール送信
      </button>
    </main>
  );
}
