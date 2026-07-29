import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase";
import GiderDuzenleModal from "./GiderDuzenleModal";
import OdemeDuzenleModal from "./OdemeDuzenleModal";

export default function CariDetay({
  cari,
  onGeriDon,
  onDegisiklik,
}) {
  const [hareketler, setHareketler] = useState([]);
  const [baslangicTarihi, setBaslangicTarihi] = useState("");
  const [bitisTarihi, setBitisTarihi] = useState("");

  const [duzenlenenGider, setDuzenlenenGider] = useState(null);
  const [duzenlenenOdeme, setDuzenlenenOdeme] = useState(null);

  const [cariDuzenleniyor, setCariDuzenleniyor] = useState(false);
  const [cariKaydediliyor, setCariKaydediliyor] = useState(false);

  const [cariForm, setCariForm] = useState({
    cari_adi: cari.cari_adi || "",
    telefon: cari.telefon || "",
    notlar: cari.notlar || "",
  });

  const [yukleniyor, setYukleniyor] = useState(false);
  const [mesaj, setMesaj] = useState("");
  const [hataVar, setHataVar] = useState(false);

  useEffect(() => {
    hareketleriGetir();
  }, [cari.id]);

  useEffect(() => {
    setCariForm({
      cari_adi: cari.cari_adi || "",
      telefon: cari.telefon || "",
      notlar: cari.notlar || "",
    });
  }, [cari.cari_adi, cari.telefon, cari.notlar]);

  async function hareketleriGetir() {
    setYukleniyor(true);
    setMesaj("");
    setHataVar(false);

    const { data: giderData, error: giderError } = await supabase
      .from("giderler")
      .select(
        "id, tarih, tur, toplam_tutar, odenen_tutar, odeme_durumu, aciklama"
      )
      .eq("cari_id", cari.id)
      .eq("aktif", true);

    if (giderError) {
      setMesaj(`Giderler alınamadı: ${giderError.message}`);
      setHataVar(true);
      setYukleniyor(false);
      return;
    }

    const { data: odemeData, error: odemeError } = await supabase
      .from("gider_odemeleri")
      .select("id, tarih, tutar, odeme_yolu, aciklama")
      .eq("cari_id", cari.id);

    if (odemeError) {
      setMesaj(`Ödemeler alınamadı: ${odemeError.message}`);
      setHataVar(true);
      setYukleniyor(false);
      return;
    }

    const giderHareketleri = (giderData || []).map((gider) => ({
      id: `gider-${gider.id}`,
      kayitId: gider.id,
      tarih: gider.tarih,
      tip: "Gider",
      aciklama: gider.aciklama || giderTuruYaz(gider.tur),
      borc: Number(gider.toplam_tutar || 0),
      odeme: 0,
      hamKayit: gider,
    }));

    const odemeHareketleri = (odemeData || []).map((odeme) => ({
      id: `odeme-${odeme.id}`,
      kayitId: odeme.id,
      tarih: odeme.tarih,
      tip: "Ödeme",
      aciklama: odeme.aciklama || odemeYoluYaz(odeme.odeme_yolu),
      borc: 0,
      odeme: Number(odeme.tutar || 0),
      hamKayit: odeme,
    }));

    const birlesikHareketler = [
      ...giderHareketleri,
      ...odemeHareketleri,
    ].sort((a, b) => {
      if (a.tarih === b.tarih) {
        return a.tip === "Gider" ? -1 : 1;
      }

      return a.tarih.localeCompare(b.tarih);
    });

    let bakiye = 0;

    const bakiyeliHareketler = birlesikHareketler.map((hareket) => {
      bakiye += hareket.borc;
      bakiye -= hareket.odeme;

      return {
        ...hareket,
        bakiye,
      };
    });

    setHareketler(bakiyeliHareketler);
    setYukleniyor(false);
  }

  async function cariBilgileriniKaydet(event) {
    event.preventDefault();

    setMesaj("");
    setHataVar(false);

    if (!cariForm.cari_adi.trim()) {
      setMesaj("Cari adı zorunludur.");
      setHataVar(true);
      return;
    }

    setCariKaydediliyor(true);

    const { error } = await supabase
      .from("cariler")
      .update({
        cari_adi: cariForm.cari_adi.trim(),
        telefon: cariForm.telefon.trim() || null,
        notlar: cariForm.notlar.trim() || null,
      })
      .eq("id", cari.id);

    if (error) {
      setMesaj(`Cari güncellenemedi: ${error.message}`);
      setHataVar(true);
      setCariKaydediliyor(false);
      return;
    }

    if (onDegisiklik) {
      await onDegisiklik();
    }

    setCariDuzenleniyor(false);
    setCariKaydediliyor(false);
    setMesaj("Cari bilgileri güncellendi.");
  }

  function cariDuzenlemeyiIptalEt() {
    setCariForm({
      cari_adi: cari.cari_adi || "",
      telefon: cari.telefon || "",
      notlar: cari.notlar || "",
    });

    setCariDuzenleniyor(false);
    setMesaj("");
    setHataVar(false);
  }

  async function hareketSil(hareket) {
    const onay = window.confirm(
      `${hareket.tip} kaydını silmek istediğinize emin misiniz?`
    );

    if (!onay) return;

    setMesaj("");
    setHataVar(false);

    const tablo =
      hareket.tip === "Gider"
        ? "giderler"
        : "gider_odemeleri";

    const { error } = await supabase
      .from(tablo)
      .delete()
      .eq("id", hareket.kayitId);

    if (error) {
      setMesaj(`Kayıt silinemedi: ${error.message}`);
      setHataVar(true);
      return;
    }

    setMesaj(`${hareket.tip} kaydı silindi.`);
    await hareketleriYenile();
  }

  async function hareketleriYenile() {
    await hareketleriGetir();

    if (onDegisiklik) {
      await onDegisiklik();
    }
  }

  function duzenle(hareket) {
    if (hareket.tip === "Gider") {
      setDuzenlenenGider(hareket.hamKayit);
    } else {
      setDuzenlenenOdeme(hareket.hamKayit);
    }
  }

  function filtreyiTemizle() {
    setBaslangicTarihi("");
    setBitisTarihi("");
  }

  const filtreliHareketler = useMemo(() => {
    return hareketler.filter((hareket) => {
      if (
        baslangicTarihi &&
        hareket.tarih < baslangicTarihi
      ) {
        return false;
      }

      if (bitisTarihi && hareket.tarih > bitisTarihi) {
        return false;
      }

      return true;
    });
  }, [hareketler, baslangicTarihi, bitisTarihi]);

  const filtreliToplamBorc = filtreliHareketler.reduce(
    (toplam, hareket) => toplam + hareket.borc,
    0
  );

  const filtreliToplamOdeme = filtreliHareketler.reduce(
    (toplam, hareket) => toplam + hareket.odeme,
    0
  );

  const filtreliKalan =
    filtreliToplamBorc - filtreliToplamOdeme;

  function paraFormatla(tutar) {
    return Number(tutar || 0).toLocaleString("tr-TR", {
      style: "currency",
      currency: "TRY",
    });
  }

  function tarihFormatla(tarih) {
    if (!tarih) return "-";

    return new Date(
      `${tarih}T00:00:00`
    ).toLocaleDateString("tr-TR");
  }

  function giderTuruYaz(tur) {
    const turler = {
      tedarikci_alimi: "Tedarikçi Alımı",
      personel_maasi: "Personel Maaşı",
      vergi: "Vergi",
      elektrik_su_diger: "Elektrik, Su ve Diğer",
      ekstra_harcamalar: "Ekstra Harcamalar",
    };

    return turler[tur] || tur;
  }

  function odemeYoluYaz(odemeYolu) {
    const yollar = {
      nakit: "Nakit",
      kredi_karti: "Kredi Kartı",
      banka: "Banka",
      cek: "Çek",
    };

    return yollar[odemeYolu] || odemeYolu;
  }

  return (
    <div>
      <button type="button" onClick={onGeriDon}>
        ← Cari Listesine Dön
      </button>

      {cariDuzenleniyor ? (
        <form
          onSubmit={cariBilgileriniKaydet}
          style={{
            maxWidth: 500,
            marginTop: 20,
            marginBottom: 25,
          }}
        >
          <h2>Cari Bilgilerini Düzenle</h2>

          <div style={alanStili}>
            <label htmlFor="cari-detay-adi">Cari Adı</label>

            <input
              id="cari-detay-adi"
              type="text"
              value={cariForm.cari_adi}
              onChange={(event) =>
                setCariForm((onceki) => ({
                  ...onceki,
                  cari_adi: event.target.value,
                }))
              }
              required
            />
          </div>

          <div style={alanStili}>
            <label htmlFor="cari-detay-telefon">Telefon</label>

            <input
              id="cari-detay-telefon"
              type="text"
              value={cariForm.telefon}
              onChange={(event) =>
                setCariForm((onceki) => ({
                  ...onceki,
                  telefon: event.target.value,
                }))
              }
            />
          </div>

          <div style={alanStili}>
            <label htmlFor="cari-detay-notlar">Notlar</label>

            <textarea
              id="cari-detay-notlar"
              rows="3"
              value={cariForm.notlar}
              onChange={(event) =>
                setCariForm((onceki) => ({
                  ...onceki,
                  notlar: event.target.value,
                }))
              }
            />
          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
            }}
          >
            <button
              type="submit"
              disabled={cariKaydediliyor}
            >
              {cariKaydediliyor
                ? "Kaydediliyor..."
                : "Kaydet"}
            </button>

            <button
              type="button"
              onClick={cariDuzenlemeyiIptalEt}
              disabled={cariKaydediliyor}
            >
              İptal
            </button>
          </div>
        </form>
      ) : (
        <div style={{ marginBottom: 25 }}>
          <h1>{cari.cari_adi}</h1>

          <p>
            <strong>Telefon:</strong> {cari.telefon || "-"}
          </p>

          {cari.notlar && (
            <p>
              <strong>Not:</strong> {cari.notlar}
            </p>
          )}

          <button
            type="button"
            onClick={() => {
              setCariDuzenleniyor(true);
              setMesaj("");
              setHataVar(false);
            }}
          >
            Cari Bilgilerini Düzenle
          </button>
        </div>
      )}

      <div
        style={{
          display: "flex",
          gap: 15,
          alignItems: "end",
          flexWrap: "wrap",
          marginBottom: 20,
        }}
      >
        <div>
          <label htmlFor="baslangicTarihi">
            Başlangıç Tarihi
          </label>

          <input
            id="baslangicTarihi"
            type="date"
            value={baslangicTarihi}
            onChange={(event) =>
              setBaslangicTarihi(event.target.value)
            }
          />
        </div>

        <div>
          <label htmlFor="bitisTarihi">
            Bitiş Tarihi
          </label>

          <input
            id="bitisTarihi"
            type="date"
            value={bitisTarihi}
            onChange={(event) =>
              setBitisTarihi(event.target.value)
            }
          />
        </div>

        <button type="button" onClick={filtreyiTemizle}>
          Filtreyi Temizle
        </button>
      </div>

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

      {yukleniyor ? (
        <p>Hareketler yükleniyor...</p>
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
                <th style={hucreStili}>Tarih</th>
                <th style={hucreStili}>İşlem</th>
                <th style={hucreStili}>Açıklama</th>
                <th style={hucreStili}>Borç</th>
                <th style={hucreStili}>Ödeme</th>
                <th style={hucreStili}>Bakiye</th>
                <th style={hucreStili}>İşlemler</th>
              </tr>
            </thead>

            <tbody>
              {filtreliHareketler.length === 0 ? (
                <tr>
                  <td style={hucreStili} colSpan="7">
                    Bu tarih aralığında hareket bulunamadı.
                  </td>
                </tr>
              ) : (
                filtreliHareketler.map((hareket) => (
                  <tr key={hareket.id}>
                    <td style={hucreStili}>
                      {tarihFormatla(hareket.tarih)}
                    </td>

                    <td style={hucreStili}>
                      {hareket.tip}
                    </td>

                    <td style={hucreStili}>
                      {hareket.aciklama}
                    </td>

                    <td style={hucreStili}>
                      {hareket.borc > 0
                        ? paraFormatla(hareket.borc)
                        : "-"}
                    </td>

                    <td style={hucreStili}>
                      {hareket.odeme > 0
                        ? paraFormatla(hareket.odeme)
                        : "-"}
                    </td>

                    <td style={hucreStili}>
                      {paraFormatla(hareket.bakiye)}
                    </td>

                    <td style={hucreStili}>
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => duzenle(hareket)}
                        >
                          Düzenle
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            hareketSil(hareket)
                          }
                          style={{
                            color: "#dc2626",
                          }}
                        >
                          Sil
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>

            <tfoot>
              <tr>
                <th style={toplamHucreStili} colSpan="3">
                  FİLTRELİ TOPLAM
                </th>

                <th style={toplamHucreStili}>
                  {paraFormatla(filtreliToplamBorc)}
                </th>

                <th style={toplamHucreStili}>
                  {paraFormatla(filtreliToplamOdeme)}
                </th>

                <th style={toplamHucreStili}>
                  {paraFormatla(filtreliKalan)}
                </th>

                <th style={toplamHucreStili}></th>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {duzenlenenGider && (
        <GiderDuzenleModal
          gider={duzenlenenGider}
          onKapat={() => setDuzenlenenGider(null)}
          onKaydedildi={async () => {
            setDuzenlenenGider(null);
            setMesaj("Gider güncellendi.");
            await hareketleriYenile();
          }}
        />
      )}

      {duzenlenenOdeme && (
        <OdemeDuzenleModal
          odeme={duzenlenenOdeme}
          cariId={cari.id}
          onKapat={() => setDuzenlenenOdeme(null)}
          onKaydedildi={async () => {
            setDuzenlenenOdeme(null);
            setMesaj("Ödeme güncellendi.");
            await hareketleriYenile();
          }}
        />
      )}
    </div>
  );
}

const hucreStili = {
  border: "1px solid #ccc",
  padding: 10,
  textAlign: "left",
};

const toplamHucreStili = {
  border: "1px solid #999",
  padding: 12,
  textAlign: "left",
  fontWeight: "bold",
};

const alanStili = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  marginBottom: 15,
};