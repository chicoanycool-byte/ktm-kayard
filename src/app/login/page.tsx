"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError("Correo o contraseña incorrectos");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0A1628", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif" }}>

      {/* Fondo con patrón */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle at 20% 50%, rgba(42,109,168,0.15) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(245,166,35,0.08) 0%, transparent 40%)" }} />

      <div style={{ position: "relative", width: "100%", maxWidth: 420, padding: "0 1rem" }}>

        {/* Card */}
        <div style={{ backgroundColor: "#1B3A5C", borderRadius: 20, padding: "2.5rem", border: "1px solid rgba(245,166,35,0.2)", boxShadow: "0 25px 50px rgba(0,0,0,0.5)" }}>

          {/* Logo */}
          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            <div style={{ backgroundColor: "#E8F0F7", borderRadius: 12, padding: "0.75rem 1.5rem", display: "inline-block", marginBottom: "1rem" }}>
              <img src="/logo-kayard.png" alt="Kayard" style={{ height: 50, objectFit: "contain" }} />
            </div>
            <h1 style={{ color: "white", fontSize: 20, fontWeight: 700, margin: "0 0 0.25rem" }}>KTM</h1>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, margin: 0 }}>Kayard Transport Management</p>
          </div>

          {/* Formulario */}
          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.7)", display: "block", marginBottom: 6 }}>
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@kayard.com"
                required
                style={{ width: "100%", padding: "0.75rem 1rem", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10, fontSize: 14, backgroundColor: "#0F2540", color: "white", boxSizing: "border-box" }}
              />
            </div>

            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.7)", display: "block", marginBottom: 6 }}>
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{ width: "100%", padding: "0.75rem 1rem", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10, fontSize: 14, backgroundColor: "#0F2540", color: "white", boxSizing: "border-box" }}
              />
            </div>

            {error && (
              <div style={{ backgroundColor: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: "#EF4444", padding: "0.75rem 1rem", borderRadius: 8, fontSize: 13 }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{ width: "100%", padding: "0.875rem", backgroundColor: "#F5A623", color: "#0A1628", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", marginTop: "0.5rem", opacity: loading ? 0.8 : 1 }}
            >
              {loading ? "Iniciando sesión..." : "Iniciar sesión"}
            </button>

          </form>

          <p style={{ textAlign: "center", fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: "1.5rem", marginBottom: 0 }}>
            KTM v1.0 — Kayard Transportes © 2025
          </p>
        </div>
      </div>
    </div>
  );
}