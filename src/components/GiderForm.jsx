import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { logEkle } from "../utils/logEkle";

export default function GiderForm() {
  const bugun = new Date().toISOString().split("T")[0];

  const [tarih, setTarih] = useState(bugun);
  const [tur, setTur] = useState("tedarikci_alimi");
  const [cariId, setCariId] = useState("");
  const [toplamTutar, setToplamTutar] = useState("");
  const [odemeDurumu, setOdemeDurumu] = useState("odenmedi");
  const [odemeYolu, setOdemeYolu] = useState("nakit");
  const [aciklama, setAciklama] = useState("");

  const [cariler, setCariler] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mesaj, setMesaj] = useState("");
  const [hataVar, setHataVar] = useState(false);

  useEffect(() => {
    carileriGetir();
  }, []);

  async function carileriGetir() {
    const { data, error } = await supabase
      .from("cariler")
      .select("id, cari_adi")
      .eq("aktif", true)
      .order("cari_adi", { ascending: true });

    if (error) {
      setMesaj(`Cari listesi alınamadı: ${error.message}`);
      setHataVar(true);
      return;
    }

    setCariler(data || []);
  }

  async function kaydet(e) {
    e.preventDefault();

    const sayisalTutar = Number(toplamTutar);
    const odendiMi = odemeDurumu === "odendi";

    setMesaj("");
    setHataVar(false);

    if (!tarih) {
      setMesaj("Tarih seçiniz.");
      setHataVar(true);
      return;
    }

    if (!toplamTutar || sayisalTutar <= 0) {
      setMesaj("Geçerli bir toplam tutar giriniz.");
      setHataVar(true);
      return;
    }

    if (!aciklama.trim()) {
      setMesaj("Açıklama giriniz.");
      setHataVar(true);
      return;
    }

    if (odendiMi && !odemeYolu) {
      setMesaj("Ödeme yolu seçiniz.");
      setHataVar(true);
      return;
    }

    setLoading(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setLoading(false);
      setMesaj("Oturum bilgisi alınamadı.");
      setHataVar(true);
      return;
    }

    /*
      Önce gider kaydı oluşturulur.
      Oluşan kaydın ID'si, ödeme başarısız olursa
      gider kaydını geri almak için kullanılır.
    */
    const { data: giderKaydi, error: giderHatasi } = await supabase
      .from("giderler")
      .insert([
        {
          tarih,
          tur,
          cari_id: cariId || null,
          toplam_tutar: sayisalTutar,
          odenen_tutar: odendiMi ? sayisalTutar : 0,
          odeme_durumu: odemeDurumu,
          aciklama: aciklama.trim(),
          aktif: true,
          created_by: user.id,
        },
      ])
      .select("id")
      .single();

    if (giderHatasi) {
      setLoading(false);
      setMesaj(`Gider kayıt hatası: ${giderHatasi.message}`);
      setHataVar(true);
      return;
    }

    /*
      Ödendi seçildiyse ayrıca gerçek para çıkışı oluşturulur.
      Kasa ve raporlar bu tablodan ödeme hareketini okuyacaktır.
    */
    if (odendiMi) {
      const { error: odemeHatasi } = await supabase
        .from("gider_odemeleri")
        .insert([
          {
            cari_id: cariId || null,
            tarih,
            tutar: sayisalTutar,
            odeme_yolu: odemeYolu,
            aciklama: aciklama.trim(),
            created_by: user.id,
          },
        ]);

      if (odemeHatasi) {
        /*
          Ödeme kaydı oluşmadıysa gideri geri silerek
          yarım ve tutarsız kayıt bırakmıyoruz.
        */
        const { error: geriAlmaHatasi } = await supabase
          .from("giderler")
          .delete()
          .eq("id", giderKaydi.id);

        setLoading(false);

        if (geriAlmaHatasi) {
          setMesaj(
            `Ödeme kaydedilemedi: ${odemeHatasi.message}. ` +
              `Ayrıca gider kaydı geri alınamadı: ${geriAlmaHatasi.message}`
          );
        } else {
          setMesaj(
            `Ödeme kaydedilemedi: ${odemeHatasi.message}. ` +
              "Gider kaydı geri alındı."
          );
        }

        setHataVar(true);
        return;
      }
    }
const secilenCari = cariler.find(
  (cari) => String(cari.id) === String(cariId)
);

await logEkle(
  odendiMi ? "Gider ve Ödeme Eklendi" : "Gider Eklendi",
  `${secilenCari?.cari_adi || "Cari seçilmedi"} - ${Number(
    toplamTutar
  ).toLocaleString("tr-TR", {
    style: "currency",
    currency: "TRY",
  })}${odendiMi ? ` - ${odemeYolu}` : ""}${
    aciklama.trim() ? ` - ${aciklama.trim()}` : ""
  }`,
  giderKaydi.id
);
    setLoading(false);

    setMesaj(
      odendiMi
        ? "Gider ve ödeme başarıyla kaydedildi."
        : "Gider başarıyla kaydedildi."
    );

    setHataVar(false);

    setTarih(bugun);
    setTur("tedarikci_alimi");
    setCariId("");
    setToplamTutar("");
    setOdemeDurumu("odenmedi");
    setOdemeYolu("nakit");
    setAciklama("");
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
      <h2 style={{ marginTop: 0 }}>Gider Ekle</h2>

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
          <label htmlFor="gider-tarih" style={etiketStili}>
            Tarih
          </label>

          <input
            id="gider-tarih"
            type="date"
            value={tarih}
            onChange={(e) => setTarih(e.target.value)}
            required
            style={inputStili}
          />
        </div>

        <div style={alanStili}>
          <label htmlFor="gider-turu" style={etiketStili}>
            Gider Türü
          </label>

          <select
            id="gider-turu"
            value={tur}
            onChange={(e) => setTur(e.target.value)}
            style={inputStili}
          >
            <option value="tedarikci_alimi">
              Tedarikçi Alımı
            </option>

            <option value="personel_maasi">
              Personel Maaşı
            </option>

            <option value="vergi">Vergi</option>

            <option value="elektrik_su_diger">
              Elektrik, Su ve Diğer
            </option>

            <option value="ekstra_harcamalar">
              Ekstra Harcamalar
            </option>
          </select>
        </div>

        <div style={alanStili}>
          <label htmlFor="gider-cari" style={etiketStili}>
            Cari
          </label>

          <select
            id="gider-cari"
            value={cariId}
            onChange={(e) => setCariId(e.target.value)}
            style={inputStili}
          >
            <option value="">Cari seçilmedi</option>

            {cariler.map((cari) => (
              <option key={cari.id} value={cari.id}>
                {cari.cari_adi}
              </option>
            ))}
          </select>
        </div>

        <div style={alanStili}>
          <label htmlFor="gider-tutar" style={etiketStili}>
            Toplam Tutar
          </label>

          <input
            id="gider-tutar"
            type="number"
            min="0.01"
            step="0.01"
            inputMode="decimal"
            placeholder="0,00"
            value={toplamTutar}
            onChange={(e) => setToplamTutar(e.target.value)}
            required
            style={inputStili}
          />
        </div>

        <div style={alanStili}>
          <label
            htmlFor="gider-odeme-durumu"
            style={etiketStili}
          >
            Ödeme Durumu
          </label>

          <select
            id="gider-odeme-durumu"
            value={odemeDurumu}
            onChange={(e) => setOdemeDurumu(e.target.value)}
            style={inputStili}
          >
            <option value="odenmedi">Ödenmedi</option>
            <option value="odendi">Ödendi</option>
          </select>
        </div>

        {odemeDurumu === "odendi" && (
          <div style={alanStili}>
            <label
              htmlFor="gider-odeme-yolu"
              style={etiketStili}
            >
              Ödeme Yolu
            </label>

            <select
              id="gider-odeme-yolu"
              value={odemeYolu}
              onChange={(e) => setOdemeYolu(e.target.value)}
              required
              style={inputStili}
            >
              <option value="nakit">Nakit</option>
              <option value="kredi_karti">Kredi Kartı</option>
              <option value="banka">Banka</option>
              <option value="cek">Çek</option>
            </select>

            <p
              style={{
                margin: "7px 0 0",
                color: "#6b7280",
                fontSize: 13,
              }}
            >
              Bu tutar kasa ve raporlarda ödeme olarak
              gösterilecektir.
            </p>
          </div>
        )}

        <div style={{ marginBottom: 20 }}>
          <label htmlFor="gider-aciklama" style={etiketStili}>
            Açıklama
          </label>

          <textarea
            id="gider-aciklama"
            rows={4}
            value={aciklama}
            onChange={(e) => setAciklama(e.target.value)}
            required
            style={{
              ...inputStili,
              resize: "vertical",
            }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: 12,
            background: loading ? "#94a3b8" : "#dc2626",
            color: "#ffffff",
            border: "none",
            borderRadius: 6,
            cursor: loading ? "not-allowed" : "pointer",
            fontSize: 16,
          }}
        >
          {loading
            ? "Kaydediliyor..."
            : odemeDurumu === "odendi"
              ? "Gideri ve Ödemeyi Kaydet"
              : "Gideri Kaydet"}
        </button>
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