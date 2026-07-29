export default function Header({ profil }) {
  return (
    <header
      style={{
        height: 70,
        background: "#ffffff",
        borderBottom: "1px solid #e5e7eb",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "0 25px",
      }}
    >
      <h2>Yönetim Paneli</h2>

      <div style={{ textAlign: "right" }}>
        <div><strong>{profil.ad}</strong></div>
        <div style={{ color: "#666", fontSize: 14 }}>
          {profil.rol}
        </div>
      </div>
    </header>
  );
}