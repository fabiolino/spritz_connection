import React from "react";
import { Minus, Plus, Users, UserRound } from "lucide-react";
import { colors, fonts } from "../lib/theme";

export const MAX_GROUP = 10; // aligné avec api/_registration.js

export function emptyGroup() {
  return { quantity: 1, names: [], guestName: "", guestEmail: "", guestPhone: "" };
}

// Données à envoyer au serveur
export function groupPayload(group, user) {
  return {
    quantity: group.quantity,
    attendeeNames: group.names.slice(0, group.quantity - 1).map((n) => n.trim()).filter(Boolean),
    ...(user
      ? {}
      : {
          guestName: group.guestName.trim(),
          guestEmail: group.guestEmail.trim(),
          guestPhone: group.guestPhone.trim()
        })
  };
}

// Vérification avant envoi : renvoie un message d'erreur ou ""
// L'email est obligatoire pour les inscriptions sans compte : on y envoie le billet.
export function groupError(group, user, { requireEmail = true } = {}) {
  if (user) return "";
  if (!group.guestName.trim()) return "Indique ton prénom et ton nom.";
  if (requireEmail && !group.guestEmail.trim()) return "Indique ton email : on t'y envoie ton billet.";
  if (group.guestEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(group.guestEmail.trim())) {
    return "L'adresse email ne semble pas valide.";
  }
  return "";
}

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  background: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: 12,
  padding: "11px 12px",
  fontSize: 14,
  color: colors.ink,
  outline: "none",
  fontFamily: "inherit"
};

// Bouton − n + (nombre de personnes, quantité d'une option…)
export function Stepper({ value, min = 0, max = 99, onChange, label }) {
  const btn = (disabled) => ({
    width: 34,
    height: 34,
    borderRadius: 10,
    border: `1.5px solid ${disabled ? colors.border : colors.orange}`,
    background: colors.surface,
    color: disabled ? colors.border : colors.orange,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: disabled ? "not-allowed" : "pointer",
    padding: 0
  });
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
      <button
        type="button"
        aria-label={`Moins${label ? " — " + label : ""}`}
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        style={btn(value <= min)}
      >
        <Minus size={16} />
      </button>
      <span style={{ minWidth: 18, textAlign: "center", fontWeight: 800, fontSize: 16 }}>{value}</span>
      <button
        type="button"
        aria-label={`Plus${label ? " — " + label : ""}`}
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        style={btn(value >= max)}
      >
        <Plus size={16} />
      </button>
    </div>
  );
}

// Nombre de personnes + prénoms des accompagnants + coordonnées si pas de compte
export default function GroupForm({ group, onChange, user, seatsLeft, requireEmail = true, onLogin, unitLabel }) {
  const max = Math.max(1, Math.min(MAX_GROUP, seatsLeft ?? MAX_GROUP));
  const set = (patch) => onChange({ ...group, ...patch });

  function setName(i, value) {
    const names = [...group.names];
    names[i] = value;
    set({ names });
  }

  return (
    <div
      style={{
        background: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: 16,
        padding: 14,
        marginBottom: 14
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div>
          <div style={{ fontFamily: fonts.display, fontSize: 15, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
            <Users size={15} color={colors.orange} /> Nombre de personnes
          </div>
          <div style={{ fontSize: 11.5, color: colors.muted, marginTop: 2 }}>
            {group.quantity > 1
              ? `Une seule inscription${unitLabel ? `, ${unitLabel}` : ""} pour tout le groupe`
              : `Tu viens à plusieurs ? Inscris tout le monde en une fois.`}
          </div>
        </div>
        <Stepper value={group.quantity} min={1} max={max} onChange={(q) => set({ quantity: q })} label="personnes" />
      </div>
      {seatsLeft != null && seatsLeft <= MAX_GROUP && group.quantity >= max && (
        <p style={{ fontSize: 11.5, color: colors.muted, margin: "8px 0 0" }}>
          {seatsLeft} place{seatsLeft > 1 ? "s" : ""} restante{seatsLeft > 1 ? "s" : ""}.
        </p>
      )}

      {!user && (
        <div style={{ borderTop: `1px solid ${colors.border}`, marginTop: 12, paddingTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
            <UserRound size={14} color={colors.orange} /> {group.quantity > 1 ? "Qui inscrit le groupe ?" : "Tes coordonnées"}
          </div>
          <input
            placeholder="Prénom et nom *"
            autoComplete="name"
            value={group.guestName}
            onChange={(e) => set({ guestName: e.target.value })}
            style={inputStyle}
          />
          <input
            type="email"
            placeholder={requireEmail ? "Email * (on t'y envoie ton billet)" : "Email (facultatif)"}
            autoComplete="email"
            value={group.guestEmail}
            onChange={(e) => set({ guestEmail: e.target.value })}
            style={inputStyle}
          />
          <input
            type="tel"
            placeholder="Téléphone (facultatif)"
            autoComplete="tel"
            value={group.guestPhone}
            onChange={(e) => set({ guestPhone: e.target.value })}
            style={inputStyle}
          />
          <p style={{ fontSize: 11.5, color: colors.muted, margin: 0, lineHeight: 1.45 }}>
            Pas besoin de compte ni de télécharger l'app.
            {onLogin && (
              <>
                {" "}Déjà inscrit·e sur Spritz Connection ?{" "}
                <button
                  type="button"
                  onClick={onLogin}
                  style={{ background: "none", border: "none", padding: 0, color: colors.blue, fontWeight: 700, fontSize: 11.5, cursor: "pointer", textDecoration: "underline" }}
                >
                  Se connecter
                </button>
              </>
            )}
          </p>
        </div>
      )}

      {group.quantity > 1 && (
        <div style={{ borderTop: `1px solid ${colors.border}`, marginTop: 12, paddingTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>
            Tes accompagnants <span style={{ fontWeight: 400, color: colors.muted, fontSize: 11.5 }}>(facultatif, facilite l'accueil)</span>
          </div>
          {Array.from({ length: group.quantity - 1 }, (_, i) => (
            <input
              key={i}
              placeholder={`Personne ${i + 2} — prénom`}
              value={group.names[i] || ""}
              onChange={(e) => setName(i, e.target.value)}
              style={inputStyle}
            />
          ))}
        </div>
      )}
    </div>
  );
}
