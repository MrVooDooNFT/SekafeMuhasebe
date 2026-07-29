import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase";

export default function GelirForm() {
  const bugun = new Date().toISOString().split("T")[0];

  const [tarih, setTarih] = useState(bugun);

  const [nakitSatis, setNakitSatis] = useState("0");
  const [krediKartiSatis, setKrediKartiSatis] = useState("0");
  const [bankaHavalesi, setBankaHavalesi] = useState("0");

  const [loading, setLoading] = useState(false);
  const [veriYukleniyor, setVeriYukleniyor] = useState(false);
  const [mesaj, setMesaj] = useState("");
  const [hataVar, setHataVar] = useState(false);
  const [kayitMevcut, setKayitMevcut] = useState(false);

  useEffect(() => {
    gunlukGeliriGetir();
  }, [tarih]);

  async function gunlukGeliriGetir() {
    if (!tarih) return;

    setVeriYukleniyor(true);
    setMesaj("");
    setHataVar(false);

    const { data, error } = await supabase
      .from("gelirler")
      .select("tur, tutar")
      .eq("tarih", tarih)
      .in("tur", [
        "nakit_satis",
        "kredi_karti_satis",
        "banka_havalesi",
      ]);

    setVeriYukleniyor(false);

    if (error) {
      setMesaj(`Gelir bilgileri alınamadı: ${error.message}`);
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

setKrediKartiSatis(
  krediKartiKaydi ? String(krediKartiKaydi.tutar) : "0"
);

setBankaHavalesi(
  bankaKaydi ? String(bankaKaydi.tutar) : "0"
);

    setKayitMevcut(kayitlar.length > 0);
  }

function tutariSayiyaCevir(deger) {
  const sayi = Number(deger || 0);

  return Number.isFinite(sayi) ? sayi : 0;
}

  const gunlukToplam = useMemo(() => {
    return (
      tutariSayiyaCevir(nakitSatis) +
      tutariSayiyaCevir(krediKartiSatis) +
      tutariSayiyaCevir(bankaHavalesi)
    );
  }, [nakitSatis, krediKartiSatis, bankaHavalesi]);

  function paraFormatla(tutar) {
    return Number(tutar || 0).toLocaleString("tr-TR", {
      style: "currency",
      currency: "TRY",
    });
  }

  async function kaydet(e) {
    e.preventDefault();

    setMesaj("");
    setHataVar(false);

    if (!tarih) {
      setMesaj("Tarih seçiniz.");
      setHataVar(true);
      return;
    }

    const nakitTutar = tutariSayiyaCevir(nakitSatis);
    const krediKartiTutar = tutariSayiyaCevir(krediKartiSatis);
    const bankaTutar = tutariSayiyaCevir(bankaHavalesi);

    if (
      nakitTutar < 0 ||
      krediKartiTutar < 0 ||
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
        tur: "nakit_satis",
        tutar: nakitTutar,
        aciklama: "Gün sonu nakit satışı",
        created_by: user.id,
      },
      {
        tarih,
        tur: "kredi_karti_satis",
        tutar: krediKartiTutar,
        aciklama: "Gün sonu kredi kartı satışı",
        created_by: user.id,
      },
      {
        tarih,
        tur: "banka_havalesi",
        tutar: bankaTutar,
        aciklama: "Gün sonu banka havalesi",
        created_by: user.id,
      },
    ];

    const { error } = await supabase
      .from("gelirler")
      .upsert(kayitlar, {
        onConflict: "tarih,tur",
      });

    setLoading(false);

    if (error) {
      setMesaj(`Kayıt hatası: ${error.message}`);
      setHataVar(true);
      return;
    }

    setKayitMevcut(true);
    setMesaj(
      kayitMevcut
        ? "Gün sonu gelirleri güncellendi."
        : "Gün sonu gelirleri kaydedildi."
    );
    setHataVar(false);
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
      <h2 style={{ marginTop: 0 }}>Gün Sonu Gelir Girişi</h2>

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
          <label htmlFor="gelir-tarih" style={etiketStili}>
            Tarih
          </label>

          <input
            id="gelir-tarih"
            type="date"
            value={tarih}
            onChange={(e) => setTarih(e.target.value)}
            required
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
                Bu tarihe ait kayıt mevcut. Kaydettiğinizde kayıtlar
                güncellenecek.
              </p>
            )}

            <div style={alanStili}>
              <label htmlFor="nakit-satis" style={etiketStili}>
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
                onChange={(e) => setNakitSatis(e.target.value)}
                required
                style={inputStili}
              />
            </div>

            <div style={alanStili}>
              <label htmlFor="kredi-karti-satis" style={etiketStili}>
                Kredi Kartı Satışı
              </label>

              <input
                id="kredi-karti-satis"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                placeholder="0,00"
                value={krediKartiSatis}
                onChange={(e) => setKrediKartiSatis(e.target.value)}
                required
                style={inputStili}
              />
            </div>

            <div style={alanStili}>
              <label htmlFor="banka-havalesi" style={etiketStili}>
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
                onChange={(e) => setBankaHavalesi(e.target.value)}
                required
                style={inputStili}
              />
            </div>

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
              Günlük Toplam: {paraFormatla(gunlukToplam)}
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: 12,
                background: loading ? "#94a3b8" : "#2563eb",
                color: "#ffffff",
                border: "none",
                borderRadius: 6,
                cursor: loading ? "not-allowed" : "pointer",
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