import React, { useState } from "react";
import { UserPlus } from "lucide-react";
import { colors } from "../lib/theme";
import { Stepper, MAX_GROUP } from "./GroupForm.jsx";

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  background: colors.bg,
  border: `1px solid ${colors.border}`,
  borderRadius: 10,
  padding: "9px 11px",
  fontSize: 13.5,
  color: colors.ink,
  outline: "none",
  fontFamily: "inherit"
};

// Admin : inscrire à la main une personne ou un groupe (réservation reçue par WhatsApp, téléphone…)
export default function AdminAddRegistration({ adminSecret, event, onAdded }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [names, setNames] = useState([]);
  const [alreadyPaid, setAlreadyPaid] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function reset() {
    setName("");
    setQuantity(1);
    setNames([]);
    setAlreadyPaid(false);
    setError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Indique le nom de la personne.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/manage-guests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminSecret,
          action: "add-registration",
          eventId: event.id,
          guestName: name.trim(),
          quantity,
          attendeeNames: names.slice(0, quantity - 1).map((n) => (n || "").trim()).filter(Boolean),
          alreadyPaid
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Inscription impossible");
        setSaving(false);
        return;
      }
      setNotice(
        `${name.trim()}${quantity > 1 ? ` + ${quantity - 1}` : ""} inscrit${quantity > 1 ? "s" : ""} — code ${data.code}.` +
          (data.overbooked ? " ⚠️ L'événement dépasse maintenant sa capacité." : "")
      );
      reset();
      setOpen(false);
      onAdded && onAdded();
    } catch (err) {
      setError("Impossible de contacter le serveur");
    }
    setSaving(false);
  }

  if (!open) {
    return (
      <>
        <button
          onClick={() => {
            setNotice("");
            setOpen(true);
          }}
          style={{
            width: "100%",
            background: colors.orange,
            color: "#fff",
            border: "none",
            borderRadius: 10,
            padding: 10,
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            marginBottom: 10
          }}
        >
          <UserPlus size={14} /> Inscrire quelqu'un (une ou plusieurs personnes)
        </button>
        {notice && <p style={{ fontSize: 12, color: colors.olive, margin: "0 0 10px" }}>{notice}</p>}
      </>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        border: `1.5px solid ${colors.orange}`,
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
        display: "flex",
        flexDirection: "column",
        gap: 9
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 700 }}>Nouvelle inscription</div>
      <input placeholder="Prénom et nom *" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} autoFocus />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <span style={{ fontSize: 13 }}>Nombre de personnes</span>
        <Stepper value={quantity} min={1} max={MAX_GROUP} onChange={setQuantity} label="personnes" />
      </div>
      {quantity > 1 &&
        Array.from({ length: quantity - 1 }, (_, i) => (
          <input
            key={i}
            placeholder={`Personne ${i + 2} — prénom (facultatif)`}
            value={names[i] || ""}
            onChange={(e) => {
              const next = [...names];
              next[i] = e.target.value;
              setNames(next);
            }}
            style={inputStyle}
          />
        ))}
      {!event.is_free && (
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={alreadyPaid}
            onChange={(e) => setAlreadyPaid(e.target.checked)}
            style={{ width: 18, height: 18, accentColor: colors.orange }}
          />
          Déjà payé
        </label>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          onClick={() => {
            reset();
            setOpen(false);
          }}
          style={{ flex: 1, background: "none", border: `1px solid ${colors.border}`, borderRadius: 9, padding: 9, fontSize: 13, color: colors.muted, cursor: "pointer" }}
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={saving}
          style={{ flex: 2, background: colors.orange, color: "#fff", border: "none", borderRadius: 9, padding: 9, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
        >
          {saving ? "Inscription…" : quantity > 1 ? `Inscrire ${quantity} personnes` : "Inscrire"}
        </button>
      </div>
      {error && <p style={{ color: colors.red, fontSize: 12, margin: 0 }}>{error}</p>}
    </form>
  );
}
