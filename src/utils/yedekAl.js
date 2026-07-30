import { supabase } from "../supabase";

export async function yedekAl(kullaniciAdi = "Bilinmiyor") {
  const tablolar = [
    "cariler",
    "gelirler",
    "giderler",
    "gider_odemeleri",
    "kullanicilar",
    "loglar",
  ];

  const yedekTablolari = {};

  for (const tablo of tablolar) {
    const { data, error } = await supabase
      .from(tablo)
      .select("*");

    if (error) {
      throw new Error(
        `${tablo} tablosu yedeklenemedi: ${error.message}`
      );
    }

    yedekTablolari[tablo] = data || [];
  }

  const simdi = new Date();

  const yedek = {
    version: 1,
    program: "Sekafe Muhasebe",
    created_at: simdi.toISOString(),
    created_by: kullaniciAdi,
    tables: yedekTablolari,
  };

  const dosyaIcerigi = JSON.stringify(yedek, null, 2);

  const blob = new Blob([dosyaIcerigi], {
    type: "application/json;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);

  const tarih = simdi.toLocaleDateString("sv-SE");
  const saat = simdi
    .toLocaleTimeString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
    .replaceAll(":", "-");

  const dosyaAdi = `sekafe-backup-${tarih}_${saat}.skf`;

  const link = document.createElement("a");

  link.href = url;
  link.download = dosyaAdi;

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);

  return {
    dosyaAdi,
    tabloSayisi: tablolar.length,
    kayitSayisi: Object.values(yedekTablolari).reduce(
      (toplam, kayitlar) => toplam + kayitlar.length,
      0
    ),
  };
}