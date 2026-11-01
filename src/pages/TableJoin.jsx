import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Check } from "lucide-react";
import { colors, fonts } from "../lib/theme";
import ContactForm, { postContact } from "../components/ContactForm.jsx";

const INSTAGRAM_URL = "https://www.instagram.com/spritz_connection/";
const card = { background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 18, padding: 20, boxShadow: "0 6px 16px rgba(6,43,73,0.07)" };

// /bienvenue/<soirée> : la page du QR code posé sur les tables pendant la soirée
export default function TableJoin() {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [done, setDone] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    postContact({ action: "contact-info", eventId: id })
      .then((d) => setEvent(d.event))
      .catch((e) => setError(e.message));
  }, [id]);

  if (error) {
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

  return (
    <div style={{ padding: "28px 20px 110px" }}>
      <div style={{ fontSize: 11, letterSpacing: "0.18em", fontWeight: 700, color: colors.orange }}>SPRITZ CONNECTION</div>
      <h1 style={{ fontFamily: fonts.display, fontSize: 27, color: colors.navy, margin: "4px 0 6px", lineHeight: 1.15 }}>
        {done ? `Grazie${done.firstName ? " " + done.firstName : ""} ! 🍹` : "Benvenuti ! 🍹"}
      </h1>
      <p style={{ margin: "0 0 18px", color: colors.muted, fontSize: 14 }}>{event ? event.title : "…"}</p>

      {!done && (
        <div style={card}>
          <div style={{ fontWeight: 800, color: colors.navy, marginBottom: 6 }}>Recevez les photos de ce soir 📸</div>
          <p style={{ fontSize: 14, lineHeight: 1.5, margin: "0 0 16px" }}>
            Laissez votre prénom et votre email : demain, vous recevez les photos de la soirée, puis les invitations à nos prochaines soirées en avant-première.
          </p>
          <ContactForm
            eventId={id}
            source="table"
            submitLabel="Je veux les photos"
            consentText="J'accepte de recevoir par email les photos de la soirée et les invitations aux prochaines soirées Spritz Connection."
            onDone={setDone}
          />
        </div>
      )}

      {done && (
        <>
          <div style={{ ...card, display: "flex", gap: 10, alignItems: "flex-start" }}>
            <Check size={22} color={colors.olive} style={{ flexShrink: 0, marginTop: 2 }} />
            <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.5 }}>
              C'est noté ! Les photos vous arrivent demain par email. Profitez bien de la soirée.
            </p>
          </div>
          <div style={{ ...card, marginTop: 14 }}>
            <div style={{ fontWeight: 800, color: colors.navy, marginBottom: 6 }}>En attendant…</div>
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noreferrer"
              style={{ display: "block", textAlign: "center", background: colors.orange, color: "#fff", borderRadius: 14, padding: 12, fontWeight: 700, textDecoration: "none", marginBottom: 8 }}
            >
              Suivre @spritz_connection
            </a>
            <Link
              to="/"
              style={{ display: "block", textAlign: "center", background: "#fff", color: colors.navy, border: `2px solid ${colors.navy}`, borderRadius: 14, padding: 10, fontWeight: 700, textDecoration: "none" }}
            >
              Voir les prochaines soirées
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
