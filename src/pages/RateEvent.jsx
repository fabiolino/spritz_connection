import React, { useEffect, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { Star, Check } from "lucide-react";
import { colors, fonts } from "../lib/theme";

async function post(body) {
  const res = await fetch("/api/event-attendees", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "rate", ...body })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Erreur");
  return data;
}

// Page ouverte depuis l'email de remerciement : /note/<inscription>?n=<1..5>
export default function RateEvent() {
  const { regId } = useParams();
  const [params] = useSearchParams();
  const [info, setInfo] = useState(null);
  const [rating, setRating] = useState(Number(params.get("n")) || 0);
  const [comment, setComment] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const n = Number(params.get("n"));
    post({ registrationId: regId, rating: n >= 1 && n <= 5 ? n : undefined })
      .then((d) => {
        setInfo(d);
        if (d.rating) setRating(d.rating);
        if (d.comment) setComment(d.comment);
      })
      .catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regId]);

  async function choose(n) {
    setRating(n);
    try {
      await post({ registrationId: regId, rating: n });
    } catch (e) {
      setError(e.message);
    }
  }

  async function sendComment() {
    setBusy(true);
    try {
      await post({ registrationId: regId, rating, comment });
      setSent(true);
    } catch (e) {
      setError(e.message);
    }
    setBusy(false);
  }

  const card = { background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 18, padding: 20, boxShadow: "0 6px 16px rgba(6,43,73,0.07)" };

  if (error && !info) {
    return (
      <div style={{ padding: "70px 24px", textAlign: "center" }}>
        <div style={{ fontSize: 40 }}>🍹</div>
        <p style={{ fontFamily: fonts.display, fontSize: 20, fontWeight: 700, color: colors.navy }}>{error}</p>
        <Link to="/" style={{ color: colors.orange, fontWeight: 700 }}>
          Voir les prochaines soirées
        </Link>
      </div>
    );
  }

  const happy = rating >= 4;
  return (
    <div style={{ padding: "28px 20px 40px" }}>
      <div style={{ fontSize: 11, letterSpacing: "0.18em", fontWeight: 700, color: colors.orange }}>SPRITZ CONNECTION</div>
      <h1 style={{ fontFamily: fonts.display, fontSize: 26, color: colors.navy, margin: "4px 0 16px", lineHeight: 1.15 }}>
        {info ? `Grazie${info.firstName ? " " + info.firstName : ""} !` : "…"}
      </h1>
      <div style={card}>
        <div style={{ fontSize: 14.5, marginBottom: 10 }}>
          Ta note pour <strong>{info?.eventTitle || "la soirée"}</strong> :
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} onClick={() => choose(n)} aria-label={`${n} sur 5`} style={{ background: "none", border: "none", padding: 2, cursor: "pointer" }}>
              <Star size={34} color={colors.gold} fill={n <= rating ? colors.gold : "none"} strokeWidth={1.6} />
            </button>
          ))}
        </div>
        {rating > 0 && <div style={{ fontSize: 12.5, color: colors.olive, fontWeight: 700 }}>✓ Note enregistrée, merci !</div>}
      </div>

      {rating > 0 && happy && info?.googleUrl && (
        <div style={{ ...card, marginTop: 14, borderColor: colors.orange, background: "rgba(240,90,25,0.05)" }}>
          <div style={{ fontWeight: 800, color: colors.navy, marginBottom: 6 }}>Ça t'a plu ? Dis-le sur Google 🙏</div>
          <p style={{ fontSize: 13.5, lineHeight: 1.5, margin: "0 0 12px" }}>
            Un avis Google prend 30 secondes et aide d'autres personnes à découvrir nos soirées.
          </p>
          <a
            href={info.googleUrl}
            target="_blank"
            rel="noreferrer"
            style={{ display: "block", textAlign: "center", background: colors.orange, color: "#fff", borderRadius: 14, padding: 13, fontWeight: 700, textDecoration: "none" }}
          >
            ⭐ Laisser un avis Google
          </a>
        </div>
      )}

      {rating > 0 && happy && (
        <div style={{ ...card, marginTop: 14 }}>
          <div style={{ fontWeight: 800, color: colors.navy, marginBottom: 6 }}>Retrouve les photos sur Instagram 📸</div>
          <p style={{ fontSize: 13.5, lineHeight: 1.5, margin: "0 0 12px" }}>
            Abonne-toi à @spritz_connection pour voir les photos de la soirée, les prochaines dates et nos petits concours.
          </p>
          <a
            href="https://www.instagram.com/spritz_connection/"
            target="_blank"
            rel="noreferrer"
            style={{ display: "block", textAlign: "center", background: "#fff", color: colors.orange, border: `2px solid ${colors.orange}`, borderRadius: 14, padding: 11, fontWeight: 700, textDecoration: "none" }}
          >
            Suivre @spritz_connection
          </a>
        </div>
      )}

      {rating > 0 && (
        <div style={{ ...card, marginTop: 14 }}>
          <div style={{ fontWeight: 800, color: colors.navy, marginBottom: 6 }}>
            {happy ? "Un mot pour l'équipe ? (facultatif)" : "Qu'est-ce qu'on pourrait faire mieux ?"}
          </div>
          {sent ? (
            <p style={{ fontSize: 13.5, color: colors.olive, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
              <Check size={16} /> Message envoyé à l'équipe, grazie !
            </p>
          ) : (
            <>
              <textarea
                rows={4}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={happy ? "Ce que tu as aimé, une idée de soirée…" : "Ton message n'est lu que par l'équipe."}
                style={{ width: "100%", boxSizing: "border-box", border: `1px solid ${colors.border}`, borderRadius: 12, padding: 10, fontSize: 14, fontFamily: "inherit", background: colors.bg, resize: "vertical" }}
              />
              <button
                onClick={sendComment}
                disabled={busy || !comment.trim()}
                style={{ marginTop: 8, width: "100%", background: colors.navy, color: "#fff", border: "none", borderRadius: 12, padding: 12, fontWeight: 700, cursor: "pointer", opacity: comment.trim() ? 1 : 0.5 }}
              >
                {busy ? "Envoi…" : "Envoyer à l'équipe"}
              </button>
            </>
          )}
          {!happy && info?.googleUrl && (
            <p style={{ fontSize: 12, color: colors.muted, margin: "10px 0 0" }}>
              Tu peux aussi laisser un avis public sur{" "}
              <a href={info.googleUrl} target="_blank" rel="noreferrer" style={{ color: colors.muted }}>
                Google
              </a>
              .
            </p>
          )}
        </div>
      )}
      {error && info && <p style={{ color: colors.red, fontSize: 12.5 }}>{error}</p>}
    </div>
  );
}
