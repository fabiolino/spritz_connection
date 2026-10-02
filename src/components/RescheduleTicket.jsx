import React, { useEffect, useState } from "react";
import { CalendarClock, CheckCircle2, Loader2 } from "lucide-react";
import { colors, fonts } from "../lib/theme";

function formatDate(iso) {
  return new Date(iso).toLocaleString("fr-FR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
}

// « Un imprévu ? » : reporter un billet payant vers une autre date au même tarif et au même endroit,
// au plus tard 24 h avant le début de l'événement. Les règles sont vérifiées par le serveur.
export function RescheduleTicket({ registrationId, onMoved, style }) {
  const [info, setInfo] = useState(null);
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(null);

  async function loadOptions() {
    try {
      const res = await fetch("/api/register-free", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reschedule-options", registrationId })
      });
      const data = await res.json().catch(() => ({}));
      setInfo(res.ok ? data : null);
    } catch {
      setInfo(null);
    }
  }

  useEffect(() => {
    loadOptions();
  }, [registrationId]);

  async function confirm() {
    const target = info?.events.find((e) => e.id === choice);
    if (!target) return;
    if (!window.confirm(`Reporter ta participation au ${formatDate(target.event_date)} ? Ton billet actuel sera remplacé par celui de cette date.\n\nUn billet ne peut être reporté qu'une seule fois : tu ne pourras plus changer de date ensuite.`)) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/register-free", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reschedule", registrationId, targetEventId: choice })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Le report n'a pas pu être fait.");
        loadOptions();
        return;
      }
      setDone({ ...data.event, emailed: data.emailed });
      setOpen(false);
      setChoice("");
      onMoved && onMoved();
      loadOptions();
    } catch {
      setError("Impossible de contacter le serveur");
    } finally {
      setBusy(false);
    }
  }

  const box = {
    background: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: 16,
    padding: "14px 16px",
    fontSize: 13,
    color: colors.ink,
    lineHeight: 1.5,
    ...style
  };

  if (done) {
    return (
      <div style={box}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, color: colors.olive }}>
          <CheckCircle2 size={16} /> Participation reportée
        </div>
        <p style={{ margin: "6px 0 0" }}>
          Ton billet est maintenant valable pour le <strong>{formatDate(done.event_date)}</strong>. Ton code ne change pas. Ce billet ne pourra plus être reporté.
          {done.emailed ? " Le billet mis à jour t'a été envoyé par email." : ""}
        </p>
      </div>
    );
  }

  if (!info) return null;


  if (!info.allowed) {
    // Pas de report possible (moins de 24 h avant, événement gratuit…) : on l'explique simplement.
    return (
      <p style={{ fontSize: 12, color: colors.muted, textAlign: "center", lineHeight: 1.5, ...style }}>
        {info.reason}
      </p>
    );
  }

  const deadline = info.deadline ? formatDate(info.deadline) : null;

  return (
    <div style={box}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: fonts.display, fontSize: 16, fontWeight: 700, color: colors.navy }}>
        <CalendarClock size={17} color={colors.orange} /> Un imprévu ?
      </div>
      <p style={{ margin: "6px 0 10px", color: colors.muted }}>
        Tu peux reporter ta participation sur une autre date au même tarif et au même endroit
        {deadline ? <>, jusqu'au <strong style={{ color: colors.ink }}>{deadline}</strong></> : null}.
        {" "}Attention : un billet ne peut être reporté <strong style={{ color: colors.ink }}>qu'une seule fois</strong>.
      </p>

      {info.events.length === 0 ? (
        <p style={{ margin: 0, fontSize: 12.5, color: colors.muted }}>
          Aucune autre date au même tarif et au même endroit pour l'instant. Reviens voir plus tard : le bouton apparaîtra dès qu'une date sera ouverte.
        </p>
      ) : !open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          style={{ background: colors.orange, color: "#fff", border: "none", borderRadius: 14, padding: "11px 16px", fontWeight: 700, fontSize: 14, cursor: "pointer", width: "100%" }}
        >
          Reporter ma participation
        </button>
      ) : (
        <div>
          <div style={{ display: "grid", gap: 8, marginBottom: 10 }}>
            {info.events.map((e) => (
              <label
                key={e.id}
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: `1.5px solid ${choice === e.id ? colors.orange : colors.border}`,
                  opacity: e.full ? 0.5 : 1,
                  cursor: e.full ? "default" : "pointer"
                }}
              >
                <input type="radio" name="reschedule" value={e.id} disabled={e.full} checked={choice === e.id} onChange={() => setChoice(e.id)} style={{ marginTop: 3 }} />
                <span>
                  <strong style={{ textTransform: "capitalize" }}>{formatDate(e.event_date)}</strong>
                  <span style={{ display: "block", color: colors.muted, fontSize: 12.5 }}>
                    {e.title}
                    {e.full ? " — complet" : ""}
                  </span>
                </span>
              </label>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={() => { setOpen(false); setChoice(""); setError(""); }}
              style={{ flex: 1, background: "none", border: `1px solid ${colors.border}`, color: colors.ink, borderRadius: 14, padding: "11px 12px", fontWeight: 600, cursor: "pointer" }}
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={confirm}
              disabled={!choice || busy}
              style={{ flex: 2, background: colors.orange, color: "#fff", border: "none", borderRadius: 14, padding: "11px 12px", fontWeight: 700, cursor: !choice || busy ? "default" : "pointer", opacity: !choice || busy ? 0.6 : 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}
            >
              {busy && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />} Confirmer le report
            </button>
          </div>
        </div>
      )}
      {error && <p style={{ color: colors.red, fontSize: 12.5, margin: "8px 0 0" }}>{error}</p>}
      <style>{"@keyframes spin { to { transform: rotate(360deg); } }"}</style>
    </div>
  );
}
