
import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { logEkle } from "../utils/logEkle";
import { yedekAl } from "../utils/yedekAl";
import { yedekGeriYukle } from "../utils/yedekGeriYukle";

const hucreStili={border:"1px solid #d1d5db",padding:10,textAlign:"left"};
const modalArkaPlan={position:"fixed",inset:0,background:"rgba(0,0,0,.45)",display:"flex",justifyContent:"center",alignItems:"center"};
const modalKutu={background:"#fff",padding:24,borderRadius:10,width:420,display:"flex",flexDirection:"column",gap:12};

export default function Yonetim(){
const [aktifSekme,setAktifSekme]=useState("Kullanıcılar");
const [kullanicilar,setKullanicilar]=useState([]);
const [loading,setLoading]=useState(true);
const [hata,setHata]=useState("");
const [modalAcik,setModalAcik]=useState(false);
const [duzenleId,setDuzenleId]=useState(null);
const bosForm={ad_soyad:"",kullanici_adi:"",sifre:"",rol:"personel",aktif:true};
const [form,setForm]=useState(bosForm);
const [loglar,setLoglar]=useState([]);
const [yedekleniyor, setYedekleniyor] = useState(false);
const [yedekMesaji, setYedekMesaji] = useState("");
const [yedekHatasi, setYedekHatasi] = useState(false);
const [geriYukleniyor, setGeriYukleniyor] = useState(false);
const [secilenYedek, setSecilenYedek] = useState(null);

useEffect(() => {
  kullanicilariGetir();
  loglariGetir();
}, []);

async function kullanicilariGetir(){
setLoading(true);
const {data,error}=await supabase.from("kullanicilar").select("*").order("ad_soyad");
if(error){setHata(error.message);setKullanicilar([]);}else{setHata("");setKullanicilar(data||[]);}
setLoading(false);
}
async function loglariGetir() {
  const { data, error } = await supabase
    .from("loglar")
    .select("*")
    .order("tarih", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  setLoglar(data || []);
}
function yeniKullanici(){setDuzenleId(null);setForm(bosForm);setModalAcik(true);}
function duzenle(k){setDuzenleId(k.id);setForm({ad_soyad:k.ad_soyad||"",kullanici_adi:k.kullanici_adi||"",sifre:"",rol:k.rol,aktif:k.aktif});setModalAcik(true);}
async function kaydet() {
  if (!form.ad_soyad.trim()) {
    alert("Ad Soyad alanı zorunludur.");
    return;
  }

  if (!form.kullanici_adi.trim()) {
    alert("Kullanıcı Adı alanı zorunludur.");
    return;
  }

  if (!duzenleId && form.sifre.length < 6) {
    alert("Yeni kullanıcı şifresi en az 6 karakter olmalıdır.");
    return;
  }

  if (duzenleId && form.sifre && form.sifre.length < 6) {
    alert("Yeni şifre en az 6 karakter olmalıdır.");
    return;
  }

  const { data, error } = await supabase.functions.invoke(
    "kullanici-yonet",
    {
      body: {
        islem: duzenleId ? "guncelle" : "olustur",
        id: duzenleId,
        ad_soyad: form.ad_soyad,
        kullanici_adi: form.kullanici_adi,
        sifre: form.sifre,
        rol: form.rol,
        aktif: form.aktif,
      },
    }
  );

  if (error) {
    console.error(error);
    alert("Sunucuya bağlanırken hata oluştu: " + error.message);
    return;
  }

  if (!data?.basarili) {
    alert(data?.hata || "İşlem başarısız.");
    return;
  }
alert(data.mesaj);

await logEkle(
  duzenleId ? "Kullanıcı Güncellendi" : "Kullanıcı Oluşturuldu",
  form.kullanici_adi
);

setModalAcik(false);
setForm(bosForm);
setDuzenleId(null);

await kullanicilariGetir();
await loglariGetir();
}
async function bilgileriYedekle() {
  setYedekleniyor(true);
  setYedekMesaji("");
  setYedekHatasi(false);

  try {
    const kullaniciAdi =
      localStorage.getItem("kullanici_adi") || "Bilinmiyor";

    const sonuc = await yedekAl(kullaniciAdi);

    setYedekMesaji(
      `Yedek oluşturuldu: ${sonuc.dosyaAdi} — ${sonuc.kayitSayisi} kayıt`
    );
  } catch (error) {
    setYedekMesaji(
      error.message || "Yedek oluşturulamadı."
    );
    setYedekHatasi(true);
  } finally {
    setYedekleniyor(false);
  }
}
async function bilgileriGeriYukle() {
  if (!secilenYedek) {
    setYedekHatasi(true);
    setYedekMesaji("Önce bir .skf yedek dosyası seçin.");
    return;
  }

  const onaylandi = window.confirm(
    "DİKKAT!\n\nMevcut cariler, gelirler, giderler, ödemeler, kullanıcılar ve loglar silinecek; seçilen yedek dosyasındaki bilgiler yüklenecek.\n\nDevam edilsin mi?"
  );

  if (!onaylandi) {
    return;
  }

  setGeriYukleniyor(true);
  setYedekMesaji("");
  setYedekHatasi(false);

  try {
    const sonuc = await yedekGeriYukle(secilenYedek);

    setYedekMesaji(
      `Yedek geri yüklendi: ${sonuc.dosyaAdi} — ${sonuc.toplamKayit} kayıt`
    );

    setSecilenYedek(null);

    await kullanicilariGetir();
    await loglariGetir();
  } catch (error) {
    console.error(error);

    setYedekHatasi(true);
    setYedekMesaji(
      error.message || "Yedek geri yüklenemedi."
    );
  } finally {
    setGeriYukleniyor(false);
  }
}
return (<div>
<h1>Yönetim</h1>
<div style={{display:"flex",gap:10,marginBottom:20}}>
<button onClick={()=>setAktifSekme("Kullanıcılar")}>Kullanıcılar</button>
<button onClick={()=>setAktifSekme("Loglar")}>Loglar</button>
<button onClick={()=>setAktifSekme("Yedekleme")}>Bilgileri Yedekle</button>
</div>

{aktifSekme==="Kullanıcılar"&&<>
<div style={{display:"flex",justifyContent:"space-between",marginBottom:20}}>
<h2>Kullanıcılar</h2>
<button onClick={yeniKullanici}>+ Yeni Kullanıcı</button>
</div>
{loading&&<p>Yükleniyor...</p>}
{hata&&<p style={{color:"red"}}>{hata}</p>}
{!loading&&!hata&&<table style={{width:"100%",borderCollapse:"collapse"}}>
<thead><tr><th style={hucreStili}>Ad Soyad</th><th style={hucreStili}>Kullanıcı Adı</th><th style={hucreStili}>Rol</th><th style={hucreStili}>Durum</th><th style={hucreStili}>İşlem</th></tr></thead>
<tbody>{kullanicilar.map(k=><tr key={k.id}><td style={hucreStili}>{k.ad_soyad}</td><td style={hucreStili}>{k.kullanici_adi}</td><td style={hucreStili}>{k.rol==="yonetici"?"Yönetici":"Personel"}</td><td style={hucreStili}><span style={{color:k.aktif?"green":"red",fontWeight:"bold"}}>{k.aktif?"Aktif":"Pasif"}</span></td><td style={hucreStili}><button onClick={()=>duzenle(k)}>Düzenle</button></td></tr>)}</tbody>
</table>}
</>}
{aktifSekme==="Loglar"&&<>
<h2>İşlem Logları</h2>

<table style={{width:"100%",borderCollapse:"collapse"}}>
  <thead>
    <tr>
      <th style={hucreStili}>Tarih</th>
      <th style={hucreStili}>Kullanıcı</th>
      <th style={hucreStili}>İşlem</th>
      <th style={hucreStili}>Açıklama</th>
    </tr>
  </thead>

  <tbody>
    {loglar.map(log=>(
      <tr key={log.id}>
        <td style={hucreStili}>
          {new Date(log.tarih).toLocaleString("tr-TR")}
        </td>

        <td style={hucreStili}>{log.kullanici}</td>

        <td style={hucreStili}>{log.islem}</td>

        <td style={hucreStili}>{log.aciklama}</td>
      </tr>
    ))}
  </tbody>
</table>
</>}
{aktifSekme === "Yedekleme" && (
  <div>
    <h2>Bilgileri Yedekle</h2>

    <p>
      Cariler, gelirler, giderler, ödemeler, kullanıcılar ve işlem
      logları tek bir yedek dosyasına kaydedilir.
    </p>

    <button
      type="button"
      onClick={bilgileriYedekle}
      disabled={yedekleniyor || geriYukleniyor}
    >
      {yedekleniyor ? "Yedekleniyor..." : "Yedek Al"}
    </button>

    <hr style={{ margin: "30px 0" }} />

    <h2>Yedekten Geri Yükle</h2>

    <p style={{ color: "#b91c1c", fontWeight: "bold" }}>
      Bu işlem mevcut bilgileri silerek seçilen yedekteki bilgileri
      yükler.
    </p>

    <input
      type="file"
      accept=".skf"
      disabled={geriYukleniyor || yedekleniyor}
      onChange={(e) => {
        setSecilenYedek(e.target.files?.[0] || null);
        setYedekMesaji("");
        setYedekHatasi(false);
      }}
    />

    {secilenYedek && (
      <p>
        Seçilen dosya: <strong>{secilenYedek.name}</strong>
      </p>
    )}

    <button
      type="button"
      onClick={bilgileriGeriYukle}
      disabled={
        !secilenYedek ||
        geriYukleniyor ||
        yedekleniyor
      }
    >
      {geriYukleniyor
        ? "Geri Yükleniyor..."
        : "Yedeği Geri Yükle"}
    </button>

    {yedekMesaji && (
      <p
        style={{
          marginTop: 12,
          color: yedekHatasi ? "red" : "green",
          fontWeight: "bold",
        }}
      >
        {yedekMesaji}
      </p>
    )}
  </div>
)}
{modalAcik&&<div style={modalArkaPlan}><div style={modalKutu}>
<h3>{duzenleId?"Kullanıcı Düzenle":"Yeni Kullanıcı"}</h3>
<input placeholder="Ad Soyad" value={form.ad_soyad} onChange={e=>setForm({...form,ad_soyad:e.target.value})}/>
<input placeholder="Kullanıcı Adı" value={form.kullanici_adi} onChange={e=>setForm({...form,kullanici_adi:e.target.value})}/>
<input type="password" placeholder={duzenleId?"Yeni Şifre":"Şifre"} value={form.sifre} onChange={e=>setForm({...form,sifre:e.target.value})}/>
<select value={form.rol} onChange={e=>setForm({...form,rol:e.target.value})}><option value="personel">Personel</option><option value="yonetici">Yönetici</option></select>
{duzenleId&&<label><input type="checkbox" checked={form.aktif} onChange={e=>setForm({...form,aktif:e.target.checked})}/> Aktif</label>}
<div style={{display:"flex",gap:10}}><button onClick={kaydet}>Kaydet</button><button onClick={()=>setModalAcik(false)}>Vazgeç</button></div>
</div></div>}
</div>);
}