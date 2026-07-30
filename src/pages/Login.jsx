import { useState } from "react";
import { supabase } from "../supabase";
import logo from "../logo.png";

export default function Login({ onLogin }) {
  const [kullaniciAdi, setKullaniciAdi] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mesaj, setMesaj] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMesaj("");

    const email = `${kullaniciAdi.trim().toLowerCase()}@sekafe.local`;

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setMesaj(error.message);
      return;
    }

    onLogin();
  }

  return (
    <div
      style={{
        maxWidth: 400,
        margin: "70px auto",
        textAlign: "center",
      }}
    >
      <img
        src={logo}
        alt="Sekafe Muhasebe"
        style={{
          width: 220,
          height: "auto",
          marginBottom: 20,
        }}
      />

      <h2
        style={{
          margin: 0,
          marginBottom: 30,
        }}
      >
        Hoş Geldiniz
      </h2>

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Kullanıcı Adı"
          value={kullaniciAdi}
          onChange={(e) => setKullaniciAdi(e.target.value)}
          style={{
            width: "100%",
            padding: "10px",
            boxSizing: "border-box",
          }}
        />

        <br />
        <br />

        <input
          type="password"
          placeholder="Şifre"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            width: "100%",
            padding: "10px",
            boxSizing: "border-box",
          }}
        />

        <br />
        <br />

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: "10px",
            cursor: loading ? "default" : "pointer",
          }}
        >
          {loading ? "Giriş Yapılıyor..." : "Giriş Yap"}
        </button>
      </form>

      {mesaj && (
        <p
          style={{
            color: "red",
            marginTop: 15,
          }}
        >
          {mesaj}
        </p>
      )}
    </div>
  );
}