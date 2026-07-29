import { useEffect, useState } from "react";
import { supabase } from "../supabase";

export default function OdemeForm() {
  const [cariler, setCariler] = useState([]);
  const [form, setForm] = useState({
    cari_id: "",
    tarih: new Date().toISOString().split("T")[0],
    tutar: "",
    odeme_yolu: "nakit",
    aciklama: "",
  });

  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [mesaj, setMesaj] = useState("");

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
      setMesaj(`Cariler alınamadı: ${error.message}`);
      return;
    }

    setCariler(data || []);
  }

  function inputDegistir(event) {
    const { name, value } = event.target;

    setForm((onceki) => ({
      ...onceki,
      [name]: value,
    }));
  }

  async function kaydet(event) {
    event.preventDefault();
    setMesaj("");

    if (!form.cari_id) {
      setMesaj("Cari seçmelisiniz.");
      return;
    }

    const tutar = Number(form.tutar);

    if (!tutar || tutar <= 0) {
      setMesaj("Geçerli bir tutar giriniz.");
      return;
    }

    setKaydediliyor(true);

    const {
      data: { user },
      error: kullaniciHatasi,
    } = await supabase.auth.getUser();

    if (kullaniciHatasi || !user) {
      setMesaj("Oturum bilgisi alınamadı.");
      setKaydediliyor(false);
      return;
    }

    const { error } = await supabase.from("gider_odemeleri").insert([
      {
        cari_id: Number(form.cari_id),
        tarih: form.tarih,
        tutar,
        odeme_yolu: form.odeme_yolu,
        aciklama: form.aciklama.trim() || null,
        created_by: user.id,
      },
    ]);

    if (error) {
      setMesaj(`Ödeme kaydedilemedi: ${error.message}`);
      setKaydediliyor(false);
      return;
    }

    setMesaj("Ödeme başarıyla kaydedildi.");

    setForm({
      cari_id: "",
      tarih: new Date().toISOString().split("T")[0],
      tutar: "",
      odeme_yolu: "nakit",
      aciklama: "",
    });

    setKaydediliyor(false);
  }

  return (
    <div>
      <h1>Ödeme Girişi</h1>

      <form onSubmit={kaydet}>
        <div>
          <label htmlFor="cari_id">Cari</label>
          <select
            id="cari_id"
            name="cari_id"
            value={form.cari_id}
            onChange={inputDegistir}
            required
          >
            <option value="">Cari seçiniz</option>

            {cariler.map((cari) => (
              <option key={cari.id} value={cari.id}>
                {cari.cari_adi}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="tarih">Tarih</label>
          <input
            id="tarih"
            name="tarih"
            type="date"
            value={form.tarih}
            onChange={inputDegistir}
            required
          />
        </div>

        <div>
          <label htmlFor="tutar">Tutar</label>
          <input
            id="tutar"
            name="tutar"
            type="number"
            min="0.01"
            step="0.01"
            value={form.tutar}
            onChange={inputDegistir}
            placeholder="0,00"
            required
          />
        </div>

        <div>
          <label htmlFor="odeme_yolu">Ödeme Yolu</label>
          <select
            id="odeme_yolu"
            name="odeme_yolu"
            value={form.odeme_yolu}
            onChange={inputDegistir}
            required
          >
            <option value="nakit">Nakit</option>
            <option value="kredi_karti">Kredi Kartı</option>
            <option value="banka">Banka</option>
            <option value="cek">Çek</option>
          </select>
        </div>

        <div>
          <label htmlFor="aciklama">Açıklama</label>
          <textarea
            id="aciklama"
            name="aciklama"
            value={form.aciklama}
            onChange={inputDegistir}
            rows="3"
          />
        </div>

        <button type="submit" disabled={kaydediliyor}>
          {kaydediliyor ? "Kaydediliyor..." : "Ödemeyi Kaydet"}
        </button>
      </form>

      {mesaj && <p>{mesaj}</p>}
    </div>
  );
}