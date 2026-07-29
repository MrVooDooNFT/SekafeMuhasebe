import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase";
import CariDetay from "./CariDetay";

export default function CariForm() {
  const [cariler, setCariler] = useState([]);
  const [secilenCari, setSecilenCari] = useState(null);

  const [form, setForm] = useState({
    cari_adi: "",
    telefon: "",
    notlar: "",
  });

  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [mesaj, setMesaj] = useState("");

  useEffect(() => {
    carileriGetir();
  }, []);

  async function carileriGetir() {
    const { data: cariData, error: cariError } = await supabase
      .from("cariler")
      .select("id, cari_adi, telefon, notlar, aktif")
      .eq("aktif", true)
      .order("cari_adi", { ascending: true });

    if (cariError) {
      setMesaj(`Cariler alınamadı: ${cariError.message}`);
      return;
    }

    const { data: giderData, error: giderError } = await supabase
      .from("giderler")
      .select("cari_id, toplam_tutar")
      .eq("aktif", true);

    if (giderError) {
      setMesaj(`Giderler alınamadı: ${giderError.message}`);
      return;
    }

    const { data: odemeData, error: odemeError } = await supabase
      .from("gider_odemeleri")
      .select("cari_id, tutar");

    if (odemeError) {
      setMesaj(`Ödemeler alınamadı: ${odemeError.message}`);
      return;
    }

    const giderToplamlari = {};
    const odemeToplamlari = {};

    for (const gider of giderData || []) {
      if (!gider.cari_id) continue;

      giderToplamlari[gider.cari_id] =
        (giderToplamlari[gider.cari_id] || 0) +
        Number(gider.toplam_tutar || 0);
    }

    for (const odeme of odemeData || []) {
      if (!odeme.cari_id) continue;

      odemeToplamlari[odeme.cari_id] =
        (odemeToplamlari[odeme.cari_id] || 0) +
        Number(odeme.tutar || 0);
    }

    const sonuc = (cariData || []).map((cari) => {
      const toplamGider = giderToplamlari[cari.id] || 0;
      const toplamOdeme = odemeToplamlari[cari.id] || 0;

      return {
        ...cari,
        toplamGider,
        toplamOdeme,
        kalanBakiye: toplamGider - toplamOdeme,
      };
    });

    setCariler(sonuc);

    setSecilenCari((oncekiCari) => {
      if (!oncekiCari) return null;

      return (
        sonuc.find((cari) => cari.id === oncekiCari.id) ||
        oncekiCari
      );
    });
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

    if (!form.cari_adi.trim()) {
      setMesaj("Cari adı zorunludur.");
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

    const { error } = await supabase.from("cariler").insert([
      {
        cari_adi: form.cari_adi.trim(),
        telefon: form.telefon.trim() || null,
        notlar: form.notlar.trim() || null,
        aktif: true,
        created_by: user.id,
      },
    ]);

    if (error) {
      setMesaj(`Cari kaydedilemedi: ${error.message}`);
      setKaydediliyor(false);
      return;
    }

    setForm({
      cari_adi: "",
      telefon: "",
      notlar: "",
    });

    setKaydediliyor(false);
    setMesaj("Cari başarıyla kaydedildi.");

    await carileriGetir();
  }

  const tumGiderler = useMemo(() => {
    return cariler.reduce(
      (toplam, cari) => toplam + cari.toplamGider,
      0
    );
  }, [cariler]);

  const tumOdemeler = useMemo(() => {
    return cariler.reduce(
      (toplam, cari) => toplam + cari.toplamOdeme,
      0
    );
  }, [cariler]);

  const tumKalan = tumGiderler - tumOdemeler;

  function paraFormatla(tutar) {
    return Number(tutar || 0).toLocaleString("tr-TR", {
      style: "currency",
      currency: "TRY",
    });
  }

  if (secilenCari) {
    return (
      <CariDetay
        cari={secilenCari}
        onGeriDon={() => {
          setSecilenCari(null);
          setMesaj("");
        }}
        onDegisiklik={carileriGetir}
      />
    );
  }

  return (
    <div>
      <h1>Cariler</h1>

      <form onSubmit={kaydet} style={{ marginBottom: 30 }}>
        <div>
          <label htmlFor="cari_adi">Cari Adı</label>

          <input
            id="cari_adi"
            name="cari_adi"
            type="text"
            value={form.cari_adi}
            onChange={inputDegistir}
            required
          />
        </div>

        <div>
          <label htmlFor="telefon">Telefon</label>

          <input
            id="telefon"
            name="telefon"
            type="text"
            value={form.telefon}
            onChange={inputDegistir}
          />
        </div>

        <div>
          <label htmlFor="notlar">Notlar</label>

          <textarea
            id="notlar"
            name="notlar"
            value={form.notlar}
            onChange={inputDegistir}
            rows="3"
          />
        </div>

        <button type="submit" disabled={kaydediliyor}>
          {kaydediliyor ? "Kaydediliyor..." : "Cari Ekle"}
        </button>
      </form>

      {mesaj && <p>{mesaj}</p>}

      <h2>Cari Listesi</h2>

      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
          }}
        >
          <thead>
            <tr>
              <th style={hucreStili}>Cari</th>
              <th style={hucreStili}>Telefon</th>
              <th style={hucreStili}>Toplam Borç</th>
              <th style={hucreStili}>Toplam Ödeme</th>
              <th style={hucreStili}>Kalan Bakiye</th>
            </tr>
          </thead>

          <tbody>
            {cariler.length === 0 ? (
              <tr>
                <td style={hucreStili} colSpan="5">
                  Kayıtlı cari bulunamadı.
                </td>
              </tr>
            ) : (
              cariler.map((cari) => (
                <tr key={cari.id}>
                  <td style={hucreStili}>
                    <button
                      type="button"
                      onClick={() => setSecilenCari(cari)}
                      style={{
                        border: "none",
                        background: "none",
                        padding: 0,
                        cursor: "pointer",
                        textDecoration: "underline",
                        font: "inherit",
                      }}
                    >
                      {cari.cari_adi}
                    </button>
                  </td>

                  <td style={hucreStili}>
                    {cari.telefon || "-"}
                  </td>

                  <td style={hucreStili}>
                    {paraFormatla(cari.toplamGider)}
                  </td>

                  <td style={hucreStili}>
                    {paraFormatla(cari.toplamOdeme)}
                  </td>

                  <td style={hucreStili}>
                    {paraFormatla(cari.kalanBakiye)}
                  </td>
                </tr>
              ))
            )}
          </tbody>

          <tfoot>
            <tr>
              <th style={toplamHucreStili} colSpan="2">
                TÜM CARİLER
              </th>

              <th style={toplamHucreStili}>
                {paraFormatla(tumGiderler)}
              </th>

              <th style={toplamHucreStili}>
                {paraFormatla(tumOdemeler)}
              </th>

              <th style={toplamHucreStili}>
                {paraFormatla(tumKalan)}
              </th>
            </tr>
          </tfoot>
        </table>
      </div>
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