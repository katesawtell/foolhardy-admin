import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../auth/AuthContext";
import { Navigate } from "react-router-dom";

export default function Login() {
  const { session } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // if already logged in, go to dashboard
  if (session) {
    return <Navigate to="/dashboard" replace />;
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      // session will update via AuthProvider
    } catch (err: any) {
      setErrorMsg(err.message || "Error signing in");
    } finally {
      setLoading(false);
    }
  }

  return (
    
    <div
    
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#111827",
      }}
    >
      <form
        onSubmit={handleLogin}
        style={{
          width: "100%",
          maxWidth: "360px",
          padding: "2rem",
          borderRadius: "16px",
          background: "white",
          boxShadow: "0 20px 40px rgba(15,23,42,0.45)",
        }}
      >
        <h1 style={{ marginTop: 0, marginBottom: "1.5rem", textAlign: "center" }}>
          Foolhardy Admin
        </h1>

        <p style={{ position: "fixed", top: 8, left: 8, color: "white" }}>LOGIN PAGE RENDERED</p>


        <label
          style={{ display: "flex", flexDirection: "column", gap: "0.25rem", marginBottom: "0.75rem" }}
        >
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              padding: "0.5rem",
              borderRadius: "8px",
              border: "1px solid #d1d5db",
            }}
          />
        </label>

        <label
          style={{ display: "flex", flexDirection: "column", gap: "0.25rem", marginBottom: "0.75rem" }}
        >
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{
              padding: "0.5rem",
              borderRadius: "8px",
              border: "1px solid #d1d5db",
            }}
          />
        </label>

        {errorMsg && (
          <p style={{ color: "red", fontSize: "0.85rem", marginBottom: "0.75rem" }}>
            {errorMsg}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: "0.6rem",
            borderRadius: "999px",
            border: "none",
            background: "#fbbf24",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>

        <p
          style={{
            marginTop: "0.75rem",
            fontSize: "0.75rem",
            color: "#6b7280",
            textAlign: "center",
          }}
        >
          Use the email/password you created in Supabase Auth.
        </p>
      </form>
    </div>
  );
}
