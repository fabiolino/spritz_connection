import React, { useState } from "react";
import { colors, fonts } from "../lib/theme";

// Formulaire court (prénom, email, mobile facultatif, accord) utilisé par la page photos
// et par la page du QR code de table. Envoie à /api/event-attendees, action "contact-save".
export async function postContact(body) {
  const res = await fetch("/api/event-attendees", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Erreur, réessaie dans un instant.");
  return data;
}

const input = {
  width: "100%",
  boxSizing: "border-box",
  border: `1px solid ${colors.border}`,
  borderRadius: 12,
  padding: "12px 12px",
  fontSize: 16,
  fontFamily: "inherit",
  background: colors.bg,
  color: colors.ink
};
const label = { display: "block", fontSize: 12.5, fontWeight: 700, color: colors.navy, margin: "12px 0 5px" };

export default function ContactForm({ eventId, source, submitLabel, consentText, onDone }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (!consent) {
      setError("Coche la case pour recevoir nos messages.");
      return;
    }
    setBusy(true);
    try {
      const data = await postContact({ action: "contact-save", eventId, source, name, email, phone, consent, website });
      onDone(data);
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  }

  return (
    <form onSubmit={submit} noValidate>
      <label style={{ ...label, marginTop: 0 }} htmlFor="cf-name">
        Prénom
      </label>
      <input id="cf-name" style={input} value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" required />
      <label style={label} htmlFor="cf-email">
        Email
      </label>
      <input id="cf-email" style={input} type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
      <label style={label} htmlFor="cf-phone">
        Mobile <span style={{ fontWeight: 500, color: colors.muted }}>(facultatif)</span>
      </label>
      <input id="cf-phone" style={input} type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
      <div aria-hidden="true" style={{ position: "absolute", left: -9999, top: -9999 }}>
        <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
      </div>
      <label style={{ display: "flex", gap: 10, alignItems: "flex-start", margin: "14px 0 4px", fontSize: 13, lineHeight: 1.45, cursor: "pointer" }}>
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ marginTop: 3, width: 18, height: 18, flexShrink: 0 }} />
        <span>{consentText}</span>
      </label>
      <p style={{ fontSize: 11.5, color: colors.muted, margin: "6px 0 14px", lineHeight: 1.45 }}>
        Désinscription en un clic dans chaque email.{" "}
        <a href="/confidentialite" style={{ color: colors.muted }}>
          Confidentialité
        </a>
      </p>
      {error && <p style={{ color: colors.red, fontSize: 13, margin: "0 0 10px" }}>{error}</p>}
      <button
        type="submit"
        disabled={busy}
        style={{
          width: "100%",
          background: colors.orange,
          color: "#fff",
          border: "none",
          borderRadius: 14,
          padding: 14,
          fontSize: 16,
          fontWeight: 700,
          fontFamily: fonts.body,
          cursor: "pointer",
          opacity: busy ? 0.6 : 1,
          boxShadow: "0 6px 14px rgba(240,90,25,0.25)"
        }}
      >
        {busy ? "Un instant…" : submitLabel}
      </button>
    </form>
  );
}
