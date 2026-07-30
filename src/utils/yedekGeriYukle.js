import { supabase } from "../supabase";

const GEREKLI_TABLOLAR = [
  "cariler",
  "gelirler",
  "giderler",
  "gider_odemeleri",
  "kullanicilar",
  "loglar",
];

// Yabancı anahtar hatası oluşmaması için çocuk tablolar önce silinir.
const SILME_SIRASI = [
  "gider_odemeleri",
  "gelirler",
  "giderler",
  "loglar",
  "cariler",
  "kullanicilar",
];

// Ana tablolar önce geri yüklenir.
const EKLEME_SIRASI = [
  "kullanicilar",
  "cariler",
  "gelirler",
  "giderler",
  "gider_odemeleri",
  "loglar",
];

function yedegiDogrula(yedek) {
  if (!yedek || typeof yedek !== "object") {
    throw new Error("Geçersiz yedek dosyası.");
  }

  if (yedek.program !== "Sekafe Muhasebe") {
    throw new Error("Bu dosya Sekafe Muhasebe yedeği değil.");
  }

  if (yedek.version !== 1) {
    throw new Error(
      `Desteklenmeyen yedek sürümü: ${yedek.version ?? "Bilinmiyor"}`
    );
  }

  if (!yedek.tables || typeof yedek.tables !== "object") {
    throw new Error("Yedek dosyasında tablo bilgileri bulunamadı.");
  }

  for (const tablo of GEREKLI_TABLOLAR) {
    if (!Array.isArray(yedek.tables[tablo])) {
      throw new Error(
        `Yedek dosyasında "${tablo}" tablosu bulunamadı veya geçersiz.`
      );
    }
  }
}

async function tabloyuTemizle(tablo) {
  const { error } = await supabase
    .from(tablo)
    .delete()
    .not("id", "is", null);

  if (error) {
    throw new Error(
      `${tablo} tablosu temizlenemedi: ${error.message}`
    );
  }
}

async function kayitlariEkle(tablo, kayitlar) {
  if (!kayitlar.length) {
    return;
  }

  // Çok fazla kayıt olması durumunda parçalar hâlinde ekler.
  const parcaBoyutu = 500;

  for (let i = 0; i < kayitlar.length; i += parcaBoyutu) {
    const parca = kayitlar.slice(i, i + parcaBoyutu);

    const { error } = await supabase
      .from(tablo)
      .insert(parca);

    if (error) {
      throw new Error(
        `${tablo} tablosu geri yüklenemedi: ${error.message}`
      );
    }
  }
}

export async function yedekGeriYukle(dosya) {
  if (!dosya) {
    throw new Error("Yedek dosyası seçilmedi.");
  }

  if (!dosya.name.toLowerCase().endsWith(".skf")) {
    throw new Error("Lütfen .skf uzantılı bir yedek dosyası seçin.");
  }

  let yedek;

  try {
    const dosyaIcerigi = await dosya.text();
    yedek = JSON.parse(dosyaIcerigi);
  } catch {
    throw new Error("Yedek dosyası okunamadı veya dosya bozuk.");
  }

  yedegiDogrula(yedek);

  for (const tablo of SILME_SIRASI) {
    await tabloyuTemizle(tablo);
  }

  let toplamKayit = 0;

  for (const tablo of EKLEME_SIRASI) {
    const kayitlar = yedek.tables[tablo];

    await kayitlariEkle(tablo, kayitlar);
    toplamKayit += kayitlar.length;
  }

  return {
    dosyaAdi: dosya.name,
    toplamKayit,
    yedekTarihi: yedek.created_at,
    yedegiAlan: yedek.created_by,
  };
}