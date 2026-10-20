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

// Provenance d'une réservation reçue hors de l'app (visible par l'admin seulement)
export const SOURCES = ["Autre application", "WhatsApp", "Téléphone / SMS", "Instagram", "Sur place", "Autre"];

// Une ligne de liste : « Marie Dupont +2 06 12 34 56 78 » → nom, nombre de personnes, mobile
export function parseLine(line) {
  let text = String(line || "").trim();
  if (!text) return null;
  let phone = "";
  const phoneMatch = text.match(/(\+\d{2,3}[\s.]?\d(?:[\s.-]?\d{2}){4}|0\d(?:[\s.-]?\d{2}){4})/);
  if (phoneMatch) {
    phone = phoneMatch[1].trim();
    text = text.replace(phoneMatch[1], " ");
  }
  let quantity = 1;
  const qtyMatch = text.match(/(?:^|\s)(?:\+\s?(\d{1,2})|[x×]\s?(\d{1,2})|\((\d{1,2})\))(?=\s|$)/i);
  if (qtyMatch) {
    const n = Number(qtyMatch[1] || qtyMatch[2] || qtyMatch[3]);
    // « +2 » = la personne + 2 accompagnants ; « x3 » / « (3) » = 3 personnes au total
    quantity = qtyMatch[1] ? n + 1 : n;
    text = text.replace(qtyMatch[0], " ");
  }
  const name = text.replace(/[,;–—-]+\s*$/, "").replace(/\s+/g, " ").trim();
  if (!name) return null;
  return { name, quantity: Math.max(1, Math.min(MAX_GROUP, quantity)), phone };
}

// Admin : inscrire à la main une personne, un groupe, ou toute une liste
// (réservations reçues par une autre application, WhatsApp, téléphone…)
export default function AdminAddRegistration({ adminSecret, event, onAdded }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("one"); // "one" | "list"
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [source, setSource] = useState(SOURCES[0]);
  const [quantity, setQuantity] = useState(1);
  const [names, setNames] = useState([]);
  const [listText, setListText] = useState("");
  const [alreadyPaid, setAlreadyPaid] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function reset() {
    setName("");
    setEmail("");
    setPhone("");
    setQuantity(1);
    setNames([]);
    setListText("");
    setAlreadyPaid(false);
    setError("");
  }

  async function addOne(payload) {
    const res = await fetch("/api/manage-guests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminSecret, action: "add-registration", eventId: event.id, source, alreadyPaid, ...payload })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Inscription impossible");
    return data;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (mode === "list") {
      const people = listText.split("\n").map(parseLine).filter(Boolean);
      if (people.length === 0) {
        setError("Colle au moins un nom (une personne par ligne).");
        return;
      }
      setSaving(true);
      let ok = 0;
      let places = 0;
      let overbooked = false;
      const failed = [];
      for (const p of people) {
        try {
          const data = await addOne({ guestName: p.name, guestPhone: p.phone, quantity: p.quantity });
          ok++;
          places += p.quantity;
          overbooked = overbooked || data.overbooked;
        } catch (err) {
          failed.push(`${p.name} (${err.message})`);
        }
      }
      setSaving(false);
      setNotice(
        `${ok} inscription${ok > 1 ? "s" : ""} ajoutée${ok > 1 ? "s" : ""} (${places} place${places > 1 ? "s" : ""}).` +
          (failed.length ? ` Non ajouté : ${failed.join(", ")}.` : "") +
          (overbooked ? " ⚠️ L'événement dépasse maintenant sa capacité." : "")
      );
      if (ok) {
        reset();
        setOpen(false);
        onAdded && onAdded();
      }
      return;
    }

    if (!name.trim()) {
      setError("Indique le nom de la personne.");
      return;
    }
    setSaving(true);
    try {
      const data = await addOne({
        guestName: name.trim(),
        guestEmail: email.trim(),
        guestPhone: phone.trim(),
        quantity,
        attendeeNames: names.slice(0, quantity - 1).map((n) => (n || "").trim()).filter(Boolean)
      });
      setNotice(
        `${name.trim()}${quantity > 1 ? ` + ${quantity - 1}` : ""} inscrit${quantity > 1 ? "s" : ""} — code ${data.code}.` +
          (data.emailed ? " Billet envoyé par email." : "") +
          (data.overbooked ? " ⚠️ L'événement dépasse maintenant sa capacité." : "")
      );
      reset();
      setOpen(false);
      onAdded && onAdded();
    } catch (err) {
      setError(err.message || "Impossible de contacter le serveur");
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
          <UserPlus size={14} /> Inscrire quelqu'un (une personne ou une liste)
        </button>
        {notice && <p style={{ fontSize: 12, color: colors.olive, margin: "0 0 10px" }}>{notice}</p>}
      </>
    );
  }

  const listPreview = mode === "list" ? listText.split("\n").map(parseLine).filter(Boolean) : [];
  const tab = (active) => ({
    flex: 1,
    padding: 8,
    borderRadius: 9,
    border: `1.5px solid ${active ? colors.orange : colors.border}`,
    background: active ? "rgba(240,90,25,0.08)" : colors.surface,
    color: colors.ink,
    fontSize: 12.5,
    fontWeight: 700,
    cursor: "pointer"
  });

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
      <div style={{ display: "flex", gap: 6 }}>
        <button type="button" onClick={() => setMode("one")} style={tab(mode === "one")}>
          Une personne / un groupe
        </button>
        <button type="button" onClick={() => setMode("list")} style={tab(mode === "list")}>
          Une liste de noms
        </button>
      </div>

      <label style={{ fontSize: 12, color: colors.muted }}>
        Réservation reçue par
        <select value={source} onChange={(e) => setSource(e.target.value)} style={{ ...inputStyle, marginTop: 4 }}>
          {SOURCES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </label>

      {mode === "one" ? (
        <>
          <input placeholder="Prénom et nom *" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} autoFocus />
          <input type="tel" placeholder="Mobile (conseillé : le lieu pourra la joindre)" value={phone} onChange={(e) => setPhone(e.target.value)} style={inputStyle} />
          <input
            type="email"
            placeholder="Email (facultatif — pour lui envoyer son billet)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
          />
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
        </>
      ) : (
        <>
          <textarea
            rows={7}
            autoFocus
            placeholder={"Une personne par ligne, par exemple :\nMarie Dupont 06 12 34 56 78\nPaolo Rossi +2\nSophie (3)"}
            value={listText}
            onChange={(e) => setListText(e.target.value)}
            style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }}
          />
          <p style={{ fontSize: 11.5, color: colors.muted, margin: 0, lineHeight: 1.45 }}>
            « +2 » = la personne et 2 accompagnants ; « (3) » ou « x3 » = 3 personnes au total. Un numéro de mobile sur la ligne est
            repris automatiquement.
          </p>
          {listPreview.length > 0 && (
            <div style={{ fontSize: 12, background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 10, padding: "6px 10px" }}>
              {listPreview.map((p, i) => (
                <div key={i} style={{ padding: "2px 0" }}>
                  <strong>{p.name}</strong> · {p.quantity} pers.{p.phone ? ` · ${p.phone}` : ""}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {!event.is_free && (
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={alreadyPaid}
            onChange={(e) => setAlreadyPaid(e.target.checked)}
            style={{ width: 18, height: 18, accentColor: colors.orange }}
          />
          Déjà payé {mode === "list" ? "(pour toute la liste)" : ""}
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
          {saving
            ? "Inscription…"
            : mode === "list"
            ? `Inscrire ${listPreview.length} réservation${listPreview.length > 1 ? "s" : ""}`
            : quantity > 1
            ? `Inscrire ${quantity} personnes`
            : "Inscrire"}
        </button>
      </div>
      {error && <p style={{ color: colors.red, fontSize: 12, margin: 0 }}>{error}</p>}
    </form>
  );
}
