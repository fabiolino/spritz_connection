import React, { useState } from "react";
import { Inbox, Link2, EyeOff, Copy, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { colors, fonts } from "../lib/theme";
import { gmailImportScript } from "../lib/gmailImportScript";

const selectStyle = {
  flex: 1,
  minWidth: 0,
  background: colors.bg,
  border: `1px solid ${colors.border}`,
  borderRadius: 9,
  padding: "7px 9px",
  fontSize: 12.5,
  color: colors.ink,
  fontFamily: "inherit"
};
const btn = {
  border: "none",
  borderRadius: 9,
  padding: "7px 10px",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: 4,
  whiteSpace: "nowrap"
};

function shortDate(iso) {
  return new Date(iso).toLocaleString("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

// Admin : réservations faites sur d'autres applications, collectées automatiquement depuis Gmail.
// Chaque annonce externe est rattachée une fois à une soirée ; ensuite tout se reporte tout seul.
export default function AdminExternalImports({ adminSecret, events }) {
  const [links, setLinks] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [choice, setChoice] = useState({});
  const [busy, setBusy] = useState(null);
  const [showDone, setShowDone] = useState(false);
  const [script, setScript] = useState(null);

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
    if (!adminSecret) {
      setError("Renseigne le mot de passe administrateur d'abord");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await call({ action: "external-links" });
      setLinks(data.links);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  async function save(l, ignore) {
    const linkEventId = ignore ? null : choice[l.externalId] ?? l.eventId ?? "";
    if (!ignore && !linkEventId) {
      setError("Choisis la soirée correspondante.");
      return;
    }
    setBusy(l.externalId);
    setError("");
    try {
      const data = await call({ action: "external-link-set", source: l.source, externalId: l.externalId, linkEventId, ignore });
      setNotice(ignore ? "Annonce ignorée." : `Annonce rattachée : ${data.applied} mise${data.applied > 1 ? "s" : ""} à jour appliquée${data.applied > 1 ? "s" : ""}.`);
      await load();
    } catch (err) {
      setError(err.message);
    }
    setBusy(null);
  }

  async function showScript() {
    try {
      const data = await call({ action: "external-setup" });
      setScript(gmailImportScript(data.importSecret));
    } catch (err) {
      setError(err.message);
    }
  }

  const upcoming = (events || [])
    .filter((e) => new Date(e.event_date).getTime() > Date.now() - 3 * 24 * 3600 * 1000)
    .sort((a, b) => new Date(a.event_date) - new Date(b.event_date));
  const eventLabel = (e) =>
    `${new Date(e.event_date).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", weekday: "short", day: "numeric", month: "short" })} · ${e.title}`;
  const toLink = (links || []).filter((l) => !l.eventId && !l.ignored);
  const done = (links || []).filter((l) => l.eventId || l.ignored);
  const eventById = Object.fromEntries((events || []).map((e) => [e.id, e]));

  function Row({ l }) {
    const current = choice[l.externalId] ?? l.eventId ?? "";
    return (
      <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 12, marginBottom: 10 }}>
        <div style={{ fontWeight: 700, fontSize: 13.5, color: colors.ink }}>{l.title || `Annonce n° ${l.externalId}`}</div>
        <div style={{ fontSize: 12, color: colors.muted, margin: "2px 0 6px" }}>
          {l.current.length} inscrit{l.current.length > 1 ? "s" : ""} à ce jour · {l.joins} inscription{l.joins > 1 ? "s" : ""}, {l.leaves} départ
          {l.leaves > 1 ? "s" : ""} · dernier : {shortDate(l.lastAt)}
        </div>
        {l.current.length > 0 && <div style={{ fontSize: 12, color: colors.ink, marginBottom: 8, lineHeight: 1.45 }}>{l.current.join(", ")}</div>}
        {l.ignored && <div style={{ fontSize: 12, color: colors.muted, marginBottom: 6 }}>Ignorée (pas une soirée Spritz) — tu peux encore la rattacher :</div>}
        {(
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <select value={current} onChange={(e) => setChoice({ ...choice, [l.externalId]: e.target.value })} style={selectStyle}>
              <option value="">Choisir la soirée…</option>
              {l.eventId && !upcoming.some((e) => e.id === l.eventId) && eventById[l.eventId] && (
                <option value={l.eventId}>{eventLabel(eventById[l.eventId])}</option>
              )}
              {upcoming.map((e) => (
                <option key={e.id} value={e.id}>
                  {eventLabel(e)}
                </option>
              ))}
            </select>
            <button
              disabled={busy === l.externalId || (current === (l.eventId || "") && !!l.eventId)}
              onClick={() => save(l, false)}
              style={{ ...btn, background: colors.orange, color: "#fff", opacity: current === (l.eventId || "") && l.eventId ? 0.4 : 1 }}
            >
              <Link2 size={13} /> {l.eventId ? "Changer" : "Rattacher"}
            </button>
            {!l.eventId && !l.ignored && (
              <button disabled={busy === l.externalId} onClick={() => save(l, true)} title="Ce n'est pas une soirée Spritz" style={{ ...btn, background: "none", border: `1px solid ${colors.border}`, color: colors.muted }}>
                <EyeOff size={13} />
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 28 }}>
      <h2 style={{ fontFamily: fonts.display, fontSize: 16, margin: "0 0 6px", display: "flex", alignItems: "center", gap: 6 }}>
        <Inbox size={16} color={colors.orange} /> Réservations des autres applications
      </h2>
      <p style={{ fontSize: 12, color: colors.muted, margin: "0 0 10px", lineHeight: 1.5 }}>
        Les inscriptions et désistements reçus par email sont ajoutés tout seuls aux soirées. Il suffit de rattacher chaque nouvelle annonce à sa soirée, une seule fois.
      </p>
      {links === null ? (
        <button onClick={load} disabled={loading} style={{ ...btn, background: colors.navy, color: "#fff", padding: "9px 12px" }}>
          {loading ? "Chargement…" : "Voir les annonces"}
        </button>
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
            <button onClick={load} style={{ ...btn, background: "none", color: colors.navy, border: `1px solid ${colors.border}` }}>
              <RefreshCw size={12} /> Actualiser
            </button>
          </div>
          {toLink.length === 0 ? (
            <p style={{ fontSize: 13, color: colors.olive, fontWeight: 600 }}>Aucune nouvelle annonce à rattacher.</p>
          ) : (
            <>
              <div style={{ fontSize: 12.5, fontWeight: 800, color: colors.orange, margin: "4px 0 8px" }}>À rattacher ({toLink.length})</div>
              {toLink.map((l) => (
                <Row key={l.externalId} l={l} />
              ))}
            </>
          )}
          {done.length > 0 && (
            <>
              <button onClick={() => setShowDone((v) => !v)} style={{ ...btn, background: "none", color: colors.blue, padding: "6px 0" }}>
                {showDone ? <ChevronUp size={13} /> : <ChevronDown size={13} />} Annonces déjà rattachées ou ignorées ({done.length})
              </button>
              {showDone && done.map((l) => <Row key={l.externalId} l={l} />)}
            </>
          )}
        </>
      )}
      {notice && <p style={{ fontSize: 12, color: colors.olive, margin: "8px 0 0" }}>{notice}</p>}
      {error && <p style={{ fontSize: 12, color: colors.red, margin: "8px 0 0" }}>{error}</p>}

      <div style={{ marginTop: 12 }}>
        {script === null ? (
          <button onClick={showScript} style={{ ...btn, background: "none", color: colors.muted, padding: 0, fontWeight: 600, textDecoration: "underline" }}>
            Installation de la collecte Gmail (à faire une seule fois)
          </button>
        ) : (
          <div style={{ background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 12, fontSize: 12.5, lineHeight: 1.5 }}>
            <ol style={{ margin: "0 0 8px", paddingLeft: 18 }}>
              <li>
                Ouvre{" "}
                <a href="https://script.google.com/home/projects/create" target="_blank" rel="noreferrer">
                  script.google.com
                </a>{" "}
                avec le compte Gmail qui reçoit les notifications.
              </li>
              <li>Efface le contenu, colle le script ci-dessous, enregistre.</li>
              <li>Choisis la fonction « installer », clique « Exécuter » et accepte les autorisations.</li>
            </ol>
            <button
              onClick={() => navigator.clipboard.writeText(script).then(() => setNotice("Script copié."))}
              style={{ ...btn, background: colors.navy, color: "#fff", marginBottom: 8 }}
            >
              <Copy size={13} /> Copier le script
            </button>
            <pre style={{ maxHeight: 160, overflow: "auto", fontSize: 10.5, background: "#fff", border: `1px solid ${colors.border}`, borderRadius: 8, padding: 8, margin: 0, whiteSpace: "pre-wrap" }}>
              {script}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
