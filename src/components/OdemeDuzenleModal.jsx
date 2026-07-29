import { useState } from "react";
import { supabase } from "../supabase";

export default function OdemeDuzenleModal({
  odeme,
  onKapat,
  onKaydedildi,
}) {
  const [tarih, setTarih] = useState(odeme.tarih || "");
  const [tutar, setTutar] = useState(String(odeme.tutar || ""));
  const [odemeYolu, setOdemeYolu] = useState(
    odeme.odeme_yolu || "nakit"
  );
  const [aciklama, setAciklama] = useState(
    odeme.aciklama || ""
  );

  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [mesaj, setMesaj] = useState("");

  async function kaydet(event) {
    event.preventDefault();
    setMesaj("");

    const sayisalTutar = Number(tutar);

    if (!tarih) {
      setMesaj("Tarih zorunludur.");
      return;
    }

    if (!sayisalTutar || sayisalTutar <= 0) {
      setMesaj("Geçerli bir tutar girin.");
      return;
    }

    setKaydediliyor(true);

    const { error } = await supabase
      .from("gider_odemeleri")
      .update({
        tarih,
        tutar: sayisalTutar,
        odeme_yolu: odemeYolu,
        aciklama: aciklama.trim() || null,
      })
      .eq("id", odeme.id);

    if (error) {
      setMesaj(`Ödeme güncellenemedi: ${error.message}`);
      setKaydediliyor(false);
      return;
    }

    setKaydediliyor(false);
    await onKaydedildi();
  }

  return (
    <div style={arkaPlanStili}>
      <div style={modalStili}>
        <h2>Ödeme Düzenle</h2>

        <form onSubmit={kaydet}>
          <div style={alanStili}>
            <label htmlFor="odeme-tarih">Tarih</label>
            <input
              id="odeme-tarih"
              type="date"
              value={tarih}
              onChange={(event) => setTarih(event.target.value)}
              required
            />
          </div>

          <div style={alanStili}>
            <label htmlFor="odeme-tutar">Tutar</label>
            <input
              id="odeme-tutar"
              type="number"
              min="0.01"
              step="0.01"
              value={tutar}
              onChange={(event) => setTutar(event.target.value)}
              required
            />
          </div>

          <div style={alanStili}>
            <label htmlFor="odeme-yolu">Ödeme Yolu</label>
            <select
              id="odeme-yolu"
              value={odemeYolu}
              onChange={(event) =>
                setOdemeYolu(event.target.value)
              }
            >
              <option value="nakit">Nakit</option>
              <option value="kredi_karti">
                Kredi Kartı
              </option>
              <option value="banka">Banka</option>
              <option value="cek">Çek</option>
            </select>
          </div>

          <div style={alanStili}>
            <label htmlFor="odeme-aciklama">
              Açıklama
            </label>
            <textarea
              id="odeme-aciklama"
              rows="3"
              value={aciklama}
              onChange={(event) =>
                setAciklama(event.target.value)
              }
            />
          </div>

          {mesaj && (
            <p style={{ color: "#dc2626" }}>
              {mesaj}
            </p>
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
  background: "#fff",
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