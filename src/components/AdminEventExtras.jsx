import React, { useState } from "react";
import { Sparkles, Hourglass, Star, Copy, MessageCircle } from "lucide-react";
import { colors } from "../lib/theme";

const box = { background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 12, marginBottom: 14 };
const title = { fontSize: 12.5, fontWeight: 700, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 };
const small = { fontSize: 11.5, color: colors.muted, margin: "0 0 8px", lineHeight: 1.45 };
const btn = {
  flex: 1,
  border: `1px solid ${colors.border}`,
  background: colors.surface,
  color: colors.ink,
  borderRadius: 10,
  padding: "8px 8px",
  fontSize: 12.5,
  fontWeight: 700,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 5,
  textDecoration: "none"
};

function welcomeMessage(event, newcomers) {
  const names = newcomers.map((t) => `• ${t.name}${(t.quantity || 1) > 1 ? ` (+${t.quantity - 1})` : ""}`).join("\n");
  return [
    `Ciao ! Ce soir${event?.title ? ` à « ${event.title} »` : ""}, ${newcomers.length} personne${newcomers.length > 1 ? "s viennent" : " vient"} pour la première fois :`,
    names,
    "",
    "Merci de les accueillir à leur arrivée, de les présenter à 2 ou 3 habitués et de vérifier qu'elles ne restent pas seules. Grazie ! 🍹"
  ].join("\n");
}

// Admin, sous la liste des billets : nouveaux à accueillir, liste d'attente, notes de la soirée
export default function AdminEventExtras({ event, tickets, extras }) {
  const [notice, setNotice] = useState("");
  const newcomers = (tickets || []).filter((t) => t.firstTime);
  const waitlist = extras?.waitlist || [];
  const ratings = extras?.ratings;
  const isPast = event && new Date(event.event_date).getTime() < Date.now();
  const msg = welcomeMessage(event, newcomers);

  return (
    <>
      <div style={box}>
        <div style={title}>
          <Sparkles size={13} color={colors.orange} /> Accueil des nouveaux ({newcomers.length})
        </div>
        {newcomers.length === 0 ? (
          <p style={{ ...small, margin: 0 }}>Personne ne vient pour la première fois (d'après les inscriptions avec email ou mobile).</p>
        ) : (
          <>
            <p style={small}>
              Première soirée Spritz Connection pour : <strong style={{ color: colors.ink }}>{newcomers.map((t) => t.name).join(", ")}</strong>. Envoie la liste à
              la personne de la Crew qui accueille ce soir.
            </p>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                style={btn}
                onClick={() =>
                  navigator.clipboard
                    .writeText(msg)
                    .then(() => setNotice("Message copié."))
                    .catch(() => setNotice("Copie impossible."))
                }
              >
                <Copy size={13} /> Copier le message
              </button>
              <a style={btn} href={`https://wa.me/?text=${encodeURIComponent(msg)}`} target="_blank" rel="noreferrer">
                <MessageCircle size={13} /> WhatsApp
              </a>
            </div>
            {notice && <p style={{ fontSize: 12, color: colors.olive, margin: "8px 0 0" }}>{notice}</p>}
          </>
        )}
      </div>

      {(waitlist.length > 0 || !isPast) && (
        <div style={box}>
          <div style={title}>
            <Hourglass size={13} color={colors.orange} /> Liste d'attente ({waitlist.reduce((n, w) => n + (w.quantity || 1), 0)} place
            {waitlist.reduce((n, w) => n + (w.quantity || 1), 0) > 1 ? "s" : ""})
          </div>
          {waitlist.length === 0 ? (
            <p style={{ ...small, margin: 0 }}>Personne pour l'instant. Elle s'ouvre toute seule sur la page de la soirée quand c'est complet.</p>
          ) : (
            <>
              <p style={small}>Quand une place se libère, les premiers de la liste sont prévenus par email automatiquement.</p>
              {waitlist.map((w, i) => (
                <div key={w.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "6px 0", borderTop: `1px solid ${colors.border}`, fontSize: 12.5 }}>
                  <div>
                    <strong>
                      {i + 1}. {w.name}
                    </strong>
                    {w.quantity > 1 && <span style={{ color: colors.muted }}> · {w.quantity} places</span>}
                    <div style={{ color: colors.muted, fontSize: 11.5 }}>
                      {w.phone} · {w.email}
                    </div>
                  </div>
                  {w.notified && <span style={{ color: colors.olive, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>✓ prévenu·e</span>}
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {isPast && (
        <div style={box}>
          <div style={title}>
            <Star size={13} color={colors.orange} /> Notes de la soirée
          </div>
          {!ratings || ratings.count === 0 ? (
            <p style={{ ...small, margin: 0 }}>Pas encore de note. La demande part avec l'email de remerciement, le lendemain vers 11 h.</p>
          ) : (
            <>
              <div style={{ fontSize: 22, fontWeight: 800, color: colors.navy }}>
                {String(ratings.average).replace(".", ",")} / 5{" "}
                <span style={{ fontSize: 12, fontWeight: 600, color: colors.muted }}>
                  ({ratings.count} note{ratings.count > 1 ? "s" : ""})
                </span>
              </div>
              {ratings.comments.map((c, i) => (
                <div key={i} style={{ borderTop: `1px solid ${colors.border}`, padding: "6px 0", fontSize: 12.5 }}>
                  <span style={{ color: colors.gold }}>{"★".repeat(c.rating)}</span>
                  <span style={{ color: colors.border }}>{"★".repeat(5 - c.rating)}</span> {c.comment}
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </>
  );
}
