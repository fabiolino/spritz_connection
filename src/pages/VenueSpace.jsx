import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { RefreshCw, Phone, Users, Mail, Share, PlusSquare } from "lucide-react";
import { colors, fonts } from "../lib/theme";

function euro(n) {
  const v = Number(n) || 0;
  return v.toLocaleString("fr-FR", { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 }) + " €";
}

function parisDate(iso, opts) {
  return new Date(iso).toLocaleString("fr-FR", { timeZone: "Europe/Paris", ...opts });
}

const card = {
  background: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: 18,
  boxShadow: "0 6px 16px rgba(6,43,73,0.07)",
  overflow: "hidden",
  marginBottom: 16
};

// Espace réservé à un lieu partenaire : ses soirées et la liste à jour des inscrits.
// Accès par lien privé (/lieu/<code>), sans compte ni mot de passe.
export default function VenueSpace() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [showPast, setShowPast] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/event-attendees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "venue-space", token })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) setError(json.error || "Lien invalide");
      else {
        setData(json);
        setError("");
        setUpdatedAt(new Date());
      }
    } catch {
      setError("Impossible de charger la page. Vérifiez votre connexion internet.");
    }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    load();
    const t = setInterval(load, 60 * 1000); // mise à jour automatique toutes les minutes
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex";
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);

  if (error && !data) {
    return (
      <div style={{ padding: "70px 24px", textAlign: "center" }}>
        <div style={{ fontSize: 40 }}>🍹</div>
        <p style={{ fontFamily: fonts.display, fontSize: 20, fontWeight: 700, color: colors.navy }}>{error}</p>
        <p style={{ fontSize: 13.5, color: colors.muted, lineHeight: 1.5 }}>
          Ce lien n'est pas (ou plus) valable. Demandez votre lien d'accès à l'équipe Spritz Connection.
        </p>
      </div>
    );
  }

  const now = Date.now();
  const startOfToday = new Date(new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Paris" }) + "T00:00:00").getTime();
  const upcoming = (data?.events || []).filter((e) => new Date(e.event_date).getTime() >= startOfToday);
  const past = (data?.events || []).filter((e) => new Date(e.event_date).getTime() < startOfToday).reverse();

  return (
    <div style={{ paddingBottom: 40 }}>
      <div style={{ background: colors.navy, color: "#fff", padding: "22px 20px 22px", borderBottom: `6px solid ${colors.orange}` }}>
        <div style={{ fontSize: 11, letterSpacing: "0.18em", fontWeight: 700, color: colors.gold }}>ESPACE LIEU · SPRITZ CONNECTION</div>
        <h1 style={{ fontFamily: fonts.display, fontSize: 28, margin: "4px 0 4px", lineHeight: 1.1 }}>{data?.venue?.name || "…"}</h1>
        {data?.venue?.address && <div style={{ fontSize: 13, opacity: 0.85 }}>{data.venue.address}</div>}
      </div>

      <div style={{ padding: "16px 20px 0" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 16 }}>
          <span style={{ fontSize: 12, color: colors.muted }}>
            {updatedAt ? `Mis à jour à ${updatedAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} · actualisation automatique` : "Chargement…"}
          </span>
          <button
            onClick={load}
            disabled={loading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: colors.surface,
              border: `1.5px solid ${colors.navy}`,
              color: colors.navy,
              borderRadius: 20,
              padding: "6px 12px",
              fontSize: 12.5,
              fontWeight: 700,
              cursor: "pointer"
            }}
          >
            <RefreshCw size={13} /> Actualiser
          </button>
        </div>

        {data && upcoming.length === 0 && (
          <div style={{ ...card, padding: 18, textAlign: "center", color: colors.muted, fontSize: 14 }}>
            Aucune soirée Spritz Connection à venir chez vous pour le moment.
          </div>
        )}

        {upcoming.map((e) => (
          <EventBlock key={e.id} e={e} now={now} />
        ))}

        {past.length > 0 && (
          <>
            <button
              onClick={() => setShowPast((v) => !v)}
              style={{ background: "none", border: "none", color: colors.blue, fontWeight: 700, fontSize: 13, cursor: "pointer", padding: "4px 0 12px", textDecoration: "underline" }}
            >
              {showPast ? "Masquer les soirées passées" : `Voir les soirées passées (${past.length})`}
            </button>
            {showPast && past.map((e) => <EventBlock key={e.id} e={e} now={now} past />)}
          </>
        )}

        <div style={{ ...card, padding: 16, background: "rgba(240,90,25,0.06)", borderColor: colors.orange }}>
          <div style={{ fontWeight: 800, color: colors.navy, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
            <Mail size={15} color={colors.orange} /> Vous recevez aussi tout par email
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.55, color: colors.ink }}>
            <li>Le jour de la soirée à 14 h : la liste complète des inscrits.</li>
            <li>Après 14 h : un email pour chaque inscription de dernière minute.</li>
          </ul>
          <p style={{ fontSize: 12.5, color: colors.muted, margin: "10px 0 0", lineHeight: 1.5 }}>
            Astuce : gardez cette page sur votre téléphone — dans Safari <Share size={12} style={{ verticalAlign: "-2px" }} /> Partager ›{" "}
            <PlusSquare size={12} style={{ verticalAlign: "-2px" }} /> Sur l'écran d'accueil ; dans Chrome ⋮ › Ajouter à l'écran d'accueil.
            Ce lien est personnel à votre établissement : ne le partagez pas.
          </p>
        </div>
      </div>
    </div>
  );
}

function EventBlock({ e, past }) {
  const day = parisDate(e.event_date, { day: "numeric" });
  const month = parisDate(e.event_date, { month: "short" }).replace(".", "").toUpperCase();
  const weekday = parisDate(e.event_date, { weekday: "short" }).replace(".", "").toUpperCase();
  const time = parisDate(e.event_date, { hour: "2-digit", minute: "2-digit" });
  return (
    <div style={{ ...card, opacity: past ? 0.75 : 1 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", padding: "14px 16px", borderBottom: `1px solid ${colors.border}` }}>
        <div style={{ width: 46, textAlign: "center", flexShrink: 0 }}>
          <b style={{ display: "block", fontSize: 10, letterSpacing: "0.08em", color: colors.muted }}>{weekday}</b>
          <strong style={{ display: "block", color: colors.orange, fontSize: 28, lineHeight: 0.95, fontFamily: fonts.display }}>{day}</strong>
          <b style={{ display: "block", fontSize: 10, letterSpacing: "0.08em", color: colors.muted }}>{month}</b>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: fonts.display, fontSize: 18, fontWeight: 700, color: colors.navy }}>{e.title}</div>
          <div style={{ fontSize: 12.5, color: colors.muted }}>à {time}</div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", borderBottom: `1px solid ${colors.border}` }}>
        {[
          ["Places", `${e.places}${e.seats ? ` / ${e.seats}` : ""}`],
          ["Réglé en prévente", euro(e.paid)],
          ["À encaisser sur place", euro(e.due)]
        ].map(([label, value], i) => (
          <div key={label} style={{ padding: "10px 8px", textAlign: "center", borderLeft: i ? `1px solid ${colors.border}` : "none" }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: colors.navy }}>{value}</div>
            <div style={{ fontSize: 10.5, color: colors.muted, lineHeight: 1.2 }}>{label}</div>
          </div>
        ))}
      </div>
      {e.newcomers > 0 && (
        <div style={{ padding: "9px 16px", background: "rgba(255,197,43,0.15)", fontSize: 12.5, color: colors.ink, borderBottom: `1px solid ${colors.border}` }}>
          ✨ <strong>
            {e.newcomers} personne{e.newcomers > 1 ? "s viennent" : " vient"} pour la première fois
          </strong>{" "}
          : un accueil chaleureux fait toute la différence.
        </div>
      )}
      {e.participants.length === 0 ? (
        <p style={{ padding: "14px 16px", margin: 0, fontSize: 13.5, color: colors.muted }}>Aucune inscription pour le moment.</p>
      ) : (
        e.participants.map((p, i) => (
          <div key={i} style={{ padding: "11px 16px", borderTop: i ? `1px solid ${colors.border}` : "none", display: "flex", gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: colors.ink }}>
                {p.name}
                {p.firstTime && (
                  <span style={{ marginLeft: 6, background: colors.gold, color: colors.navy, borderRadius: 20, padding: "1px 7px", fontSize: 11, fontWeight: 800 }}>
                    1re fois
                  </span>
                )}
                {p.quantity > 1 && (
                  <span style={{ marginLeft: 6, background: colors.orange, color: "#fff", borderRadius: 20, padding: "1px 7px", fontSize: 11, fontWeight: 800 }}>
                    <Users size={10} style={{ verticalAlign: "-1px" }} /> {p.quantity}
                  </span>
                )}
              </div>
              {p.with.length > 0 && <div style={{ fontSize: 12, color: colors.muted }}>avec {p.with.join(", ")}</div>}
              {p.detail.length > 0 && <div style={{ fontSize: 12.5, color: colors.ink, marginTop: 2 }}>{p.detail.join(" · ")}</div>}
              {p.phone && (
                <a href={`tel:${p.phone.replace(/[^\d+]/g, "")}`} style={{ fontSize: 12.5, color: colors.blue, display: "inline-flex", alignItems: "center", gap: 4, marginTop: 3, textDecoration: "none" }}>
                  <Phone size={12} /> {p.phone}
                </a>
              )}
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: p.due > 0 ? "#9A6B00" : colors.olive,
                  background: p.due > 0 ? "rgba(255,197,43,0.18)" : "rgba(107,124,79,0.12)",
                  borderRadius: 20,
                  padding: "3px 8px",
                  whiteSpace: "nowrap"
                }}
              >
                {p.status}
              </div>
              {p.due > 0 && <div style={{ fontSize: 14, fontWeight: 800, color: colors.navy, marginTop: 4 }}>{euro(p.due)}</div>}
              {p.paid > 0 && <div style={{ fontSize: 12, color: colors.muted, marginTop: 4 }}>{euro(p.paid)} payé</div>}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
