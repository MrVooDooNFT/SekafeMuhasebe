import { useState } from "react";
import { supabase } from "../supabase";

export default function GiderDuzenleModal({
  gider,
  onKapat,
  onKaydedildi,
}) {
  const [tarih, setTarih] = useState(gider.tarih || "");
  const [tur, setTur] = useState(gider.tur || "tedarikci_alimi");
  const [toplamTutar, setToplamTutar] = useState(
    String(gider.toplam_tutar || "")
  );
  const [aciklama, setAciklama] = useState(gider.aciklama || "");

  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [mesaj, setMesaj] = useState("");

  async function kaydet(event) {
    event.preventDefault();
    setMesaj("");

    const tutar = Number(toplamTutar);

    if (!tarih) {
      setMesaj("Tarih zorunludur.");
      return;
    }

    if (!tutar || tutar <= 0) {
      setMesaj("Geçerli bir tutar girin.");
      return;
    }

    setKaydediliyor(true);

    const { error } = await supabase
      .from("giderler")
      .update({
        tarih,
        tur,
        toplam_tutar: tutar,
        aciklama: aciklama.trim() || null,
      })
      .eq("id", gider.id);

    if (error) {
      setMesaj(`Gider güncellenemedi: ${error.message}`);
      setKaydediliyor(false);
      return;
    }

    setKaydediliyor(false);
    await onKaydedildi();
  }

  return (
    <div style={arkaPlanStili}>
      <div style={modalStili}>
        <h2>Gider Düzenle</h2>

        <form onSubmit={kaydet}>
          <div style={alanStili}>
            <label htmlFor="gider-tarih">Tarih</label>
            <input
              id="gider-tarih"
              type="date"
              value={tarih}
              onChange={(event) => setTarih(event.target.value)}
              required
            />
          </div>

          <div style={alanStili}>
            <label htmlFor="gider-tur">Gider Türü</label>
            <select
              id="gider-tur"
              value={tur}
              onChange={(event) => setTur(event.target.value)}
            >
              <option value="tedarikci_alimi">
                Tedarikçi Alımı
              </option>

              <option value="personel_maasi">
                Personel Maaşı
              </option>

              <option value="vergi">
                Vergi
              </option>

              <option value="elektrik_su_diger">
                Elektrik, Su ve Diğer
              </option>

              <option value="ekstra_harcamalar">
                Ekstra Harcamalar
              </option>
            </select>
          </div>

          <div style={alanStili}>
            <label htmlFor="gider-tutar">Toplam Tutar</label>
            <input
              id="gider-tutar"
              type="number"
              min="0.01"
              step="0.01"
              value={toplamTutar}
              onChange={(event) =>
                setToplamTutar(event.target.value)
              }
              required
            />
          </div>

          <div style={alanStili}>
            <label htmlFor="gider-aciklama">Açıklama</label>
            <textarea
              id="gider-aciklama"
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