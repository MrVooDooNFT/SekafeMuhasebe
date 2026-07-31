import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import StokDetay from "./StokDetay";

export default function Stok() {
  const [urunler, setUrunler] = useState([]);
  const [secilenUrun, setSecilenUrun] = useState(null);

  const [urunAdi, setUrunAdi] = useState("");
  const [birim, setBirim] = useState("adet");

  const [yukleniyor, setYukleniyor] = useState(true);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [mesaj, setMesaj] = useState("");
  const [hataVar, setHataVar] = useState(false);

  useEffect(() => {
    urunleriGetir();
  }, []);

  async function urunleriGetir() {
    setYukleniyor(true);
    setMesaj("");
    setHataVar(false);

    const { data, error } = await supabase
      .from("stok_urunleri")
      .select("id, urun_adi, birim, aktif")
      .order("urun_adi", { ascending: true });

    if (error) {
      setMesaj(`Ürünler alınamadı: ${error.message}`);
      setHataVar(true);
      setUrunler([]);
      setYukleniyor(false);
      return;
    }

    setUrunler(data || []);

    setSecilenUrun((oncekiUrun) => {
      if (!oncekiUrun) return null;

      return (
        (data || []).find(
          (urun) => urun.id === oncekiUrun.id
        ) || oncekiUrun
      );
    });

    setYukleniyor(false);
  }

  async function urunEkle(event) {
    event.preventDefault();

    setMesaj("");
    setHataVar(false);

    if (!urunAdi.trim()) {
      setMesaj("Ürün adı zorunludur.");
      setHataVar(true);
      return;
    }

    setKaydediliyor(true);

    const { error } = await supabase
      .from("stok_urunleri")
      .insert([
        {
          urun_adi: urunAdi.trim(),
          birim,
          aktif: true,
        },
      ]);

    if (error) {
      setMesaj(`Ürün eklenemedi: ${error.message}`);
      setHataVar(true);
      setKaydediliyor(false);
      return;
    }

    setUrunAdi("");
    setBirim("adet");
    setKaydediliyor(false);
    setMesaj("Ürün başarıyla eklendi.");

    await urunleriGetir();
  }

  function birimYaz(birimDegeri) {
    const birimler = {
      koli: "Koli",
      karton: "Karton",
      adet: "Adet",
      kg: "Kg",
    };

    return birimler[birimDegeri] || birimDegeri;
  }

  if (secilenUrun) {
    return (
      <StokDetay
        urun={secilenUrun}
        onGeriDon={() => {
          setSecilenUrun(null);
          setMesaj("");
          setHataVar(false);
        }}
        onDegisiklik={urunleriGetir}
      />
    );
  }

  return (
    <div>
      <h1>Stok Takibi</h1>

      <form
        onSubmit={urunEkle}
        style={{
          maxWidth: 500,
          marginBottom: 30,
        }}
      >
        <h2>Ürün Ekle</h2>

        <div style={alanStili}>
          <label
            htmlFor="stok-urun-adi"
            style={etiketStili}
          >
            Ürün Adı
          </label>

          <input
            id="stok-urun-adi"
            type="text"
            value={urunAdi}
            onChange={(event) =>
              setUrunAdi(event.target.value)
            }
            disabled={kaydediliyor}
            required
            style={inputStili}
          />
        </div>

        <div style={alanStili}>
          <label
            htmlFor="stok-birim"
            style={etiketStili}
          >
            Birim
          </label>

          <select
            id="stok-birim"
            value={birim}
            onChange={(event) =>
              setBirim(event.target.value)
            }
            disabled={kaydediliyor}
            style={inputStili}
          >
            <option value="adet">Adet</option>
            <option value="koli">Koli</option>
            <option value="karton">Karton</option>
            <option value="kg">Kg</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={kaydediliyor}
          style={{
            padding: "10px 18px",
            cursor: kaydediliyor
              ? "not-allowed"
              : "pointer",
          }}
        >
          {kaydediliyor
            ? "Ekleniyor..."
            : "Ürün Ekle"}
        </button>
      </form>

      {mesaj && (
        <p
          style={{
            color: hataVar ? "#dc2626" : "#059669",
            fontWeight: 600,
          }}
        >
          {mesaj}
        </p>
      )}

      <h2>Ürün Listesi</h2>

      {yukleniyor ? (
        <p>Ürünler yükleniyor...</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
            }}
          >
            <thead>
              <tr>
                <th style={hucreStili}>Ürün Adı</th>
                <th style={hucreStili}>Birim</th>
                <th style={hucreStili}>Durum</th>
              </tr>
            </thead>

            <tbody>
              {urunler.length === 0 ? (
                <tr>
                  <td
                    style={hucreStili}
                    colSpan="3"
                  >
                    Kayıtlı ürün bulunamadı.
                  </td>
                </tr>
              ) : (
                urunler.map((urun) => (
                  <tr key={urun.id}>
                    <td style={hucreStili}>
                      <button
                        type="button"
                        onClick={() =>
                          setSecilenUrun(urun)
                        }
                        style={{
                          border: "none",
                          background: "none",
                          padding: 0,
                          cursor: "pointer",
                          textDecoration: "underline",
                          font: "inherit",
                        }}
                      >
                        {urun.urun_adi}
                      </button>
                    </td>

                    <td style={hucreStili}>
                      {birimYaz(urun.birim)}
                    </td>

                    <td style={hucreStili}>
                      {urun.aktif ? "Aktif" : "Pasif"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const alanStili = {
  marginBottom: 15,
};

const etiketStili = {
  display: "block",
  marginBottom: 5,
};

const inputStili = {
  width: "100%",
  padding: 10,
  boxSizing: "border-box",
};

const hucreStili = {
  border: "1px solid #d1d5db",
  padding: 10,
  textAlign: "left",
};