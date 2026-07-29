import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase";

export default function Kasa() {
  const [gelirler, setGelirler] = useState([]);
  const [odemeler, setOdemeler] = useState([]);

  const [baslangicTarihi, setBaslangicTarihi] = useState("");
  const [bitisTarihi, setBitisTarihi] = useState("");

  const [yukleniyor, setYukleniyor] = useState(true);
  const [mesaj, setMesaj] = useState("");

  useEffect(() => {
    kasaVerileriniGetir();
  }, []);

  async function kasaVerileriniGetir() {
    setYukleniyor(true);
    setMesaj("");

    const { data: gelirData, error: gelirError } = await supabase
      .from("gelirler")
      .select("id, tarih, tur, tutar, aciklama");

    if (gelirError) {
      setMesaj(`Gelirler alınamadı: ${gelirError.message}`);
      setYukleniyor(false);
      return;
    }

    const { data: odemeData, error: odemeError } = await supabase
      .from("gider_odemeleri")
      .select(`
        id,
        tarih,
        tutar,
        odeme_yolu,
        aciklama,
        cari_id,
        cariler (
          cari_adi
        )
      `);

    if (odemeError) {
      setMesaj(`Ödemeler alınamadı: ${odemeError.message}`);
      setYukleniyor(false);
      return;
    }

    setGelirler(gelirData || []);
    setOdemeler(odemeData || []);
    setYukleniyor(false);
  }

  function tarihAraligindaMi(tarih) {
    if (baslangicTarihi && tarih < baslangicTarihi) {
      return false;
    }

    if (bitisTarihi && tarih > bitisTarihi) {
      return false;
    }

    return true;
  }

  const filtreliGelirler = useMemo(() => {
    return gelirler.filter((gelir) => tarihAraligindaMi(gelir.tarih));
  }, [gelirler, baslangicTarihi, bitisTarihi]);

  const filtreliOdemeler = useMemo(() => {
    return odemeler.filter((odeme) => tarihAraligindaMi(odeme.tarih));
  }, [odemeler, baslangicTarihi, bitisTarihi]);

  const hareketler = useMemo(() => {
    const gelirHareketleri = filtreliGelirler.map((gelir) => ({
      id: `gelir-${gelir.id}`,
      tarih: gelir.tarih,
      tip: "Gelir",
      tur: gelirTuruYaz(gelir.tur),
      aciklama: gelir.aciklama || gelirTuruYaz(gelir.tur),
      giris: Number(gelir.tutar || 0),
      cikis: 0,
    }));

    const odemeHareketleri = filtreliOdemeler.map((odeme) => ({
      id: `odeme-${odeme.id}`,
      tarih: odeme.tarih,
      tip: "Ödeme",
      tur: odemeYoluYaz(odeme.odeme_yolu),
      aciklama:
        odeme.aciklama ||
        odeme.cariler?.cari_adi ||
        "Cari ödemesi",
      giris: 0,
      cikis: Number(odeme.tutar || 0),
    }));

    const siraliHareketler = [
      ...gelirHareketleri,
      ...odemeHareketleri,
    ].sort((a, b) => {
      if (a.tarih === b.tarih) {
        if (a.tip === b.tip) return 0;
        return a.tip === "Gelir" ? -1 : 1;
      }

      return a.tarih.localeCompare(b.tarih);
    });

    let bakiye = 0;

    return siraliHareketler.map((hareket) => {
      bakiye += hareket.giris;
      bakiye -= hareket.cikis;

      return {
        ...hareket,
        bakiye,
      };
    });
  }, [filtreliGelirler, filtreliOdemeler]);

  const nakitSatisToplami = filtreliGelirler
    .filter((gelir) => gelir.tur === "nakit_satis")
    .reduce((toplam, gelir) => toplam + Number(gelir.tutar || 0), 0);

  const krediKartiSatisToplami = filtreliGelirler
    .filter((gelir) => gelir.tur === "kredi_karti_satis")
    .reduce((toplam, gelir) => toplam + Number(gelir.tutar || 0), 0);

  const bankaHavalesiToplami = filtreliGelirler
    .filter((gelir) => gelir.tur === "banka_havalesi")
    .reduce((toplam, gelir) => toplam + Number(gelir.tutar || 0), 0);

  const toplamGelir =
    nakitSatisToplami +
    krediKartiSatisToplami +
    bankaHavalesiToplami;

  const toplamOdeme = filtreliOdemeler.reduce(
    (toplam, odeme) => toplam + Number(odeme.tutar || 0),
    0
  );

  const netBakiye = toplamGelir - toplamOdeme;

  function filtreyiTemizle() {
    setBaslangicTarihi("");
    setBitisTarihi("");
  }

  function paraFormatla(tutar) {
    return Number(tutar || 0).toLocaleString("tr-TR", {
      style: "currency",
      currency: "TRY",
    });
  }

  function tarihFormatla(tarih) {
    if (!tarih) return "-";

    return new Date(`${tarih}T00:00:00`).toLocaleDateString("tr-TR");
  }

  function gelirTuruYaz(tur) {
    const turler = {
      nakit_satis: "Nakit Satış",
      kredi_karti_satis: "Kredi Kartı Satışı",
      banka_havalesi: "Banka Havalesi",
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
      <h1>Kasa</h1>

      {mesaj && (
        <p
          style={{
            color: "#dc2626",
            fontWeight: 600,
          }}
        >
          {mesaj}
        </p>
      )}

      <div
        style={{
          display: "flex",
          gap: 15,
          alignItems: "end",
          flexWrap: "wrap",
          marginBottom: 25,
        }}
      >
        <div>
          <label
            htmlFor="kasa-baslangic"
            style={{ display: "block", marginBottom: 5 }}
          >
            Başlangıç Tarihi
          </label>

          <input
            id="kasa-baslangic"
            type="date"
            value={baslangicTarihi}
            onChange={(event) =>
              setBaslangicTarihi(event.target.value)
            }
            style={inputStili}
          />
        </div>

        <div>
          <label
            htmlFor="kasa-bitis"
            style={{ display: "block", marginBottom: 5 }}
          >
            Bitiş Tarihi
          </label>

          <input
            id="kasa-bitis"
            type="date"
            value={bitisTarihi}
            onChange={(event) =>
              setBitisTarihi(event.target.value)
            }
            style={inputStili}
          />
        </div>

        <button type="button" onClick={filtreyiTemizle}>
          Filtreyi Temizle
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(190px, 1fr))",
          gap: 15,
          marginBottom: 25,
        }}
      >
        <OzetKutusu
          baslik="Nakit Satış"
          tutar={paraFormatla(nakitSatisToplami)}
        />

        <OzetKutusu
          baslik="Kredi Kartı Satışı"
          tutar={paraFormatla(krediKartiSatisToplami)}
        />

        <OzetKutusu
          baslik="Banka Havalesi"
          tutar={paraFormatla(bankaHavalesiToplami)}
        />

        <OzetKutusu
          baslik="Toplam Gelir"
          tutar={paraFormatla(toplamGelir)}
        />

        <OzetKutusu
          baslik="Toplam Ödeme"
          tutar={paraFormatla(toplamOdeme)}
        />

        <OzetKutusu
          baslik="Net Bakiye"
          tutar={paraFormatla(netBakiye)}
        />
      </div>

      <h2>Kasa Hareketleri</h2>

      {yukleniyor ? (
        <p>Kasa hareketleri yükleniyor...</p>
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
                <th style={hucreStili}>Tür</th>
                <th style={hucreStili}>Açıklama</th>
                <th style={hucreStili}>Giriş</th>
                <th style={hucreStili}>Çıkış</th>
                <th style={hucreStili}>Bakiye</th>
              </tr>
            </thead>

            <tbody>
              {hareketler.length === 0 ? (
                <tr>
                  <td style={hucreStili} colSpan="7">
                    Seçilen tarih aralığında kasa hareketi bulunamadı.
                  </td>
                </tr>
              ) : (
                hareketler.map((hareket) => (
                  <tr key={hareket.id}>
                    <td style={hucreStili}>
                      {tarihFormatla(hareket.tarih)}
                    </td>

                    <td style={hucreStili}>{hareket.tip}</td>

                    <td style={hucreStili}>{hareket.tur}</td>

                    <td style={hucreStili}>
                      {hareket.aciklama}
                    </td>

                    <td style={hucreStili}>
                      {hareket.giris > 0
                        ? paraFormatla(hareket.giris)
                        : "-"}
                    </td>

                    <td style={hucreStili}>
                      {hareket.cikis > 0
                        ? paraFormatla(hareket.cikis)
                        : "-"}
                    </td>

                    <td style={hucreStili}>
                      {paraFormatla(hareket.bakiye)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>

            <tfoot>
              <tr>
                <th style={toplamHucreStili} colSpan="4">
                  TOPLAM
                </th>

                <th style={toplamHucreStili}>
                  {paraFormatla(toplamGelir)}
                </th>

                <th style={toplamHucreStili}>
                  {paraFormatla(toplamOdeme)}
                </th>

                <th style={toplamHucreStili}>
                  {paraFormatla(netBakiye)}
                </th>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

function OzetKutusu({ baslik, tutar }) {
  return (
    <div
      style={{
        background: "#ffffff",
        color: "#111827",
        padding: 18,
        borderRadius: 10,
        border: "1px solid #d1d5db",
      }}
    >
      <div
        style={{
          marginBottom: 8,
          color: "#6b7280",
          fontSize: 14,
        }}
      >
        {baslik}
      </div>

      <div
        style={{
          fontSize: 21,
          fontWeight: 700,
        }}
      >
        {tutar}
      </div>
    </div>
  );
}

const inputStili = {
  padding: 10,
  boxSizing: "border-box",
};

const hucreStili = {
  border: "1px solid #d1d5db",
  padding: 10,
  textAlign: "left",
};

const toplamHucreStili = {
  border: "1px solid #9ca3af",
  padding: 12,
  textAlign: "left",
  fontWeight: 700,
};