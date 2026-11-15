import React, { useEffect, useState } from "react";
import { Megaphone, Send, EyeOff } from "lucide-react";
import { colors, fonts } from "../lib/theme";

// Admin : envoyer un message à tous (notification push, bandeau dans l'app, e-mail)
export default function AdminBroadcast({ adminSecret }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [push, setPush] = useState(true);
  const [banner, setBanner] = useState(true);
  const [email, setEmail] = useState(false);
  const [audience, setAudience] = useState(null);
  const [history, setHistory] = useState([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function call(payload) {
    const res = await fetch("/api/manage-guests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminSecret, ...payload })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Erreur serveur");
    return data;
  }

  async function loadInfo() {
    try {
      const d = await call({ action: "broadcast-info" });
      setAudience(d.audience);
      setHistory(d.history || []);
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    if (open && !audience) loadInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function send() {
    setError("");
    setNotice("");
    if (!title.trim() || !body.trim()) return setError("Titre et message obligatoires");
    if (!push && !banner && !email) return setError("Choisis au moins un canal");
    const parts = [
      push && `notification sur ${audience?.devices ?? "?"} appareil(s)`,
      banner && "bandeau dans l'app",
      email && `e-mail à ${audience?.emails ?? "?"} compte(s)`
    ].filter(Boolean);
    if (!window.confirm(`Envoyer « ${title.trim()} » à tous ?\n\n${parts.join("\n")}\n\nL'envoi ne peut pas être annulé.`)) return;
    setSending(true);
    try {
      const r = await call({ action: "broadcast-send", title, body, url, push, banner, email });
      const done = [
        r.push != null && `${r.push} notification(s) envoyée(s)`,
        banner && "bandeau affiché dans l'app",
        r.email && `${r.email.sent} e-mail(s) envoyé(s)${r.email.failed ? `, ${r.email.failed} en échec` : ""}`
      ].filter(Boolean);
      setNotice(`✅ ${done.join(" · ")}`);
      if (r.errors?.length) setError(r.errors.join(" — "));
      setTitle("");
      setBody("");
      setUrl("");
      loadInfo();
    } catch (e) {
      setError(e.message);
    }
    setSending(false);
  }

  async function hide(id) {
    try {
      await call({ action: "broadcast-hide", broadcastId: id });
      setHistory((h) => h.map((b) => (b.id === id ? { ...b, show_banner: false } : b)));
    } catch (e) {
      setError(e.message);
    }
  }

  const input = {
    width: "100%",
    boxSizing: "border-box",
    background: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: 10,
    padding: "9px 11px",
    fontSize: 14,
    color: colors.ink,
    fontFamily: "inherit",
    outline: "none",
    marginBottom: 8
  };
  const check = (checked, set, label, hint) => (
    <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13, marginBottom: 6, cursor: "pointer" }}>
      <input type="checkbox" checked={checked} onChange={(e) => set(e.target.checked)} style={{ marginTop: 2, accentColor: colors.orange }} />
      <span>
        <strong>{label}</strong>
        <span style={{ color: colors.muted }}> — {hint}</span>
      </span>
    </label>
  );

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          background: colors.orange,
          color: "#fff",
          border: "none",
          borderRadius: 12,
          padding: "11px 14px",
          fontSize: 14,
          fontWeight: 700,
          cursor: "pointer",
          marginBottom: 12
        }}
      >
        <Megaphone size={16} /> Envoyer un message à tous
      </button>
    );
  }

  return (
    <div style={{ background: colors.surface, border: `1.5px solid ${colors.orange}`, borderRadius: 14, padding: 14, marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ fontFamily: fonts.display, fontSize: 16, fontWeight: 700, display: "flex", gap: 6, alignItems: "center" }}>
          <Megaphone size={16} color={colors.orange} /> Message à tous
        </div>
        <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: colors.muted, fontSize: 13, cursor: "pointer" }}>
          Fermer
        </button>
      </div>

      <input style={input} placeholder="Titre (ex. Soirée karaoké samedi !)" maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} />
      <textarea
        style={{ ...input, minHeight: 110, resize: "vertical", lineHeight: 1.5 }}
        placeholder="Ton message (on tutoie tout le monde 😉)"
        maxLength={2000}
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <input
        style={input}
        placeholder="Lien facultatif (ex. lien d'un événement de l'app)"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />

      <div style={{ margin: "4px 0 10px" }}>
        {check(push, setPush, "Notification", `${audience ? audience.devices : "…"} appareil(s) avec notifs actives`)}
        {check(banner, setBanner, "Bandeau dans l'app", "visible par tous à l'ouverture, jusqu'à ce qu'ils le ferment")}
        {check(email, setEmail, "E-mail", `${audience ? audience.emails : "…"} compte(s), hors désinscrits`)}
      </div>

      <button
        onClick={send}
        disabled={sending}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          background: sending ? colors.border : colors.orange,
          color: "#fff",
          border: "none",
          borderRadius: 12,
          padding: "11px 14px",
          fontSize: 14,
          fontWeight: 700,
          cursor: sending ? "default" : "pointer"
        }}
      >
        <Send size={15} /> {sending ? "Envoi en cours…" : "Envoyer"}
      </button>
      {notice && <p style={{ fontSize: 12.5, color: colors.olive, margin: "8px 0 0" }}>{notice}</p>}
      {error && <p style={{ fontSize: 12.5, color: colors.red, margin: "8px 0 0" }}>{error}</p>}

      {history.length > 0 && (
        <div style={{ marginTop: 14, borderTop: `1px solid ${colors.border}`, paddingTop: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: colors.muted, marginBottom: 6 }}>Messages envoyés</div>
          {history.map((b) => (
            <div key={b.id} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12.5, padding: "6px 0", borderBottom: `1px dashed ${colors.border}` }}>
              <div style={{ flex: 1 }}>
                <strong>{b.title}</strong>
                <div style={{ color: colors.muted }}>
                  {new Date(b.created_at).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  {b.push_requested ? " · notif" : ""}
                  {b.send_email ? ` · ${b.email_sent} e-mail(s)` : ""}
                  {b.show_banner ? " · bandeau affiché" : ""}
                </div>
              </div>
              {b.show_banner && (
                <button
                  onClick={() => hide(b.id)}
                  title="Retirer le bandeau de l'app"
                  style={{ display: "flex", gap: 4, alignItems: "center", background: "none", border: `1px solid ${colors.border}`, borderRadius: 20, padding: "3px 8px", fontSize: 11, color: colors.muted, cursor: "pointer", whiteSpace: "nowrap" }}
                >
                  <EyeOff size={12} /> Retirer le bandeau
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
