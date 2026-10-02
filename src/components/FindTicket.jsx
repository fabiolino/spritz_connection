import React, { useState } from "react";
import { Mail } from "lucide-react";
import { colors } from "../lib/theme";
import { useAuth } from "../lib/AuthContext";

// « Déjà inscrit·e ? » — renvoie le billet par email (on ne l'affiche jamais directement,
// pour qu'on ne puisse pas consulter les inscriptions de quelqu'un d'autre).
export default function FindTicket({ eventId, style }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setSending(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/create-sumup-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resend-tickets", email: email.trim(), eventId })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(data.error || "Envoi impossible pour le moment.");
      else setMessage(data.message);
    } catch {
      setError("Impossible de contacter le serveur");
    }
    setSending(false);
  }

  if (!open) {
    return (
      <div style={{ textAlign: "center", ...style }}>
        <button
          onClick={() => {
            setOpen(true);
            if (user?.email) setEmail(user.email);
          }}
          style={{ background: "none", border: "none", padding: 0, color: colors.blue, fontSize: 12.5, fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}
        >
          Déjà inscrit·e ? Recevoir mon billet par email
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        background: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: 14,
        padding: 12,
        ...style
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
        <Mail size={14} color={colors.orange} /> Retrouver mon billet
      </div>
      <p style={{ fontSize: 11.5, color: colors.muted, margin: "0 0 8px", lineHeight: 1.4 }}>
        Indique l'email utilisé pour t'inscrire : on t'y renvoie ton billet avec ton code.
      </p>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          type="email"
          required
          placeholder="ton@email.com"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            flex: 1,
            minWidth: 0,
            background: colors.bg,
            border: `1px solid ${colors.border}`,
            borderRadius: 10,
            padding: "9px 11px",
            fontSize: 14,
            color: colors.ink,
            outline: "none"
          }}
        />
        <button
          type="submit"
          disabled={sending}
          style={{ background: colors.orange, color: "#fff", border: "none", borderRadius: 10, padding: "0 14px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
        >
          {sending ? "…" : "Envoyer"}
        </button>
      </div>
      {message && <p style={{ fontSize: 12, color: colors.olive, margin: "8px 0 0", lineHeight: 1.4 }}>{message}</p>}
      {error && <p style={{ fontSize: 12, color: colors.red, margin: "8px 0 0" }}>{error}</p>}
    </form>
  );
}
