import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceRoleKey = Deno.env.get(
      "SUPABASE_SERVICE_ROLE_KEY"
    );

    if (
      !supabaseUrl ||
      !supabaseAnonKey ||
      !supabaseServiceRoleKey
    ) {
      throw new Error("Supabase ortam değişkenleri eksik.");
    }

    const authorization = req.headers.get("Authorization");

    if (!authorization) {
      return jsonResponse(
        { error: "Oturum bilgisi bulunamadı." },
        401
      );
    }

    // İşlemi çağıran mevcut kullanıcı
    const kullaniciClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        global: {
          headers: {
            Authorization: authorization,
          },
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const {
      data: { user: mevcutUser },
      error: userError,
    } = await kullaniciClient.auth.getUser();

    if (userError || !mevcutUser) {
      return jsonResponse(
        { error: "Geçerli kullanıcı oturumu bulunamadı." },
        401
      );
    }

    // Yönetici yetkili istemci
    const adminClient = createClient(
      supabaseUrl,
      supabaseServiceRoleKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    // Çağıran kişi gerçekten yönetici mi?
    const { data: mevcutProfil, error: profilError } =
      await adminClient
        .from("kullanicilar")
        .select("id, rol, aktif")
        .eq("id", mevcutUser.id)
        .single();

    if (
      profilError ||
      !mevcutProfil ||
      mevcutProfil.rol !== "yonetici" ||
      mevcutProfil.aktif !== true
    ) {
      return jsonResponse(
        { error: "Bu işlem için yönetici yetkisi gerekiyor." },
        403
      );
    }

    const body = await req.json();

    const email = String(body.email || "")
      .trim()
      .toLowerCase();

    const sifre = String(body.sifre || "");
    const kullaniciAdi = String(
      body.kullanici_adi || ""
    ).trim();

    const adSoyad = String(body.ad_soyad || "").trim();

    const rol =
      body.rol === "yonetici" ? "yonetici" : "personel";

    if (!email) {
      return jsonResponse(
        { error: "E-posta adresi zorunludur." },
        400
      );
    }

    if (!kullaniciAdi) {
      return jsonResponse(
        { error: "Kullanıcı adı zorunludur." },
        400
      );
    }

    if (sifre.length < 6) {
      return jsonResponse(
        { error: "Şifre en az 6 karakter olmalıdır." },
        400
      );
    }

    // Önce Auth kullanıcısını oluştur
    const {
      data: authData,
      error: authError,
    } = await adminClient.auth.admin.createUser({
      email,
      password: sifre,
      email_confirm: true,
      user_metadata: {
        kullanici_adi: kullaniciAdi,
        ad_soyad: adSoyad,
      },
    });

    if (authError || !authData.user) {
      return jsonResponse(
        {
          error:
            authError?.message ||
            "Auth kullanıcısı oluşturulamadı.",
        },
        400
      );
    }

    // Sonra public.kullanicilar tablosuna ekle
    const { error: kayitError } = await adminClient
      .from("kullanicilar")
      .insert({
        id: authData.user.id,
        kullanici_adi: kullaniciAdi,
        ad_soyad: adSoyad || null,
        rol,
        aktif: true,
      });

    if (kayitError) {
      // Tablo kaydı başarısızsa yarım kullanıcı kalmasın
      await adminClient.auth.admin.deleteUser(
        authData.user.id
      );

      return jsonResponse(
        {
          error:
            "Kullanıcı profili oluşturulamadı: " +
            kayitError.message,
        },
        400
      );
    }

    return jsonResponse(
      {
        success: true,
        message: "Kullanıcı başarıyla oluşturuldu.",
        kullanici: {
          id: authData.user.id,
          email,
          kullanici_adi: kullaniciAdi,
          ad_soyad: adSoyad,
          rol,
          aktif: true,
        },
      },
      200
    );
  } catch (error) {
    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : "Bilinmeyen bir hata oluştu.",
      },
      500
    );
  }
});

function jsonResponse(
  body: Record<string, unknown>,
  status: number
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}