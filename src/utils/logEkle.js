import { supabase } from "../supabase";

export async function logEkle(islem, aciklama = "", kayitId = null) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data: kullanici } = await supabase
      .from("kullanicilar")
      .select("kullanici_adi")
      .eq("id", user.id)
      .single();

    await supabase.from("loglar").insert({
      kullanici_id: user.id,
      kullanici: kullanici?.kullanici_adi || "Bilinmiyor",
      islem,
      aciklama,
      kayit_id: kayitId,
    });
  } catch (err) {
    console.error("Log yazılamadı:", err);
  }
}