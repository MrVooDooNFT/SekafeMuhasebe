import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase";

export default function GelirForm() {
  const bugun = new Date().toISOString().split("T")[0];

  const [isletme, setIsletme] = useState("cafe");
  const [tarih, setTarih] = useState(bugun);

  const [nakitSatis, setNakitSatis] = useState("0");
  const [krediKartiSatis, setKrediKartiSatis] =
    useState("0");
  const [krediKartiSatis2, setKrediKartiSatis2] =
    useState("0");
  const [bankaHavalesi, setBankaHavalesi] =
    useState("0");

  const [loading, setLoading] = useState(false);
  const [veriYukleniyor, setVeriYukleniyor] =
    useState(false);
  const [mesaj, setMesaj] = useState("");
  const [hataVar, setHataVar] = useState(false);
  const [kayitMevcut, setKayitMevcut] = useState(false);

  useEffect(() => {
    gunlukGeliriGetir();
  }, [tarih, isletme]);

  async function gunlukGeliriGetir() {
    if (!tarih || !isletme) return;

    setVeriYukleniyor(true);
    setMesaj("");
    setHataVar(false);

    setNakitSatis("0");
    setKrediKartiSatis("0");
    setKrediKartiSatis2("0");
    setBankaHavalesi("0");
    setKayitMevcut(false);

    const gelirTurleri =
      isletme === "cafe"
        ? [
            "nakit_satis",
            "kredi_karti_satis",
            "banka_havalesi",
          ]
        : ["nakit_satis", "kredi_karti_satis"];

    const { data, error } = await supabase
      .from("gelirler")
      .select("tur, tutar, kart_1_tutar, kart_2_tutar")
      .eq("tarih", tarih)
      .eq("isletme", isletme)
      .in("tur", gelirTurleri);

    setVeriYukleniyor(false);

    if (error) {
      setMesaj(
        `Gelir bilgileri alınamadı: ${error.message}`
      );
      setHataVar(true);
      return;
    }

    const kayitlar = data || [];

    const nakitKaydi = kayitlar.find(
      (kayit) => kayit.tur === "nakit_satis"
    );

    const krediKartiKaydi = kayitlar.find(
      (kayit) => kayit.tur === "kredi_karti_satis"
    );

    const bankaKaydi = kayitlar.find(
      (kayit) => kayit.tur === "banka_havalesi"
    );

    setNakitSatis(
      nakitKaydi ? String(nakitKaydi.tutar) : "0"
    );

    if (krediKartiKaydi) {
  const kart1 = Number(
    krediKartiKaydi.kart_1_tutar || 0
  );

  const kart2 = Number(
    krediKartiKaydi.kart_2_tutar || 0
  );

  const toplam = Number(
    krediKartiKaydi.tutar || 0
  );

  /*
    Eski kayıtlarda kart_1_tutar ve kart_2_tutar
    bulunmadığı için toplam tutarı ilk alanda gösterir.
  */
  if (
    isletme === "bufe" &&
    kart1 === 0 &&
    kart2 === 0 &&
    toplam !== 0
  ) {
    setKrediKartiSatis(String(toplam));
    setKrediKartiSatis2("0");
  } else {
    setKrediKartiSatis(String(kart1));
    setKrediKartiSatis2(String(kart2));
  }
} else {
  setKrediKartiSatis("0");
  setKrediKartiSatis2("0");
}

    setBankaHavalesi(
      bankaKaydi ? String(bankaKaydi.tutar) : "0"
    );

    setKayitMevcut(kayitlar.length > 0);
  }

  function tutariSayiyaCevir(deger) {
    const sayi = Number(deger || 0);

    return Number.isFinite(sayi) ? sayi : 0;
  }

  const krediKartiToplam = useMemo(() => {
    if (isletme === "bufe") {
      return (
        tutariSayiyaCevir(krediKartiSatis) +
        tutariSayiyaCevir(krediKartiSatis2)
      );
    }

    return tutariSayiyaCevir(krediKartiSatis);
  }, [
    isletme,
    krediKartiSatis,
    krediKartiSatis2,
  ]);

  const gunlukToplam = useMemo(() => {
    const nakitTutar =
      tutariSayiyaCevir(nakitSatis);

    const bankaTutar =
      isletme === "cafe"
        ? tutariSayiyaCevir(bankaHavalesi)
        : 0;

    return nakitTutar + krediKartiToplam + bankaTutar;
  }, [
    isletme,
    nakitSatis,
    krediKartiToplam,
    bankaHavalesi,
  ]);

  function paraFormatla(tutar) {
    return Number(tutar || 0).toLocaleString("tr-TR", {
      style: "currency",
      currency: "TRY",
    });
  }

  async function kaydet(event) {
    event.preventDefault();

    setMesaj("");
    setHataVar(false);

    if (!tarih) {
      setMesaj("Tarih seçiniz.");
      setHataVar(true);
      return;
    }

    const nakitTutar =
      tutariSayiyaCevir(nakitSatis);

    const krediKartiTutar1 =
      tutariSayiyaCevir(krediKartiSatis);

    const krediKartiTutar2 =
      isletme === "bufe"
        ? tutariSayiyaCevir(krediKartiSatis2)
        : 0;

    const krediKartiTutar =
      krediKartiTutar1 + krediKartiTutar2;

    const bankaTutar =
      isletme === "cafe"
        ? tutariSayiyaCevir(bankaHavalesi)
        : 0;

    if (
      nakitTutar < 0 ||
      krediKartiTutar1 < 0 ||
      krediKartiTutar2 < 0 ||
      bankaTutar < 0
    ) {
      setMesaj("Gelir tutarları negatif olamaz.");
      setHataVar(true);
      return;
    }

    setLoading(true);

    const {
      data: { user },
      error: kullaniciHatasi,
    } = await supabase.auth.getUser();

    if (kullaniciHatasi || !user) {
      setLoading(false);
      setMesaj("Oturum bilgisi alınamadı.");
      setHataVar(true);
      return;
    }

    const kayitlar = [
      {
        tarih,
        isletme,
        tur: "nakit_satis",
        tutar: nakitTutar,
        aciklama:
          isletme === "cafe"
            ? "Cafe gün sonu nakit satışı"
            : "Büfe gün sonu nakit satışı",
        created_by: user.id,
      },
      {
  tarih,
  isletme,
  tur: "kredi_karti_satis",
  tutar: krediKartiTutar,
  kart_1_tutar: krediKartiTutar1,
  kart_2_tutar: krediKartiTutar2,
  aciklama:
    isletme === "cafe"
      ? "Cafe gün sonu kredi kartı satışı"
      : "Büfe gün sonu kredi kartı satışları",
  created_by: user.id,
},
    ];

    if (isletme === "cafe") {
      kayitlar.push({
        tarih,
        isletme,
        tur: "banka_havalesi",
        tutar: bankaTutar,
        aciklama: "Cafe gün sonu banka havalesi",
        created_by: user.id,
      });
    }

    const { error: kayitHatasi } = await supabase
      .from("gelirler")
      .upsert(kayitlar, {
        onConflict: "tarih,tur,isletme",
      });

    if (kayitHatasi) {
      setLoading(false);
      setMesaj(`Kayıt hatası: ${kayitHatasi.message}`);
      setHataVar(true);
      return;
    }

    /*
      Büfe kaydında banka havalesi bulunmamalı.
      Önceden yanlışlıkla oluşmuş bir kayıt varsa temizler.
    */
    if (isletme === "bufe") {
      const { error: bankaSilmeHatasi } = await supabase
        .from("gelirler")
        .delete()
        .eq("tarih", tarih)
        .eq("isletme", "bufe")
        .eq("tur", "banka_havalesi");

      if (bankaSilmeHatasi) {
        setLoading(false);
        setMesaj(
          `Büfe banka kaydı temizlenemedi: ${bankaSilmeHatasi.message}`
        );
        setHataVar(true);
        return;
      }
    }

    setLoading(false);
    setKayitMevcut(true);

    setMesaj(
      kayitMevcut
        ? `${
            isletme === "cafe" ? "Cafe" : "Büfe"
          } gün sonu gelirleri güncellendi.`
        : `${
            isletme === "cafe" ? "Cafe" : "Büfe"
          } gün sonu gelirleri kaydedildi.`
    );

    setHataVar(false);

    /*
      Büfe kayıtlarından sonra iki kutunun toplamı
      tek kayıt olarak tutulduğu için tekrar yüklenir.
    */
    await gunlukGeliriGetir();

    setMesaj(
      kayitMevcut
        ? `${
            isletme === "cafe" ? "Cafe" : "Büfe"
          } gün sonu gelirleri güncellendi.`
        : `${
            isletme === "cafe" ? "Cafe" : "Büfe"
          } gün sonu gelirleri kaydedildi.`
    );
  }

  return (
    <div
      style={{
        maxWidth: 600,
        background: "#ffffff",
        color: "#111827",
        padding: 20,
        borderRadius: 10,
      }}
    >
      <h2 style={{ marginTop: 0 }}>
        Gün Sonu Gelir Girişi
      </h2>

      {mesaj && (
        <p
          style={{
            marginBottom: 15,
            color: hataVar ? "#dc2626" : "#059669",
            fontWeight: 600,
          }}
        >
          {mesaj}
        </p>
      )}

      <form onSubmit={kaydet}>
        <div style={alanStili}>
          <label
            htmlFor="gelir-isletme"
            style={etiketStili}
          >
            İşletme
          </label>

          <select
            id="gelir-isletme"
            value={isletme}
            onChange={(event) =>
              setIsletme(event.target.value)
            }
            disabled={loading}
            style={inputStili}
          >
            <option value="cafe">Cafe</option>
            <option value="bufe">Büfe</option>
          </select>
        </div>

        <div style={alanStili}>
          <label
            htmlFor="gelir-tarih"
            style={etiketStili}
          >
            Tarih
          </label>

          <input
            id="gelir-tarih"
            type="date"
            value={tarih}
            onChange={(event) =>
              setTarih(event.target.value)
            }
            required
            disabled={loading}
            style={inputStili}
          />
        </div>

        {veriYukleniyor ? (
          <p>Seçilen günün gelirleri yükleniyor...</p>
        ) : (
          <>
            {kayitMevcut && (
              <p
                style={{
                  padding: 10,
                  background: "#eff6ff",
                  borderRadius: 6,
                  color: "#1d4ed8",
                }}
              >
                Bu tarih ve işletmeye ait kayıt mevcut.
                Kaydettiğinizde kayıtlar güncellenecek.
              </p>
            )}

            <div style={alanStili}>
              <label
                htmlFor="nakit-satis"
                style={etiketStili}
              >
                Nakit Satış
              </label>

              <input
                id="nakit-satis"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                placeholder="0,00"
                value={nakitSatis}
                onChange={(event) =>
                  setNakitSatis(event.target.value)
                }
                required
                style={inputStili}
              />
            </div>

            <div style={alanStili}>
              <label
                htmlFor="kredi-karti-satis"
                style={etiketStili}
              >
                {isletme === "bufe"
                  ? "Kredi Kartı Satışı 1"
                  : "Kredi Kartı Satışı"}
              </label>

              <input
                id="kredi-karti-satis"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                placeholder="0,00"
                value={krediKartiSatis}
                onChange={(event) =>
                  setKrediKartiSatis(event.target.value)
                }
                required
                style={inputStili}
              />
            </div>

            {isletme === "bufe" && (
              <div style={alanStili}>
                <label
                  htmlFor="kredi-karti-satis-2"
                  style={etiketStili}
                >
                  Kredi Kartı Satışı 2
                </label>

                <input
                  id="kredi-karti-satis-2"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={krediKartiSatis2}
                  onChange={(event) =>
                    setKrediKartiSatis2(
                      event.target.value
                    )
                  }
                  required
                  style={inputStili}
                />
              </div>
            )}

            {isletme === "bufe" && (
              <div
                style={{
                  marginBottom: 15,
                  padding: 10,
                  background: "#f8fafc",
                  borderRadius: 6,
                  fontWeight: 600,
                }}
              >
                Kredi Kartı Toplamı:{" "}
                {paraFormatla(krediKartiToplam)}
              </div>
            )}

            {isletme === "cafe" && (
              <div style={alanStili}>
                <label
                  htmlFor="banka-havalesi"
                  style={etiketStili}
                >
                  Banka Havalesi
                </label>

                <input
                  id="banka-havalesi"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={bankaHavalesi}
                  onChange={(event) =>
                    setBankaHavalesi(
                      event.target.value
                    )
                  }
                  required
                  style={inputStili}
                />
              </div>
            )}

            <div
              style={{
                marginBottom: 20,
                padding: 15,
                background: "#f3f4f6",
                borderRadius: 6,
                fontSize: 18,
                fontWeight: 700,
              }}
            >
              {isletme === "cafe" ? "Cafe" : "Büfe"}{" "}
              Günlük Toplamı:{" "}
              {paraFormatla(gunlukToplam)}
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: 12,
                background: loading
                  ? "#94a3b8"
                  : "#2563eb",
                color: "#ffffff",
                border: "none",
                borderRadius: 6,
                cursor: loading
                  ? "not-allowed"
                  : "pointer",
                fontSize: 16,
              }}
            >
              {loading
                ? "Kaydediliyor..."
                : kayitMevcut
                  ? "Gün Sonunu Güncelle"
                  : "Gün Sonunu Kaydet"}
            </button>
          </>
        )}
      </form>
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