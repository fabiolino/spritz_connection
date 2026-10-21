import React, { useState } from "react";
import { Hourglass, Check } from "lucide-react";
import { colors, fonts } from "../lib/theme";
import { authHeaders } from "../lib/sumupClient";
import { Stepper } from "./GroupForm.jsx";

const input = {
  width: "100%",
  boxSizing: "border-box",
  background: colors.bg,
  border: `1px solid ${colors.border}`,
  borderRadius: 12,
  padding: "11px 12px",
  fontSize: 14,
  color: colors.ink,
  outline: "none",
  fontFamily: "inherit"
};

// Soirée complète : on laisse ses coordonnées et on est prévenu par email dès qu'une place se libère.
export default function WaitlistJoin({ eventId, user, profile }) {
  const [name, setName] = useState(profile?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setSending(true);
    try {
      const res = await fetch("/api/event-attendees", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeaders()) },
        body: JSON.stringify({ action: "waitlist-join", eventId, name, email, phone, quantity })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(data.error || "Inscription impossible");
      else setDone(data);
    } catch {
      setError("Impossible de contacter le serveur");
    }
    setSending(false);
  }

  const card = { background: colors.surface, border: `1.5px solid ${colors.orange}`, borderRadius: 16, padding: 16, marginBottom: 16 };

  if (done) {
    return (
      <div style={card}>
        <div style={{ fontFamily: fonts.display, fontSize: 17, fontWeight: 700, color: colors.navy, display: "flex", alignItems: "center", gap: 6 }}>
          <Check size={18} color={colors.olive} /> Tu es sur la liste d'attente
        </div>
        <p style={{ fontSize: 13.5, lineHeight: 1.5, margin: "8px 0 0" }}>
          Position <strong>{done.position}</strong>. Dès qu'une place se libère, tu reçois un email : la place revient à la première personne qui
          réserve, alors ouvre-le vite.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} style={card}>
      <div style={{ fontFamily: fonts.display, fontSize: 17, fontWeight: 700, color: colors.navy, display: "flex", alignItems: "center", gap: 6 }}>
        <Hourglass size={17} color={colors.orange} /> C'est complet… pour l'instant
      </div>
      <p style={{ fontSize: 13, color: colors.muted, lineHeight: 1.5, margin: "6px 0 12px" }}>
        Inscris-toi sur la liste d'attente : on te prévient par email dès qu'une place se libère.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <input style={input} placeholder="Prénom et nom" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        <input style={input} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        <input style={input} type="tel" placeholder="Mobile" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <span style={{ fontSize: 13.5 }}>Nombre de places</span>
          <Stepper value={quantity} min={1} max={6} onChange={setQuantity} label="places" />
        </div>
      </div>
      <button
        type="submit"
        disabled={sending}
        style={{
          width: "100%",
          marginTop: 12,
          background: colors.orange,
          color: "#fff",
          border: "none",
          borderRadius: 14,
          padding: 13,
          fontWeight: 700,
          fontSize: 15,
          cursor: "pointer"
        }}
      >
        {sending ? "Inscription…" : "M'inscrire sur la liste d'attente"}
      </button>
      {error && <p style={{ color: colors.red, fontSize: 12.5, margin: "8px 0 0" }}>{error}</p>}
    </form>
  );
}
