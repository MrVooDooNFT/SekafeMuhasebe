import { useState } from "react";
import { supabase } from "../supabase";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mesaj, setMesaj] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMesaj("");

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
    <div style={{ maxWidth: 400, margin: "100px auto" }}>
      <h1>Sekafe Muhasebe</h1>

      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="E-posta"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <br /><br />

        <input
          type="password"
          placeholder="Şifre"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <br /><br />

        <button disabled={loading}>
          {loading ? "Giriş..." : "Giriş Yap"}
        </button>
      </form>

      <p>{mesaj}</p>
    </div>
  );
}