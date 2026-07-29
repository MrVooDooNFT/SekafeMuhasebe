import OdemeForm from "../components/OdemeForm";
import GiderForm from "../components/GiderForm";
import Raporlar from "../components/Raporlar";
import CariForm from "../components/CariForm";
import Kasa from "../components/Kasa";
import { useState } from "react";
import { supabase } from "../supabase";
import GelirForm from "../components/GelirForm";

export default function Dashboard() {
  const [menu, setMenu] = useState("Dashboard");

  async function cikisYap() {
    await supabase.auth.signOut();
    window.location.reload();
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <div
        style={{
          width: 220,
          background: "#1f2937",
          color: "white",
          padding: 20,
        }}
      >
        <h2>SeKafe</h2>

        <button
          onClick={() => setMenu("Dashboard")}
          style={{ display: "block", width: "100%", marginBottom: 10 }}
        >
          Dashboard
        </button>

        <button
          onClick={() => setMenu("Gelir")}
          style={{ display: "block", width: "100%", marginBottom: 10 }}
        >
          Gelir
        </button>

        <button
          onClick={() => setMenu("Gider")}
          style={{ display: "block", width: "100%", marginBottom: 10 }}
        >
          Gider
        </button>

        <button
          onClick={() => setMenu("Cariler")}
          style={{ display: "block", width: "100%", marginBottom: 10 }}
        >
          Cariler
        </button>
        
        <button
        onClick={() => setMenu("Ödemeler")}
        style={{ display: "block", width: "100%", marginBottom: 10 }}
        >
          Ödemeler
        </button>

        <button
          onClick={() => setMenu("Kasa")}
          style={{ display: "block", width: "100%", marginBottom: 10 }}
        >
          Kasa
        </button>

        <button
          onClick={() => setMenu("Raporlar")}
          style={{ display: "block", width: "100%", marginBottom: 10 }}
        >
          Raporlar
        </button>

        <button
          onClick={cikisYap}
          style={{
            display: "block",
            width: "100%",
            marginTop: 30,
          }}
        >
          Çıkış Yap
        </button>
      </div>

      <div style={{ flex: 1, padding: 30 }}>
        {menu === "Dashboard" && <h1>Dashboard</h1>}
        {menu === "Gelir" && <GelirForm />}
        {menu === "Gider" && <GiderForm />}
        {menu === "Cariler" && <CariForm />}
        {menu === "Ödemeler" && <OdemeForm />}
        {menu === "Kasa" && <Kasa />}
        {menu === "Raporlar" && <Raporlar />}
      </div>
    </div>
  );
}