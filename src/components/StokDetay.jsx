import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase";
import StokHareketDuzenleModal from "./StokHareketDuzenleModal";

export default function StokDetay({
  urun,
  onGeriDon,
  onDegisiklik,
}) {
  const bugun = tarihiYaz(new Date());

  const [hareketler, setHareketler] = useState([]);
  const [duzenlenenHareket, setDuzenlenenHareket] =
    useState(null);

  const [hareketTuru, setHareketTuru] = useState("giris");
  const [tarih, setTarih] = useState(bugun);
  const [miktar, setMiktar] = useState("");
  const [toplamTutar, setToplamTutar] = useState("");
  const [aciklama, setAciklama] = useState("");

  const [aktifFiltre, setAktifFiltre] = useState("buAy");
  const [baslangicTarihi, setBaslangicTarihi] =
    useState("");
  const [bitisTarihi, setBitisTarihi] = useState("");

  const [yukleniyor, setYukleniyor] = useState(true);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [siliniyorId, setSiliniyorId] = useState(null);
  const [mesaj, setMesaj] = useState("");
  const [hataVar, setHataVar] = useState(false);

  useEffect(() => {
    hareketleriGetir();
  }, [urun.id]);

  async function hareketleriGetir() {
    setYukleniyor(true);
    setHataVar(false);

    const { data, error } = await supabase
      .from("stok_hareketleri")
      .select(`
        id,
        urun_id,
        hareket_turu,
        tarih,
        miktar,
        toplam_tutar,
        aciklama,
        olusturulma_tarihi
      `)
      .eq("urun_id", urun.id)
      .order("tarih", { ascending: false })
      .order("id", { ascending: false });

    if (error) {
      setMesaj(
        `Stok hareketleri alınamadı: ${error.message}`
      );
      setHataVar(true);
      setHareketler([]);
      setYukleniyor(false);
      return;
    }

    setHareketler(data || []);
    setYukleniyor(false);
  }

  /*
    Gerçek mevcut stok her zaman bütün hareketlerden
    hesaplanır. Tarih filtresinden etkilenmez.
  */
  const tumToplamGiris = useMemo(() => {
    return hareketler
      .filter(
        (hareket) => hareket.hareket_turu === "giris"
      )
      .reduce(
        (toplam, hareket) =>
          toplam + Number(hareket.miktar || 0),
        0
      );
  }, [hareketler]);

  const tumToplamCikis = useMemo(() => {
    return hareketler
      .filter(
        (hareket) => hareket.hareket_turu === "cikis"
      )
      .reduce(
        (toplam, hareket) =>
          toplam + Number(hareket.miktar || 0),
        0
      );
  }, [hareketler]);

  const mevcutStok = tumToplamGiris - tumToplamCikis;

  const filtreTarihleri = useMemo(() => {
    const simdi = new Date();

    if (aktifFiltre === "bugun") {
      return {
        baslangic: tarihiYaz(simdi),
        bitis: tarihiYaz(simdi),
      };
    }

    if (aktifFiltre === "buHafta") {
      const haftaninGunu = simdi.getDay();
      const pazartesiFarki =
        haftaninGunu === 0 ? -6 : 1 - haftaninGunu;

      const pazartesi = new Date(simdi);
      pazartesi.setDate(
        simdi.getDate() + pazartesiFarki
      );

      const pazar = new Date(pazartesi);
      pazar.setDate(pazartesi.getDate() + 6);

      return {
        baslangic: tarihiYaz(pazartesi),
        bitis: tarihiYaz(pazar),
      };
    }

    if (aktifFiltre === "buAy") {
      const ayinIlkGunu = new Date(
        simdi.getFullYear(),
        simdi.getMonth(),
        1
      );

      const ayinSonGunu = new Date(
        simdi.getFullYear(),
        simdi.getMonth() + 1,
        0
      );

      return {
        baslangic: tarihiYaz(ayinIlkGunu),
        bitis: tarihiYaz(ayinSonGunu),
      };
    }

    if (aktifFiltre === "buYil") {
      return {
        baslangic: `${simdi.getFullYear()}-01-01`,
        bitis: `${simdi.getFullYear()}-12-31`,
      };
    }

    if (aktifFiltre === "tarihAraligi") {
      return {
        baslangic: baslangicTarihi,
        bitis: bitisTarihi,
      };
    }

    return {
      baslangic: "",
      bitis: "",
    };
  }, [
    aktifFiltre,
    baslangicTarihi,
    bitisTarihi,
  ]);

  const filtreliHareketler = useMemo(() => {
    return hareketler.filter((hareket) => {
      if (
        filtreTarihleri.baslangic &&
        hareket.tarih < filtreTarihleri.baslangic
      ) {
        return false;
      }

      if (
        filtreTarihleri.bitis &&
        hareket.tarih > filtreTarihleri.bitis
      ) {
        return false;
      }

      return true;
    });
  }, [hareketler, filtreTarihleri]);

  const filtreliToplamGiris = useMemo(() => {
    return filtreliHareketler
      .filter(
        (hareket) => hareket.hareket_turu === "giris"
      )
      .reduce(
        (toplam, hareket) =>
          toplam + Number(hareket.miktar || 0),
        0
      );
  }, [filtreliHareketler]);

  const filtreliToplamCikis = useMemo(() => {
    return filtreliHareketler
      .filter(
        (hareket) => hareket.hareket_turu === "cikis"
      )
      .reduce(
        (toplam, hareket) =>
          toplam + Number(hareket.miktar || 0),
        0
      );
  }, [filtreliHareketler]);

  const filtreliStokDegisimi =
    filtreliToplamGiris - filtreliToplamCikis;

  /*
    Yalnızca giriş hareketlerine yazılan toplam tutarlar
    yapılan ödeme olarak hesaplanır.
  */
  const filtreliToplamOdeme = useMemo(() => {
    return filtreliHareketler
      .filter(
        (hareket) => hareket.hareket_turu === "giris"
      )
      .reduce(
        (toplam, hareket) =>
          toplam + Number(hareket.toplam_tutar || 0),
        0
      );
  }, [filtreliHareketler]);

  async function hareketKaydet(event) {
    event.preventDefault();

    setMesaj("");
    setHataVar(false);

    const sayisalMiktar = Number(miktar);

    const sayisalToplamTutar =
      toplamTutar === "" ? null : Number(toplamTutar);

    if (!tarih) {
      setMesaj("Tarih zorunludur.");
      setHataVar(true);
      return;
    }

    if (!sayisalMiktar || sayisalMiktar <= 0) {
      setMesaj("Geçerli bir miktar giriniz.");
      setHataVar(true);
      return;
    }

    if (
      sayisalToplamTutar !== null &&
      (!Number.isFinite(sayisalToplamTutar) ||
        sayisalToplamTutar < 0)
    ) {
      setMesaj("Toplam tutar negatif olamaz.");
      setHataVar(true);
      return;
    }

    if (
      hareketTuru === "cikis" &&
      sayisalMiktar > mevcutStok
    ) {
      setMesaj(
        `Yetersiz stok. Mevcut stok: ${miktarFormatla(
          mevcutStok
        )} ${birimYaz(urun.birim)}`
      );
      setHataVar(true);
      return;
    }

    setKaydediliyor(true);

    const {
      data: { user },
      error: kullaniciHatasi,
    } = await supabase.auth.getUser();

    if (kullaniciHatasi || !user) {
      setMesaj("Oturum bilgisi alınamadı.");
      setHataVar(true);
      setKaydediliyor(false);
      return;
    }

    const { error } = await supabase
      .from("stok_hareketleri")
      .insert([
        {
          urun_id: urun.id,
          hareket_turu: hareketTuru,
          tarih,
          miktar: sayisalMiktar,
          toplam_tutar: sayisalToplamTutar,
          aciklama: aciklama.trim() || null,
          created_by: user.id,
        },
      ]);

    if (error) {
      setMesaj(
        `Stok hareketi kaydedilemedi: ${error.message}`
      );
      setHataVar(true);
      setKaydediliyor(false);
      return;
    }

    setHareketTuru("giris");
    setTarih(bugun);
    setMiktar("");
    setToplamTutar("");
    setAciklama("");
    setKaydediliyor(false);

    await hareketleriGetir();

    setMesaj("Stok hareketi başarıyla kaydedildi.");
    setHataVar(false);

    if (onDegisiklik) {
      await onDegisiklik();
    }
  }

  async function hareketSil(hareket) {
    const hareketAdi =
      hareket.hareket_turu === "giris"
        ? "stok girişini"
        : "stok çıkışını";

    const onaylandi = window.confirm(
      `Bu ${hareketAdi} silmek istediğinize emin misiniz?`
    );

    if (!onaylandi) return;

    setMesaj("");
    setHataVar(false);

    if (hareket.hareket_turu === "giris") {
      const silmeSonrasiStok =
        mevcutStok - Number(hareket.miktar || 0);

      if (silmeSonrasiStok < 0) {
        setMesaj(
          "Bu giriş kaydı silinirse mevcut stok negatif olacağı için silinemez."
        );
        setHataVar(true);
        return;
      }
    }

    setSiliniyorId(hareket.id);

    const { error } = await supabase
      .from("stok_hareketleri")
      .delete()
      .eq("id", hareket.id);

    if (error) {
      setMesaj(
        `Stok hareketi silinemedi: ${error.message}`
      );
      setHataVar(true);
      setSiliniyorId(null);
      return;
    }

    setSiliniyorId(null);

    await hareketleriGetir();

    setMesaj("Stok hareketi silindi.");
    setHataVar(false);

    if (onDegisiklik) {
      await onDegisiklik();
    }
  }

  function filtreSec(filtre) {
    setAktifFiltre(filtre);
    setMesaj("");
    setHataVar(false);
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

  function miktarFormatla(deger) {
    return Number(deger || 0).toLocaleString("tr-TR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 3,
    });
  }

  function paraFormatla(deger) {
    if (
      deger === null ||
      deger === undefined ||
      deger === ""
    ) {
      return "-";
    }

    return Number(deger).toLocaleString("tr-TR", {
      style: "currency",
      currency: "TRY",
    });
  }

  function tarihFormatla(deger) {
    if (!deger) return "-";

    return new Date(
      `${deger}T00:00:00`
    ).toLocaleDateString("tr-TR");
  }

  function filtreBasligi() {
    const basliklar = {
      bugun: "Bugün",
      buHafta: "Bu Hafta",
      buAy: "Bu Ay",
      buYil: "Bu Yıl",
      tarihAraligi: "Seçilen Tarih Aralığı",
    };

    return basliklar[aktifFiltre] || "Seçilen Dönem";
  }

  return (
    <div>
      <button type="button" onClick={onGeriDon}>
        ← Ürün Listesine Dön
      </button>

      <h1 style={{ marginBottom: 5 }}>
        {urun.urun_adi}
      </h1>

      <p style={{ marginTop: 0 }}>
        Birim: <strong>{birimYaz(urun.birim)}</strong>
      </p>

      <div
        style={{
          marginTop: 25,
          marginBottom: 25,
        }}
      >
        <h2>Tarih Filtresi</h2>

        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            marginBottom: 15,
          }}
        >
          <button
            type="button"
            onClick={() => filtreSec("bugun")}
            style={filtreButonuStili(
              aktifFiltre === "bugun"
            )}
          >
            Bugün
          </button>

          <button
            type="button"
            onClick={() => filtreSec("buHafta")}
            style={filtreButonuStili(
              aktifFiltre === "buHafta"
            )}
          >
            Bu Hafta
          </button>

          <button
            type="button"
            onClick={() => filtreSec("buAy")}
            style={filtreButonuStili(
              aktifFiltre === "buAy"
            )}
          >
            Bu Ay
          </button>

          <button
            type="button"
            onClick={() => filtreSec("buYil")}
            style={filtreButonuStili(
              aktifFiltre === "buYil"
            )}
          >
            Bu Yıl
          </button>

          <button
            type="button"
            onClick={() =>
              filtreSec("tarihAraligi")
            }
            style={filtreButonuStili(
              aktifFiltre === "tarihAraligi"
            )}
          >
            Tarih Aralığı
          </button>
        </div>

        {aktifFiltre === "tarihAraligi" && (
          <div
            style={{
              display: "flex",
              gap: 15,
              flexWrap: "wrap",
            }}
          >
            <div>
              <label
                htmlFor="stok-filtre-baslangic"
                style={etiketStili}
              >
                Başlangıç Tarihi
              </label>

              <input
                id="stok-filtre-baslangic"
                type="date"
                value={baslangicTarihi}
                onChange={(event) =>
                  setBaslangicTarihi(
                    event.target.value
                  )
                }
                style={inputStili}
              />
            </div>

            <div>
              <label
                htmlFor="stok-filtre-bitis"
                style={etiketStili}
              >
                Bitiş Tarihi
              </label>

              <input
                id="stok-filtre-bitis"
                type="date"
                value={bitisTarihi}
                onChange={(event) =>
                  setBitisTarihi(event.target.value)
                }
                style={inputStili}
              />
            </div>
          </div>
        )}
      </div>

      <h2>{filtreBasligi()} Özeti</h2>

      <div
        style={{
          display: "flex",
          gap: 15,
          flexWrap: "wrap",
          marginBottom: 30,
        }}
      >
        <div style={ozetKutusuStili}>
          <div>Dönem Girişi</div>

          <strong>
            {miktarFormatla(filtreliToplamGiris)}{" "}
            {birimYaz(urun.birim)}
          </strong>
        </div>

        <div style={ozetKutusuStili}>
          <div>Dönem Çıkışı</div>

          <strong>
            {miktarFormatla(filtreliToplamCikis)}{" "}
            {birimYaz(urun.birim)}
          </strong>
        </div>

        <div style={ozetKutusuStili}>
          <div>Dönem Stok Değişimi</div>

          <strong>
            {filtreliStokDegisimi > 0 ? "+" : ""}
            {miktarFormatla(filtreliStokDegisimi)}{" "}
            {birimYaz(urun.birim)}
          </strong>
        </div>

        <div style={ozetKutusuStili}>
          <div>Mevcut Stok</div>

          <strong>
            {miktarFormatla(mevcutStok)}{" "}
            {birimYaz(urun.birim)}
          </strong>
        </div>

        <div style={ozetKutusuStili}>
          <div>Toplam Yapılan Ödeme</div>

          <strong>
            {paraFormatla(filtreliToplamOdeme)}
          </strong>
        </div>
      </div>

      <form
        onSubmit={hareketKaydet}
        style={{
          maxWidth: 600,
          marginBottom: 30,
        }}
      >
        <h2>Stok Hareketi Ekle</h2>

        <div style={alanStili}>
          <label
            htmlFor="stok-hareket-turu"
            style={etiketStili}
          >
            Hareket Türü
          </label>

          <select
            id="stok-hareket-turu"
            value={hareketTuru}
            onChange={(event) =>
              setHareketTuru(event.target.value)
            }
            disabled={kaydediliyor}
            style={inputStili}
          >
            <option value="giris">Giriş</option>
            <option value="cikis">Çıkış</option>
          </select>
        </div>

        <div style={alanStili}>
          <label
            htmlFor="stok-tarih"
            style={etiketStili}
          >
            Tarih
          </label>

          <input
            id="stok-tarih"
            type="date"
            value={tarih}
            onChange={(event) =>
              setTarih(event.target.value)
            }
            disabled={kaydediliyor}
            required
            style={inputStili}
          />
        </div>

        <div style={alanStili}>
          <label
            htmlFor="stok-miktar"
            style={etiketStili}
          >
            Miktar ({birimYaz(urun.birim)})
          </label>

          <input
            id="stok-miktar"
            type="number"
            min="0.001"
            step="0.001"
            value={miktar}
            onChange={(event) =>
              setMiktar(event.target.value)
            }
            disabled={kaydediliyor}
            required
            style={inputStili}
          />
        </div>

        <div style={alanStili}>
          <label
            htmlFor="stok-toplam-tutar"
            style={etiketStili}
          >
            Toplam Tutar
          </label>

          <input
            id="stok-toplam-tutar"
            type="number"
            min="0"
            step="0.01"
            value={toplamTutar}
            onChange={(event) =>
              setToplamTutar(event.target.value)
            }
            disabled={kaydediliyor}
            placeholder="İsteğe bağlı"
            style={inputStili}
          />
        </div>

        <div style={alanStili}>
          <label
            htmlFor="stok-aciklama"
            style={etiketStili}
          >
            Açıklama
          </label>

          <textarea
            id="stok-aciklama"
            rows="3"
            value={aciklama}
            onChange={(event) =>
              setAciklama(event.target.value)
            }
            disabled={kaydediliyor}
            style={{
              ...inputStili,
              resize: "vertical",
            }}
          />
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
            ? "Kaydediliyor..."
            : hareketTuru === "giris"
              ? "Stok Girişi Ekle"
              : "Stok Çıkışı Ekle"}
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

      <h2>{filtreBasligi()} Stok Hareketleri</h2>

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
                <th style={hucreStili}>Miktar</th>
                <th style={hucreStili}>
                  Toplam Tutar
                </th>
                <th style={hucreStili}>Açıklama</th>
                <th style={hucreStili}>İşlemler</th>
              </tr>
            </thead>

            <tbody>
              {filtreliHareketler.length === 0 ? (
                <tr>
                  <td
                    style={hucreStili}
                    colSpan="6"
                  >
                    Seçilen dönemde stok hareketi
                    bulunamadı.
                  </td>
                </tr>
              ) : (
                filtreliHareketler.map((hareket) => (
                  <tr key={hareket.id}>
                    <td style={hucreStili}>
                      {tarihFormatla(hareket.tarih)}
                    </td>

                    <td style={hucreStili}>
                      {hareket.hareket_turu ===
                      "giris"
                        ? "Giriş"
                        : "Çıkış"}
                    </td>

                    <td style={hucreStili}>
                      {miktarFormatla(
                        hareket.miktar
                      )}{" "}
                      {birimYaz(urun.birim)}
                    </td>

                    <td style={hucreStili}>
                      {paraFormatla(
                        hareket.toplam_tutar
                      )}
                    </td>

                    <td style={hucreStili}>
                      {hareket.aciklama || "-"}
                    </td>

                    <td style={hucreStili}>
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setDuzenlenenHareket(
                              hareket
                            )
                          }
                        >
                          Düzenle
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            hareketSil(hareket)
                          }
                          disabled={
                            siliniyorId === hareket.id
                          }
                          style={{
                            color: "#dc2626",
                          }}
                        >
                          {siliniyorId === hareket.id
                            ? "Siliniyor..."
                            : "Sil"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {duzenlenenHareket && (
        <StokHareketDuzenleModal
          hareket={duzenlenenHareket}
          urun={urun}
          mevcutStok={mevcutStok}
          onKapat={() =>
            setDuzenlenenHareket(null)
          }
          onKaydedildi={async () => {
            setDuzenlenenHareket(null);

            await hareketleriGetir();

            setMesaj(
              "Stok hareketi başarıyla güncellendi."
            );
            setHataVar(false);

            if (onDegisiklik) {
              await onDegisiklik();
            }
          }}
        />
      )}
    </div>
  );
}

function tarihiYaz(tarih) {
  const yil = tarih.getFullYear();
  const ay = String(tarih.getMonth() + 1).padStart(2, "0");
  const gun = String(tarih.getDate()).padStart(2, "0");

  return `${yil}-${ay}-${gun}`;
}

function filtreButonuStili(aktif) {
  return {
    padding: "8px 14px",
    border: "1px solid #94a3b8",
    borderRadius: 5,
    cursor: "pointer",
    background: aktif ? "#475569" : "#ffffff",
    color: aktif ? "#ffffff" : "#111827",
  };
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

const ozetKutusuStili = {
  border: "1px solid #d1d5db",
  padding: 15,
  minWidth: 180,
  borderRadius: 6,
};