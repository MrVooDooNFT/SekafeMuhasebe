import OdemeForm from "../components/OdemeForm";
import GiderForm from "../components/GiderForm";
import Raporlar from "../components/Raporlar";
import CariForm from "../components/CariForm";
import Kasa from "../components/Kasa";
import Yonetim from "../components/Yonetim";
import { useState } from "react";
import { supabase } from "../supabase";
import GelirForm from "../components/GelirForm";
import logo from "../logo.png";

export default function Dashboard({ kullanici }) {
  const [menu, setMenu] = useState("Dashboard");

  const yonetici = kullanici?.rol === "yonetici";

  async function cikisYap() {
    await supabase.auth.signOut();
    window.location.reload();
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <div
        style={{
          width: 220,
         background: "#475569",
          color: "white",
          padding: 20,
        }}
      >
        <h2>SeKafe</h2>

        <button
          onClick={() => setMenu("Dashboard")}
          style={{
            display: "block",
            width: "100%",
            marginBottom: 10,
          }}
        >
          Dashboard
        </button>

        <button
          onClick={() => setMenu("Gelir")}
          style={{
            display: "block",
            width: "100%",
            marginBottom: 10,
          }}
        >
          Gelir
        </button>

        <button
          onClick={() => setMenu("Gider")}
          style={{
            display: "block",
            width: "100%",
            marginBottom: 10,
          }}
        >
          Gider
        </button>

        <button
          onClick={() => setMenu("Cariler")}
          style={{
            display: "block",
            width: "100%",
            marginBottom: 10,
          }}
        >
          Cariler
        </button>

        <button
          onClick={() => setMenu("Ödemeler")}
          style={{
            display: "block",
            width: "100%",
            marginBottom: 10,
          }}
        >
          Ödemeler
        </button>

        {yonetici && (
          <>
            <button
              onClick={() => setMenu("Kasa")}
              style={{
                display: "block",
                width: "100%",
                marginBottom: 10,
              }}
            >
              Kasa
            </button>

            <button
              onClick={() => setMenu("Raporlar")}
              style={{
                display: "block",
                width: "100%",
                marginBottom: 10,
              }}
            >
              Raporlar
            </button>

            <button
              onClick={() => setMenu("Yönetim")}
              style={{
                display: "block",
                width: "100%",
                marginBottom: 10,
              }}
            >
              Yönetim
            </button>
          </>
        )}

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
        {menu === "Dashboard" && (
  <div style={{ textAlign: "center", marginTop: 30 }}>
    <img
      src={logo}
      alt="Sekafe Muhasebe"
      style={{
        width: 240,
        height: "auto",
        marginBottom: 25,
      }}
    />

<h1
  style={{
    margin: "0 0 20px 0",
    lineHeight: 1.4,
  }}
>
  Sekafe Muhasebe Sistemine Hoş Geldiniz
</h1>

<p
  style={{
    color: "#666",
    fontSize: 17,
    lineHeight: 1.7,
    maxWidth: 650,
    margin: "0 auto 35px",
  }}
>
  Cari hesaplarınızı, gelirlerinizi, giderlerinizi ve ödemelerinizi
  soldaki menüden kolayca yönetebilirsiniz.
</p>

    <p>
      <strong>Kullanıcı:</strong>{" "}
      {kullanici?.ad_soyad || kullanici?.kullanici_adi}
    </p>

    <p>
      <strong>Yetki:</strong>{" "}
      {yonetici ? "Yönetici" : "Personel"}
    </p>
  </div>
)}

        {menu === "Gelir" && <GelirForm />}
        {menu === "Gider" && <GiderForm />}
        {menu === "Cariler" && <CariForm />}
        {menu === "Ödemeler" && <OdemeForm />}

        {yonetici && menu === "Kasa" && <Kasa />}
        {yonetici && menu === "Raporlar" && <Raporlar />}
        {yonetici && menu === "Yönetim" && <Yonetim />}
      </div>
    </div>
  );
}