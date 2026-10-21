import React, { useState } from "react";
import { Sparkles, Send, Trash2, Pencil } from "lucide-react";
import { colors, fonts } from "../lib/theme";

const input = {
  width: "100%",
  boxSizing: "border-box",
  background: colors.bg,
  border: `1px solid ${colors.border}`,
  borderRadius: 10,
  padding: "9px 11px",
  fontSize: 13.5,
  color: colors.ink,
  fontFamily: "inherit"
};
const btn = { border: "none", borderRadius: 10, padding: "9px 12px", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 };

function fmt(iso) {
  return new Date(iso).toLocaleString("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// Admin : annoncer une nouveauté de l'app à la communauté (email à la liste + notification + page Nouveautés)
export default function AdminUpdates({ adminSecret }) {
  const [updates, setUpdates] = useState(null);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirmId, setConfirmId] = useState(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function call(body) {
    const res = await fetch("/api/manage-guests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminSecret, ...body })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Erreur serveur");
    return data;
  }
  async function load() {
    if (!adminSecret) return setError("Renseigne le mot de passe administrateur d'abord");
    setError("");
    try {
      const d = await call({ action: "updates-list" });
      setUpdates(d.updates);
    } catch (e) {
      setError(e.message);
    }
  }
  async function save() {
    setBusy(true);
    setError("");
    try {
      await call({ action: "update-save", updateId: form.id, title: form.title, body: form.body });
      setForm(null);
      setNotice("Brouillon enregistré.");
      await load();
    } catch (e) {
      setError(e.message);
    }
    setBusy(false);
  }
  async function publish(id) {
    setBusy(true);
    setError("");
    try {
      const d = await call({ action: "update-publish", updateId: id });
      setNotice(d.emailError ? `Publiée dans l'app, mais l'email n'est pas parti : ${d.emailError}` : "Publiée : email envoyé à la communauté et notification envoyée.");
      setConfirmId(null);
      await load();
    } catch (e) {
      setError(e.message);
    }
    setBusy(false);
  }
  async function remove(id) {
    try {
      await call({ action: "update-delete", updateId: id });
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div style={{ marginBottom: 28 }}>
      <h2 style={{ fontFamily: fonts.display, fontSize: 16, margin: "0 0 6px", display: "flex", alignItems: "center", gap: 6 }}>
        <Sparkles size={16} color={colors.orange} /> Nouveautés de l'app
      </h2>
      <p style={{ fontSize: 12, color: colors.muted, margin: "0 0 10px", lineHeight: 1.5 }}>
        Une nouveauté publiée part par email à toute la liste Spritz Connection, en notification sur les téléphones, et reste visible dans l'app (page Nouveautés).
      </p>
      {updates === null ? (
        <button onClick={load} style={{ ...btn, background: colors.navy, color: "#fff" }}>
          Voir les nouveautés
        </button>
      ) : (
        <>
          {!form && (
            <button onClick={() => setForm({ title: "", body: "" })} style={{ ...btn, background: colors.orange, color: "#fff", marginBottom: 12 }}>
              + Écrire une nouveauté
            </button>
          )}
          {form && (
            <div style={{ border: `1.5px solid ${colors.orange}`, borderRadius: 12, padding: 12, marginBottom: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              <input style={input} placeholder="Titre (ex. : La liste d'attente arrive !)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <textarea
                style={{ ...input, minHeight: 200, resize: "vertical", lineHeight: 1.5 }}
                placeholder={"Texte (laisse une ligne vide entre deux paragraphes)"}
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
              />
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setForm(null)} style={{ ...btn, background: "none", border: `1px solid ${colors.border}`, color: colors.muted }}>
                  Annuler
                </button>
                <button disabled={busy} onClick={save} style={{ ...btn, background: colors.navy, color: "#fff" }}>
                  Enregistrer le brouillon
                </button>
              </div>
            </div>
          )}
          {updates.map((u) => (
            <div key={u.id} style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 12, marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <strong style={{ fontSize: 14 }}>{u.title}</strong>
                <span style={{ fontSize: 11.5, fontWeight: 700, whiteSpace: "nowrap", color: u.published_at ? colors.olive : colors.orange }}>
                  {u.published_at ? `✓ Publiée le ${fmt(u.published_at)}` : "Brouillon"}
                </span>
              </div>
              <div style={{ fontSize: 12.5, color: colors.muted, whiteSpace: "pre-wrap", margin: "6px 0 8px", maxHeight: 120, overflow: "auto" }}>{u.body}</div>
              {!u.published_at && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {confirmId === u.id ? (
                    <>
                      <span style={{ fontSize: 12.5, alignSelf: "center" }}>Envoyer à toute la communauté ?</span>
                      <button disabled={busy} onClick={() => publish(u.id)} style={{ ...btn, background: colors.orange, color: "#fff" }}>
                        <Send size={13} /> {busy ? "Envoi…" : "Oui, publier"}
                      </button>
                      <button onClick={() => setConfirmId(null)} style={{ ...btn, background: "none", border: `1px solid ${colors.border}`, color: colors.muted }}>
                        Non
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => setConfirmId(u.id)} style={{ ...btn, background: colors.orange, color: "#fff" }}>
                        <Send size={13} /> Publier et prévenir
                      </button>
                      <button onClick={() => setForm({ id: u.id, title: u.title, body: u.body })} style={{ ...btn, background: "none", border: `1px solid ${colors.border}`, color: colors.ink }}>
                        <Pencil size={13} /> Modifier
                      </button>
                      <button onClick={() => remove(u.id)} style={{ ...btn, background: "none", border: `1px solid ${colors.border}`, color: colors.red }}>
                        <Trash2 size={13} />
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </>
      )}
      {notice && <p style={{ fontSize: 12.5, color: colors.olive }}>{notice}</p>}
      {error && <p style={{ fontSize: 12.5, color: colors.red }}>{error}</p>}
    </div>
  );
}
