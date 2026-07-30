import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase";

export default function Raporlar() {
  const bugun = tarihYaz(new Date());

  const buAyinIlkGunu = tarihYaz(
    new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1
    )
  );

  const [secilenIsletme, setSecilenIsletme] =
    useState("tumu");

  const [baslangicTarihi, setBaslangicTarihi] =
    useState(buAyinIlkGunu);

  const [bitisTarihi, setBitisTarihi] =
    useState(bugun);

  const [gelirler, setGelirler] = useState([]);
  const [giderler, setGiderler] = useState([]);
  const [odemeler, setOdemeler] = useState([]);
  const [cariler, setCariler] = useState([]);

  const [yukleniyor, setYukleniyor] =
    useState(true);

  const [mesaj, setMesaj] = useState("");

  useEffect(() => {
    raporVerileriniGetir();
  }, []);

  async function raporVerileriniGetir() {
    setYukleniyor(true);
    setMesaj("");

    const [
      gelirSonucu,
      giderSonucu,
      odemeSonucu,
      cariSonucu,
    ] = await Promise.all([
      supabase
        .from("gelirler")
        .select(`
          id,
          tarih,
          isletme,
          tur,
          tutar,
          kart_1_tutar,
          kart_2_tutar
        `),

      supabase
        .from("giderler")
        .select(`
          id,
          tarih,
          tur,
          cari_id,
          toplam_tutar,
          aciklama,
          aktif
        `)
        .eq("aktif", true),

      supabase
        .from("gider_odemeleri")
        .select(`
          id,
          tarih,
          cari_id,
          tutar,
          odeme_yolu,
          aciklama
        `),

      supabase
        .from("cariler")
        .select(`
          id,
          cari_adi,
          telefon,
          aktif
        `),
    ]);

    if (gelirSonucu.error) {
      setMesaj(
        `Gelirler alınamadı: ${gelirSonucu.error.message}`
      );
      setYukleniyor(false);
      return;
    }

    if (giderSonucu.error) {
      setMesaj(
        `Giderler alınamadı: ${giderSonucu.error.message}`
      );
      setYukleniyor(false);
      return;
    }

    if (odemeSonucu.error) {
      setMesaj(
        `Ödemeler alınamadı: ${odemeSonucu.error.message}`
      );
      setYukleniyor(false);
      return;
    }

    if (cariSonucu.error) {
      setMesaj(
        `Cariler alınamadı: ${cariSonucu.error.message}`
      );
      setYukleniyor(false);
      return;
    }

    setGelirler(gelirSonucu.data || []);
    setGiderler(giderSonucu.data || []);
    setOdemeler(odemeSonucu.data || []);
    setCariler(cariSonucu.data || []);

    setYukleniyor(false);
  }

  function tarihAraligindaMi(tarih) {
    if (!tarih) {
      return false;
    }

    if (
      baslangicTarihi &&
      tarih < baslangicTarihi
    ) {
      return false;
    }

    if (
      bitisTarihi &&
      tarih > bitisTarihi
    ) {
      return false;
    }

    return true;
  }

  const filtreliGelirler = useMemo(() => {
    return gelirler.filter((gelir) => {
      const tarihUygun =
        tarihAraligindaMi(gelir.tarih);

      const isletmeUygun =
        secilenIsletme === "tumu" ||
        gelir.isletme === secilenIsletme;

      return tarihUygun && isletmeUygun;
    });
  }, [
    gelirler,
    secilenIsletme,
    baslangicTarihi,
    bitisTarihi,
  ]);

  /*
    Bütün giderler Cafe'ye aittir.

    Büfe seçildiğinde gider bulunmaz.
    Tümü veya Cafe seçildiğinde tarih filtresine
    uygun bütün giderler kullanılır.
  */
  const filtreliGiderler = useMemo(() => {
    if (secilenIsletme === "bufe") {
      return [];
    }

    return giderler.filter((gider) =>
      tarihAraligindaMi(gider.tarih)
    );
  }, [
    giderler,
    secilenIsletme,
    baslangicTarihi,
    bitisTarihi,
  ]);

  /*
    Bütün ödemeler Cafe'ye aittir.

    Büfe seçildiğinde ödeme bulunmaz.
    Tümü veya Cafe seçildiğinde tarih filtresine
    uygun bütün ödemeler kullanılır.
  */
  const filtreliOdemeler = useMemo(() => {
    if (secilenIsletme === "bufe") {
      return [];
    }

    return odemeler.filter((odeme) =>
      tarihAraligindaMi(odeme.tarih)
    );
  }, [
    odemeler,
    secilenIsletme,
    baslangicTarihi,
    bitisTarihi,
  ]);

  const gelirDagilimi = useMemo(() => {
    const sonuc = {
      nakit_satis: 0,
      kredi_karti_satis: 0,
      banka_havalesi: 0,
    };

    for (const gelir of filtreliGelirler) {
      const tutar = Number(gelir.tutar || 0);

      if (sonuc[gelir.tur] === undefined) {
        sonuc[gelir.tur] = 0;
      }

      sonuc[gelir.tur] += tutar;
    }

    return sonuc;
  }, [filtreliGelirler]);

  const giderDagilimi = useMemo(() => {
    const sonuc = {};

    for (const gider of filtreliGiderler) {
      const tutar = Number(
        gider.toplam_tutar || 0
      );

      sonuc[gider.tur] =
        (sonuc[gider.tur] || 0) + tutar;
    }

    return Object.entries(sonuc)
      .map(([tur, tutar]) => ({
        tur,
        tutar,
      }))
      .sort((a, b) => b.tutar - a.tutar);
  }, [filtreliGiderler]);

  const toplamGelir = useMemo(() => {
    return filtreliGelirler.reduce(
      (toplam, gelir) =>
        toplam + Number(gelir.tutar || 0),
      0
    );
  }, [filtreliGelirler]);

  const toplamGider = useMemo(() => {
    return filtreliGiderler.reduce(
      (toplam, gider) =>
        toplam +
        Number(gider.toplam_tutar || 0),
      0
    );
  }, [filtreliGiderler]);

  const toplamOdeme = useMemo(() => {
    return filtreliOdemeler.reduce(
      (toplam, odeme) =>
        toplam + Number(odeme.tutar || 0),
      0
    );
  }, [filtreliOdemeler]);

  /*
    Kâr / zarar hesabında gider kullanılır.

    Yapılan ödeme ayrıca gider değildir.
    Aynı tutarı ikinci kez düşmemek gerekir.
  */
  const karZarar =
    toplamGelir - toplamGider;

  /*
    Kasa net hareketinde yapılan ödeme kullanılır.
  */
  const kasaNetHareketi =
    toplamGelir - toplamOdeme;

  /*
    Cari borçları tüm zamanlar üzerinden hesaplanır.

    Bu alan yalnızca Tümü ve Cafe seçiminde
    gösterilir. Büfede cari ve borç yoktur.
  */
  const cariBakiyeleri = useMemo(() => {
    if (secilenIsletme === "bufe") {
      return [];
    }

    const cariHaritasi = {};

    for (const cari of cariler) {
      cariHaritasi[cari.id] = {
        id: cari.id,
        cari_adi: cari.cari_adi,
        telefon: cari.telefon,
        aktif: cari.aktif,
        toplamGider: 0,
        toplamOdeme: 0,
        kalanBakiye: 0,
      };
    }

    for (const gider of giderler) {
      if (!gider.cari_id) {
        continue;
      }

      if (!cariHaritasi[gider.cari_id]) {
        continue;
      }

      cariHaritasi[
        gider.cari_id
      ].toplamGider += Number(
        gider.toplam_tutar || 0
      );
    }

    for (const odeme of odemeler) {
      if (!odeme.cari_id) {
        continue;
      }

      if (!cariHaritasi[odeme.cari_id]) {
        continue;
      }

      cariHaritasi[
        odeme.cari_id
      ].toplamOdeme += Number(
        odeme.tutar || 0
      );
    }

    return Object.values(cariHaritasi)
      .map((cari) => ({
        ...cari,
        kalanBakiye:
          cari.toplamGider -
          cari.toplamOdeme,
      }))
      .filter(
        (cari) =>
          Math.abs(cari.kalanBakiye) >= 0.01
      )
      .sort(
        (a, b) =>
          b.kalanBakiye - a.kalanBakiye
      );
  }, [
    cariler,
    giderler,
    odemeler,
    secilenIsletme,
  ]);

  const toplamCariBorcu = useMemo(() => {
    return cariBakiyeleri.reduce(
      (toplam, cari) => {
        if (cari.kalanBakiye <= 0) {
          return toplam;
        }

        return toplam + cari.kalanBakiye;
      },
      0
    );
  }, [cariBakiyeleri]);

  const gunlukOzet = useMemo(() => {
    const gunler = {};

    function gunOlustur(tarih) {
      if (!gunler[tarih]) {
        gunler[tarih] = {
          tarih,
          nakit: 0,
          krediKarti: 0,
          bankaHavalesi: 0,
          toplamGelir: 0,
          toplamGider: 0,
          toplamOdeme: 0,
          karZarar: 0,
          kasaNet: 0,
        };
      }

      return gunler[tarih];
    }

    for (const gelir of filtreliGelirler) {
      const gun = gunOlustur(gelir.tarih);
      const tutar = Number(gelir.tutar || 0);

      if (gelir.tur === "nakit_satis") {
        gun.nakit += tutar;
      }

      if (
        gelir.tur === "kredi_karti_satis"
      ) {
        gun.krediKarti += tutar;
      }

      if (
        gelir.tur === "banka_havalesi"
      ) {
        gun.bankaHavalesi += tutar;
      }

      gun.toplamGelir += tutar;
    }

    for (const gider of filtreliGiderler) {
      const gun = gunOlustur(gider.tarih);

      gun.toplamGider += Number(
        gider.toplam_tutar || 0
      );
    }

    for (const odeme of filtreliOdemeler) {
      const gun = gunOlustur(odeme.tarih);

      gun.toplamOdeme += Number(
        odeme.tutar || 0
      );
    }

    return Object.values(gunler)
      .map((gun) => ({
        ...gun,

        karZarar:
          gun.toplamGelir -
          gun.toplamGider,

        kasaNet:
          gun.toplamGelir -
          gun.toplamOdeme,
      }))
      .sort((a, b) =>
        b.tarih.localeCompare(a.tarih)
      );
  }, [
    filtreliGelirler,
    filtreliGiderler,
    filtreliOdemeler,
  ]);

  function bugunuSec() {
    setBaslangicTarihi(bugun);
    setBitisTarihi(bugun);
  }

  function buHaftayiSec() {
    const simdi = new Date();
    const gun = simdi.getDay();

    const pazartesiFarki =
      gun === 0 ? -6 : 1 - gun;

    const pazartesi = new Date(simdi);

    pazartesi.setDate(
      simdi.getDate() + pazartesiFarki
    );

    setBaslangicTarihi(
      tarihYaz(pazartesi)
    );

    setBitisTarihi(bugun);
  }

  function buAyiSec() {
    const simdi = new Date();

    setBaslangicTarihi(
      tarihYaz(
        new Date(
          simdi.getFullYear(),
          simdi.getMonth(),
          1
        )
      )
    );

    setBitisTarihi(bugun);
  }

  function gecenAyiSec() {
    const simdi = new Date();

    const ilkGun = new Date(
      simdi.getFullYear(),
      simdi.getMonth() - 1,
      1
    );

    const sonGun = new Date(
      simdi.getFullYear(),
      simdi.getMonth(),
      0
    );

    setBaslangicTarihi(
      tarihYaz(ilkGun)
    );

    setBitisTarihi(
      tarihYaz(sonGun)
    );
  }

  function buYiliSec() {
    const simdi = new Date();

    setBaslangicTarihi(
      tarihYaz(
        new Date(
          simdi.getFullYear(),
          0,
          1
        )
      )
    );

    setBitisTarihi(bugun);
  }

  function tumZamanlariSec() {
    setBaslangicTarihi("");
    setBitisTarihi("");
  }

  function paraFormatla(tutar) {
    return Number(
      tutar || 0
    ).toLocaleString("tr-TR", {
      style: "currency",
      currency: "TRY",
    });
  }

  function yuzdeHesapla(tutar, toplam) {
    if (!toplam) {
      return "%0";
    }

    return `%${(
      (Number(tutar || 0) / toplam) *
      100
    ).toLocaleString("tr-TR", {
      maximumFractionDigits: 1,
    })}`;
  }

  function secilenIsletmeYaz() {
    if (secilenIsletme === "cafe") {
      return "Cafe";
    }

    if (secilenIsletme === "bufe") {
      return "Büfe";
    }

    return "Tüm İşletmeler";
  }

  return (
    <div>
      <h1>Raporlar</h1>

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

      <div style={filtreKutusuStili}>
        <div>
          <label
            htmlFor="rapor-isletme"
            style={etiketStili}
          >
            İşletme
          </label>

          <select
            id="rapor-isletme"
            value={secilenIsletme}
            onChange={(event) =>
              setSecilenIsletme(
                event.target.value
              )
            }
            style={inputStili}
          >
            <option value="tumu">
              Tümü
            </option>

            <option value="cafe">
              Cafe
            </option>

            <option value="bufe">
              Büfe
            </option>
          </select>
        </div>

        <div>
          <label
            htmlFor="rapor-baslangic"
            style={etiketStili}
          >
            Başlangıç Tarihi
          </label>

          <input
            id="rapor-baslangic"
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
            htmlFor="rapor-bitis"
            style={etiketStili}
          >
            Bitiş Tarihi
          </label>

          <input
            id="rapor-bitis"
            type="date"
            value={bitisTarihi}
            onChange={(event) =>
              setBitisTarihi(
                event.target.value
              )
            }
            style={inputStili}
          />
        </div>

        <button
          type="button"
          onClick={bugunuSec}
        >
          Bugün
        </button>

        <button
          type="button"
          onClick={buHaftayiSec}
        >
          Bu Hafta
        </button>

        <button
          type="button"
          onClick={buAyiSec}
        >
          Bu Ay
        </button>

        <button
          type="button"
          onClick={gecenAyiSec}
        >
          Geçen Ay
        </button>

        <button
          type="button"
          onClick={buYiliSec}
        >
          Bu Yıl
        </button>

        <button
          type="button"
          onClick={tumZamanlariSec}
        >
          Tüm Zamanlar
        </button>
      </div>

      <div
        style={{
          marginBottom: 20,
          color: "#6b7280",
          fontSize: 14,
        }}
      >
        Gösterilen rapor:{" "}
        <strong>
          {secilenIsletmeYaz()}
        </strong>
      </div>

      {yukleniyor ? (
        <p>Rapor hazırlanıyor...</p>
      ) : (
        <>
          <div style={kartAlaniStili}>
            <OzetKarti
              baslik="Toplam Gelir"
              tutar={paraFormatla(
                toplamGelir
              )}
            />

            {secilenIsletme !== "bufe" && (
              <OzetKarti
                baslik="Toplam Gider"
                tutar={paraFormatla(
                  toplamGider
                )}
              />
            )}

            {secilenIsletme !== "bufe" && (
              <OzetKarti
                baslik="Yapılan Ödeme"
                tutar={paraFormatla(
                  toplamOdeme
                )}
              />
            )}

            <OzetKarti
              baslik="Kâr / Zarar"
              tutar={paraFormatla(
                karZarar
              )}
              durum={
                karZarar > 0
                  ? "pozitif"
                  : karZarar < 0
                    ? "negatif"
                    : "normal"
              }
            />

            <OzetKarti
              baslik="Kasa Net Hareketi"
              tutar={paraFormatla(
                kasaNetHareketi
              )}
              durum={
                kasaNetHareketi > 0
                  ? "pozitif"
                  : kasaNetHareketi < 0
                    ? "negatif"
                    : "normal"
              }
            />

            {secilenIsletme !== "bufe" && (
              <OzetKarti
                baslik="Güncel Cari Borcu"
                tutar={paraFormatla(
                  toplamCariBorcu
                )}
                altYazi="Tüm zamanlar"
              />
            )}
          </div>

          <div
            style={
              secilenIsletme === "bufe"
                ? tekKolonStili
                : ikiKolonStili
            }
          >
            <RaporKutusu baslik="Gelir Dağılımı">
              <DagilimSatiri
                baslik="Nakit Satış"
                tutar={
                  gelirDagilimi.nakit_satis
                }
                toplam={toplamGelir}
                paraFormatla={paraFormatla}
                yuzdeHesapla={yuzdeHesapla}
              />

              <DagilimSatiri
                baslik="Kredi Kartı Satışı"
                tutar={
                  gelirDagilimi
                    .kredi_karti_satis
                }
                toplam={toplamGelir}
                paraFormatla={paraFormatla}
                yuzdeHesapla={yuzdeHesapla}
              />

              {secilenIsletme !== "bufe" && (
                <DagilimSatiri
                  baslik="Banka Havalesi"
                  tutar={
                    gelirDagilimi
                      .banka_havalesi
                  }
                  toplam={toplamGelir}
                  paraFormatla={
                    paraFormatla
                  }
                  yuzdeHesapla={
                    yuzdeHesapla
                  }
                />
              )}

              <div style={toplamSatiriStili}>
                <strong>Toplam</strong>

                <strong>
                  {paraFormatla(
                    toplamGelir
                  )}
                </strong>

                <strong>
                  {toplamGelir > 0
                    ? "%100"
                    : "%0"}
                </strong>
              </div>
            </RaporKutusu>

            {secilenIsletme !== "bufe" && (
              <RaporKutusu baslik="Gider Dağılımı">
                {giderDagilimi.length ===
                0 ? (
                  <p>
                    Seçilen dönemde gider
                    bulunamadı.
                  </p>
                ) : (
                  giderDagilimi.map(
                    (gider) => (
                      <DagilimSatiri
                        key={gider.tur}
                        baslik={giderTuruYaz(
                          gider.tur
                        )}
                        tutar={gider.tutar}
                        toplam={toplamGider}
                        paraFormatla={
                          paraFormatla
                        }
                        yuzdeHesapla={
                          yuzdeHesapla
                        }
                      />
                    )
                  )
                )}

                <div
                  style={toplamSatiriStili}
                >
                  <strong>Toplam</strong>

                  <strong>
                    {paraFormatla(
                      toplamGider
                    )}
                  </strong>

                  <strong>
                    {toplamGider > 0
                      ? "%100"
                      : "%0"}
                  </strong>
                </div>
              </RaporKutusu>
            )}
          </div>

          {secilenIsletme !== "bufe" && (
            <RaporKutusu baslik="Borçlu Cariler">
              <div
                style={{
                  overflowX: "auto",
                }}
              >
                <table style={tabloStili}>
                  <thead>
                    <tr>
                      <th style={hucreStili}>
                        Cari
                      </th>

                      <th style={hucreStili}>
                        Toplam Gider
                      </th>

                      <th style={hucreStili}>
                        Toplam Ödeme
                      </th>

                      <th style={hucreStili}>
                        Kalan Bakiye
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {cariBakiyeleri.length ===
                    0 ? (
                      <tr>
                        <td
                          style={hucreStili}
                          colSpan="4"
                        >
                          Borç bakiyesi bulunan
                          cari yok.
                        </td>
                      </tr>
                    ) : (
                      cariBakiyeleri.map(
                        (cari) => (
                          <tr key={cari.id}>
                            <td
                              style={
                                hucreStili
                              }
                            >
                              {
                                cari.cari_adi
                              }
                            </td>

                            <td
                              style={
                                hucreStili
                              }
                            >
                              {paraFormatla(
                                cari.toplamGider
                              )}
                            </td>

                            <td
                              style={
                                hucreStili
                              }
                            >
                              {paraFormatla(
                                cari.toplamOdeme
                              )}
                            </td>

                            <td
                              style={
                                hucreStili
                              }
                            >
                              {paraFormatla(
                                cari.kalanBakiye
                              )}
                            </td>
                          </tr>
                        )
                      )
                    )}
                  </tbody>

                  <tfoot>
                    <tr>
                      <th
                        style={
                          toplamHucreStili
                        }
                        colSpan="3"
                      >
                        TOPLAM CARİ BORCU
                      </th>

                      <th
                        style={
                          toplamHucreStili
                        }
                      >
                        {paraFormatla(
                          toplamCariBorcu
                        )}
                      </th>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </RaporKutusu>
          )}

          <RaporKutusu baslik="Günlük Özet">
            <div
              style={{
                overflowX: "auto",
              }}
            >
              <table style={tabloStili}>
                <thead>
                  <tr>
                    <th style={hucreStili}>
                      Tarih
                    </th>

                    <th style={hucreStili}>
                      Nakit
                    </th>

                    <th style={hucreStili}>
                      Kredi Kartı
                    </th>

                    {secilenIsletme !==
                      "bufe" && (
                      <th style={hucreStili}>
                        Havale
                      </th>
                    )}

                    <th style={hucreStili}>
                      Toplam Gelir
                    </th>

                    {secilenIsletme !==
                      "bufe" && (
                      <th style={hucreStili}>
                        Gider
                      </th>
                    )}

                    {secilenIsletme !==
                      "bufe" && (
                      <th style={hucreStili}>
                        Ödeme
                      </th>
                    )}

                    <th style={hucreStili}>
                      Kâr / Zarar
                    </th>

                    <th style={hucreStili}>
                      Kasa Net
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {gunlukOzet.length === 0 ? (
                    <tr>
                      <td
                        style={hucreStili}
                        colSpan={
                          secilenIsletme ===
                          "bufe"
                            ? "6"
                            : "9"
                        }
                      >
                        Seçilen filtrelere uygun
                        kayıt bulunamadı.
                      </td>
                    </tr>
                  ) : (
                    gunlukOzet.map((gun) => (
                      <tr key={gun.tarih}>
                        <td style={hucreStili}>
                          {tarihFormatla(
                            gun.tarih
                          )}
                        </td>

                        <td style={hucreStili}>
                          {paraFormatla(
                            gun.nakit
                          )}
                        </td>

                        <td style={hucreStili}>
                          {paraFormatla(
                            gun.krediKarti
                          )}
                        </td>

                        {secilenIsletme !==
                          "bufe" && (
                          <td
                            style={hucreStili}
                          >
                            {paraFormatla(
                              gun.bankaHavalesi
                            )}
                          </td>
                        )}

                        <td style={hucreStili}>
                          {gun.toplamGelir ===
                          0 ? (
                            <span
                              style={{
                                color:
                                  "#dc2626",
                                fontWeight: 600,
                              }}
                            >
                              Gelir girilmemiş
                            </span>
                          ) : (
                            paraFormatla(
                              gun.toplamGelir
                            )
                          )}
                        </td>

                        {secilenIsletme !==
                          "bufe" && (
                          <td
                            style={hucreStili}
                          >
                            {paraFormatla(
                              gun.toplamGider
                            )}
                          </td>
                        )}

                        {secilenIsletme !==
                          "bufe" && (
                          <td
                            style={hucreStili}
                          >
                            {paraFormatla(
                              gun.toplamOdeme
                            )}
                          </td>
                        )}

                        <td
                          style={{
                            ...hucreStili,
                            fontWeight: 600,
                            color:
                              gun.karZarar < 0
                                ? "#dc2626"
                                : gun.karZarar >
                                    0
                                  ? "#059669"
                                  : "inherit",
                          }}
                        >
                          {paraFormatla(
                            gun.karZarar
                          )}
                        </td>

                        <td
                          style={{
                            ...hucreStili,
                            fontWeight: 600,
                            color:
                              gun.kasaNet < 0
                                ? "#dc2626"
                                : gun.kasaNet >
                                    0
                                  ? "#059669"
                                  : "inherit",
                          }}
                        >
                          {paraFormatla(
                            gun.kasaNet
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>

                <tfoot>
                  <tr>
                    <th
                      style={toplamHucreStili}
                    >
                      TOPLAM
                    </th>

                    <th
                      style={toplamHucreStili}
                    >
                      {paraFormatla(
                        gelirDagilimi
                          .nakit_satis
                      )}
                    </th>

                    <th
                      style={toplamHucreStili}
                    >
                      {paraFormatla(
                        gelirDagilimi
                          .kredi_karti_satis
                      )}
                    </th>

                    {secilenIsletme !==
                      "bufe" && (
                      <th
                        style={
                          toplamHucreStili
                        }
                      >
                        {paraFormatla(
                          gelirDagilimi
                            .banka_havalesi
                        )}
                      </th>
                    )}

                    <th
                      style={toplamHucreStili}
                    >
                      {paraFormatla(
                        toplamGelir
                      )}
                    </th>

                    {secilenIsletme !==
                      "bufe" && (
                      <th
                        style={
                          toplamHucreStili
                        }
                      >
                        {paraFormatla(
                          toplamGider
                        )}
                      </th>
                    )}

                    {secilenIsletme !==
                      "bufe" && (
                      <th
                        style={
                          toplamHucreStili
                        }
                      >
                        {paraFormatla(
                          toplamOdeme
                        )}
                      </th>
                    )}

                    <th
                      style={toplamHucreStili}
                    >
                      {paraFormatla(
                        karZarar
                      )}
                    </th>

                    <th
                      style={toplamHucreStili}
                    >
                      {paraFormatla(
                        kasaNetHareketi
                      )}
                    </th>
                  </tr>
                </tfoot>
              </table>
            </div>
          </RaporKutusu>
        </>
      )}
    </div>
  );
}

function OzetKarti({
  baslik,
  tutar,
  altYazi,
  durum = "normal",
}) {
  let renk = "#111827";

  if (durum === "pozitif") {
    renk = "#059669";
  }

  if (durum === "negatif") {
    renk = "#dc2626";
  }

  return (
    <div style={ozetKartiStili}>
      <div
        style={{
          color: "#6b7280",
          fontSize: 14,
          marginBottom: 8,
        }}
      >
        {baslik}
      </div>

      <div
        style={{
          color: renk,
          fontSize: 22,
          fontWeight: 700,
        }}
      >
        {tutar}
      </div>

      {altYazi && (
        <div
          style={{
            color: "#9ca3af",
            fontSize: 12,
            marginTop: 6,
          }}
        >
          {altYazi}
        </div>
      )}
    </div>
  );
}

function RaporKutusu({
  baslik,
  children,
}) {
  return (
    <section style={raporKutusuStili}>
      <h2
        style={{
          marginTop: 0,
          marginBottom: 18,
        }}
      >
        {baslik}
      </h2>

      {children}
    </section>
  );
}

function DagilimSatiri({
  baslik,
  tutar,
  toplam,
  paraFormatla,
  yuzdeHesapla,
}) {
  return (
    <div style={dagilimSatiriStili}>
      <span>{baslik}</span>

      <strong>
        {paraFormatla(tutar)}
      </strong>

      <span>
        {yuzdeHesapla(tutar, toplam)}
      </span>
    </div>
  );
}

function tarihYaz(tarih) {
  const yil = tarih.getFullYear();

  const ay = String(
    tarih.getMonth() + 1
  ).padStart(2, "0");

  const gun = String(
    tarih.getDate()
  ).padStart(2, "0");

  return `${yil}-${ay}-${gun}`;
}

function tarihFormatla(tarih) {
  if (!tarih) {
    return "-";
  }

  return new Date(
    `${tarih}T00:00:00`
  ).toLocaleDateString("tr-TR");
}

function giderTuruYaz(tur) {
  const turler = {
    tedarikci_alimi:
      "Tedarikçi Alımı",

    personel_maasi:
      "Personel Maaşı",

    vergi:
      "Vergi",

    elektrik_su_diger:
      "Elektrik, Su ve Diğer",

    ekstra_harcamalar:
      "Ekstra Harcamalar",
  };

  return turler[tur] || tur;
}

const filtreKutusuStili = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "end",
  gap: 10,
  marginBottom: 25,
  padding: 15,
  background: "#ffffff",
  border: "1px solid #d1d5db",
  borderRadius: 10,
};

const etiketStili = {
  display: "block",
  marginBottom: 5,
};

const inputStili = {
  padding: 9,
  boxSizing: "border-box",
  minWidth: 150,
};

const kartAlaniStili = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(190px, 1fr))",
  gap: 15,
  marginBottom: 25,
};

const ozetKartiStili = {
  background: "#ffffff",
  color: "#111827",
  padding: 18,
  borderRadius: 10,
  border: "1px solid #d1d5db",
};

const ikiKolonStili = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(320px, 1fr))",
  gap: 20,
};

const tekKolonStili = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: 20,
};

const raporKutusuStili = {
  marginBottom: 25,
  padding: 20,
  background: "#ffffff",
  color: "#111827",
  borderRadius: 10,
  border: "1px solid #d1d5db",
};

const dagilimSatiriStili = {
  display: "grid",
  gridTemplateColumns:
    "1fr auto 60px",
  gap: 12,
  padding: "10px 0",
  borderBottom: "1px solid #e5e7eb",
};

const toplamSatiriStili = {
  display: "grid",
  gridTemplateColumns:
    "1fr auto 60px",
  gap: 12,
  paddingTop: 14,
};

const tabloStili = {
  width: "100%",
  borderCollapse: "collapse",
};

const hucreStili = {
  padding: 10,
  border: "1px solid #d1d5db",
  textAlign: "left",
  whiteSpace: "nowrap",
};

const toplamHucreStili = {
  padding: 12,
  border: "1px solid #9ca3af",
  textAlign: "left",
  fontWeight: 700,
  whiteSpace: "nowrap",
};