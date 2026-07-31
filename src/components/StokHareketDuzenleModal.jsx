import { useState } from "react";
import { supabase } from "../supabase";

export default function StokHareketDuzenleModal({
  hareket,
  urun,
  mevcutStok,
  onKapat,
  onKaydedildi,
}) {
  const [hareketTuru, setHareketTuru] = useState(
    hareket.hareket_turu || "giris"
  );
  const [tarih, setTarih] = useState(hareket.tarih || "");
  const [miktar, setMiktar] = useState(
    String(hareket.miktar || "")
  );
  const [toplamTutar, setToplamTutar] = useState(
    hareket.toplam_tutar === null ||
      hareket.toplam_tutar === undefined
      ? ""
      : String(hareket.toplam_tutar)
  );
  const [aciklama, setAciklama] = useState(
    hareket.aciklama || ""
  );

  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [mesaj, setMesaj] = useState("");

  async function kaydet(event) {
    event.preventDefault();
    setMesaj("");

    const sayisalMiktar = Number(miktar);
    const sayisalToplamTutar =
      toplamTutar === "" ? null : Number(toplamTutar);

    if (!tarih) {
      setMesaj("Tarih zorunludur.");
      return;
    }

    if (!sayisalMiktar || sayisalMiktar <= 0) {
      setMesaj("Geçerli bir miktar giriniz.");
      return;
    }

    if (
      sayisalToplamTutar !== null &&
      (!Number.isFinite(sayisalToplamTutar) ||
        sayisalToplamTutar < 0)
    ) {
      setMesaj("Toplam tutar negatif olamaz.");
      return;
    }

    const eskiStokEtkisi =
      hareket.hareket_turu === "giris"
        ? Number(hareket.miktar || 0)
        : -Number(hareket.miktar || 0);

    const yeniStokEtkisi =
      hareketTuru === "giris"
        ? sayisalMiktar
        : -sayisalMiktar;

    const duzenlemeSonrasiStok =
      mevcutStok - eskiStokEtkisi + yeniStokEtkisi;

    if (duzenlemeSonrasiStok < 0) {
      setMesaj(
        "Bu değişiklik stok miktarını negatif yapacağı için kaydedilemez."
      );
      return;
    }

    setKaydediliyor(true);

    const { error } = await supabase
      .from("stok_hareketleri")
      .update({
        hareket_turu: hareketTuru,
        tarih,
        miktar: sayisalMiktar,
        toplam_tutar: sayisalToplamTutar,
        aciklama: aciklama.trim() || null,
      })
      .eq("id", hareket.id);

    if (error) {
      setMesaj(
        `Stok hareketi güncellenemedi: ${error.message}`
      );
      setKaydediliyor(false);
      return;
    }

    setKaydediliyor(false);
    await onKaydedildi();
  }

  function birimYaz(birim) {
    const birimler = {
      koli: "Koli",
      karton: "Karton",
      adet: "Adet",
      kg: "Kg",
    };

    return birimler[birim] || birim;
  }

  return (
    <div style={arkaPlanStili}>
      <div style={modalStili}>
        <h2>Stok Hareketini Düzenle</h2>

        <p>
          <strong>{urun.urun_adi}</strong> —{" "}
          {birimYaz(urun.birim)}
        </p>

        <form onSubmit={kaydet}>
          <div style={alanStili}>
            <label htmlFor="stok-duzenle-hareket-turu">
              Hareket Türü
            </label>

            <select
              id="stok-duzenle-hareket-turu"
              value={hareketTuru}
              onChange={(event) =>
                setHareketTuru(event.target.value)
              }
              disabled={kaydediliyor}
            >
              <option value="giris">Giriş</option>
              <option value="cikis">Çıkış</option>
            </select>
          </div>

          <div style={alanStili}>
            <label htmlFor="stok-duzenle-tarih">Tarih</label>

            <input
              id="stok-duzenle-tarih"
              type="date"
              value={tarih}
              onChange={(event) =>
                setTarih(event.target.value)
              }
              disabled={kaydediliyor}
              required
            />
          </div>

          <div style={alanStili}>
            <label htmlFor="stok-duzenle-miktar">
              Miktar ({birimYaz(urun.birim)})
            </label>

            <input
              id="stok-duzenle-miktar"
              type="number"
              min="0.001"
              step="0.001"
              value={miktar}
              onChange={(event) =>
                setMiktar(event.target.value)
              }
              disabled={kaydediliyor}
              required
            />
          </div>

          <div style={alanStili}>
            <label htmlFor="stok-duzenle-toplam-tutar">
              Toplam Tutar
            </label>

            <input
              id="stok-duzenle-toplam-tutar"
              type="number"
              min="0"
              step="0.01"
              value={toplamTutar}
              onChange={(event) =>
                setToplamTutar(event.target.value)
              }
              disabled={kaydediliyor}
              placeholder="İsteğe bağlı"
            />
          </div>

          <div style={alanStili}>
            <label htmlFor="stok-duzenle-aciklama">
              Açıklama
            </label>

            <textarea
              id="stok-duzenle-aciklama"
              rows="3"
              value={aciklama}
              onChange={(event) =>
                setAciklama(event.target.value)
              }
              disabled={kaydediliyor}
            />
          </div>

          {mesaj && (
            <p style={{ color: "#dc2626" }}>{mesaj}</p>
          )}

          <div style={butonAlaniStili}>
            <button
              type="button"
              onClick={onKapat}
              disabled={kaydediliyor}
            >
              İptal
            </button>

            <button
              type="submit"
              disabled={kaydediliyor}
            >
              {kaydediliyor
                ? "Kaydediliyor..."
                : "Kaydet"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const arkaPlanStili = {
  position: "fixed",
  inset: 0,
  background: "rgba(0, 0, 0, 0.45)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: 20,
  zIndex: 1000,
};

const modalStili = {
  width: "100%",
  maxWidth: 500,
  background: "#ffffff",
  padding: 24,
  borderRadius: 8,
};

const alanStili = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  marginBottom: 15,
};

const butonAlaniStili = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 10,
  marginTop: 20,
};