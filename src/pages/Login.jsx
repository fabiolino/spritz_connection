import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ChevronLeft, Mail, KeyRound } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { colors, fonts } from "../lib/theme";
import { useAuth } from "../lib/AuthContext";
import { rememberAfterLogin, safeNextPath } from "../lib/afterLogin";

// Connexion par code reçu par email (6 chiffres), saisi directement dans l'app.
// Pourquoi un code plutôt qu'un lien : le lien s'ouvrait souvent dans un autre navigateur
// (Gmail, Safari…) que l'app installée, qui restait donc déconnectée — d'où les reconnexions
// à répétition. Le code connecte l'appareil sur lequel on le tape, et la session reste ensuite
// enregistrée. Le lien de l'email fonctionne toujours, en secours.

const inputStyle = {
  width: "100%",
  background: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: 12,
  color: colors.ink,
  outline: "none",
  boxSizing: "border-box"
};

export default function Login() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const next = safeNextPath(searchParams.get("next"));
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState("email"); // "email" | "code"
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resent, setResent] = useState(false);

  // Déjà connecté·e (ou connecté·e via le lien de l'email) : on repart d'où l'on venait
  useEffect(() => {
    if (user) navigate(next || "/", { replace: true });
  }, [user, next, navigate]);

  async function sendCode() {
    if (next) rememberAfterLogin(next);
    return supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin + (next || "") }
    });
  }

  async function handleEmail(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await sendCode();
    setLoading(false);
    if (error) {
      setError(
        /rate|seconds|security purposes/i.test(error.message || "")
          ? "Un email vient déjà de partir : attends une minute avant d'en redemander un."
          : "Une erreur est survenue — vérifie l'adresse email."
      );
      return;
    }
    setStep("code");
  }

  async function handleCode(e) {
    e.preventDefault();
    const token = code.replace(/\D/g, "");
    if (token.length < 6) {
      setError("Le code fait 6 chiffres.");
      return;
    }
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token, type: "email" });
    setLoading(false);
    if (error) {
      setError(
        /expired|invalid/i.test(error.message || "")
          ? "Code incorrect ou expiré. Vérifie le dernier email reçu, ou redemande un code."
          : "La connexion n'a pas abouti, réessaie."
      );
      return;
    }
    // La redirection se fait via l'effet ci-dessus dès que la session est active
  }

  async function handleResend() {
    setError("");
    setResent(false);
    const { error } = await sendCode();
    if (error) setError("Attends une minute avant de redemander un code.");
    else setResent(true);
  }

  return (
    <div style={{ padding: "0 20px 60px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "18px 0 16px" }}>
        <button
          onClick={() => (step === "code" ? setStep("email") : navigate(next || "/"))}
          style={{ background: "none", border: "none", color: colors.ink, cursor: "pointer" }}
        >
          <ChevronLeft size={22} />
        </button>
        <h1 style={{ fontFamily: fonts.display, fontSize: 20, margin: 0 }}>Se connecter</h1>
      </div>

      {step === "email" ? (
        <>
          <p style={{ fontSize: 13, color: colors.muted, marginBottom: 20, lineHeight: 1.5 }}>
            Indique ton email : on t'envoie un code à 6 chiffres. Pas de mot de passe à retenir, et tu restes connecté·e ensuite.
          </p>
          <form onSubmit={handleEmail} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ position: "relative" }}>
              <Mail size={16} color={colors.muted} style={{ position: "absolute", left: 12, top: 13 }} />
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="ton@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ ...inputStyle, padding: "12px 12px 12px 38px", fontSize: 14 }}
              />
            </div>
            {error && <p style={{ color: colors.red, fontSize: 13, margin: 0 }}>{error}</p>}
            <button type="submit" disabled={loading} style={primaryBtn}>
              {loading ? "Envoi…" : "Recevoir mon code"}
            </button>
          </form>
        </>
      ) : (
        <>
          <p style={{ fontSize: 13, color: colors.muted, marginBottom: 20, lineHeight: 1.5 }}>
            Code envoyé à <strong style={{ color: colors.ink }}>{email}</strong>. Tape-le ici (pense à regarder dans les spams).
          </p>
          <form onSubmit={handleCode} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ position: "relative" }}>
              <KeyRound size={18} color={colors.muted} style={{ position: "absolute", left: 14, top: 17 }} />
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                maxLength={10}
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^\d ]/g, ""))}
                style={{
                  ...inputStyle,
                  padding: "14px 14px 14px 44px",
                  fontSize: 24,
                  fontWeight: 800,
                  letterSpacing: 8,
                  fontFamily: "ui-monospace, Menlo, monospace"
                }}
              />
            </div>
            {error && <p style={{ color: colors.red, fontSize: 13, margin: 0 }}>{error}</p>}
            <button type="submit" disabled={loading} style={primaryBtn}>
              {loading ? "Connexion…" : "Me connecter"}
            </button>
          </form>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16, fontSize: 12.5 }}>
            <button onClick={() => setStep("email")} style={linkBtn}>
              Changer d'email
            </button>
            <button onClick={handleResend} style={linkBtn}>
              Renvoyer un code
            </button>
          </div>
          {resent && <p style={{ fontSize: 12, color: colors.olive, marginTop: 8 }}>Nouveau code envoyé.</p>}
          <p style={{ fontSize: 11.5, color: colors.muted, marginTop: 18, lineHeight: 1.5 }}>
            Tu peux aussi cliquer sur le lien de l'email, mais de préférence ouvre-le sur ce même appareil.
          </p>
        </>
      )}
    </div>
  );
}

const primaryBtn = {
  width: "100%",
  background: colors.orange,
  color: "#fff",
  border: "none",
  borderRadius: 14,
  padding: 14,
  fontWeight: 700,
  fontSize: 15,
  cursor: "pointer",
  boxShadow: "0 4px 12px rgba(240,90,25,0.3)"
};

const linkBtn = {
  background: "none",
  border: "none",
  padding: 0,
  color: colors.blue,
  fontWeight: 600,
  cursor: "pointer",
  textDecoration: "underline",
  fontSize: 12.5
};
