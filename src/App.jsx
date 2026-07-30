import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";

function App() {
  const [user, setUser] = useState(null);
  const [kullanici, setKullanici] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    kontrolEt();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const aktifUser = session?.user ?? null;

      setUser(aktifUser);

      if (aktifUser) {
        kullaniciBilgisiniGetir(aktifUser.id);
      } else {
        setKullanici(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function kontrolEt() {
    setLoading(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const aktifUser = session?.user ?? null;

    setUser(aktifUser);

    if (aktifUser) {
      await kullaniciBilgisiniGetir(aktifUser.id);
    } else {
      setKullanici(null);
      setLoading(false);
    }
  }

  async function kullaniciBilgisiniGetir(userId) {
    const { data, error } = await supabase
      .from("kullanicilar")
      .select("id, kullanici_adi, ad_soyad, rol, aktif")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Kullanıcı bilgisi alınamadı:", error);
      setKullanici(null);
      setLoading(false);
      return;
    }

    if (!data.aktif) {
      await supabase.auth.signOut();
      setUser(null);
      setKullanici(null);
      setLoading(false);
      return;
    }

    setKullanici(data);
    setLoading(false);
  }

  if (loading) {
    return <h2>Yükleniyor...</h2>;
  }

  return user && kullanici ? (
    <Dashboard
      user={user}
      kullanici={kullanici}
    />
  ) : (
    <Login onLogin={kontrolEt} />
  );
}

export default App;