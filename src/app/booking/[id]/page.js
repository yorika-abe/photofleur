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
          background: "#e5e5e5",
          color: "#666",
          padding: "10px 20px",
          borderRadius: "8px",
          fontWeight: "700",
        }}
      >
        予約済み
      </div>
    ) : (
      <a
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
      </a>
    )}
  </div>
))}