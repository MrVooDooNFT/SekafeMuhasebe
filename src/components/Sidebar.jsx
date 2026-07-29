export default function Sidebar({ menu, setMenu, rol }) {
  const items = [
    "Dashboard",
    "Gelir",
    "Gider",
    "Cariler",
    "Kasa",
    "Raporlar",
  ];

  if (rol === "yonetici") {
    items.push("Kullanıcılar");
  }

  return (
    <aside
      style={{
        width: 240,
        background: "#1f2937",
        color: "#fff",
        minHeight: "100vh",
        padding: 20,
        boxSizing: "border-box",
      }}
    >
      <h2>SEKAFE</h2>

      {items.map((item) => (
        <div
          key={item}
          onClick={() => setMenu(item)}
          style={{
            padding: "12px",
            marginTop: 10,
            cursor: "pointer",
            borderRadius: 8,
            background: menu === item ? "#374151" : "transparent",
          }}
        >
          {item}
        </div>
      ))}
    </aside>
  );
}