import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Camera, X } from "lucide-react";
import { colors, fonts } from "../lib/theme";
import { useAuth } from "../lib/AuthContext.jsx";
import ContactForm, { postContact } from "../components/ContactForm.jsx";

const GOOGLE_REVIEW_URL = "https://g.page/r/CQoIqirTJtVGEBM/review";
const INSTAGRAM_URL = "https://www.instagram.com/spritz_connection/";
const STORE_KEY = "sc_photos_unlocked";

// Soirées déjà débloquées sur cet appareil (confort seulement : sans stockage, on redemande l'email)
function readUnlocked() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || "[]");
  } catch {
    return [];
  }
}
function remember(id) {
  try {
    const list = readUnlocked().filter((x) => x !== id);
    localStorage.setItem(STORE_KEY, JSON.stringify([id, ...list].slice(0, 30)));
  } catch {
    /* stockage indisponible : sans conséquence */
  }
}

function parisDate(iso) {
  return new Date(iso).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long" });
}

const card = { background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 18, padding: 20, boxShadow: "0 6px 16px rgba(6,43,73,0.07)" };

// /photos/<soirée> : le lien partagé après la soirée (groupe Meet5, WhatsApp…).
// On laisse son prénom et son email pour voir les photos ; on reçoit ensuite les invitations.
export default function EventPhotos() {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const [event, setEvent] = useState(null);
  const [photos, setPhotos] = useState(null);
  const [firstName, setFirstName] = useState("");
  const [error, setError] = useState("");
  const [zoom, setZoom] = useState(null);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    const unlocked = !!user || readUnlocked().includes(id);
    postContact({ action: unlocked ? "contact-photos" : "contact-info", eventId: id })
      .then((d) => {
        if (cancelled) return;
        setEvent(d.event);
        if (unlocked) setPhotos(d.photos || []);
      })
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [id, user, authLoading]);

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
      <h1 style={{ fontFamily: fonts.display, fontSize: 26, color: colors.navy, margin: "4px 0 4px", lineHeight: 1.15 }}>
        {photos ? `Grazie${firstName ? " " + firstName : ""} ! 📸` : "Les photos de la soirée 📸"}
      </h1>
      <p style={{ margin: "0 0 18px", color: colors.muted, fontSize: 14 }}>
        {event ? (
          <>
            <strong style={{ color: colors.ink }}>{event.title}</strong> · {parisDate(event.eventDate)}
            {event.venueName ? ` · ${event.venueName}` : ""}
          </>
        ) : (
          "…"
        )}
      </p>

      {event && !photos && (
        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 800, color: colors.navy, marginBottom: 6 }}>
            <Camera size={18} color={colors.orange} />
            {event.photoCount > 0 ? `${event.photoCount} photo${event.photoCount > 1 ? "s" : ""} t'attendent` : "Les photos arrivent bientôt"}
          </div>
          <p style={{ fontSize: 14, lineHeight: 1.5, margin: "0 0 16px" }}>
            Laisse ton prénom et ton email pour les voir. Tu recevras aussi les invitations à nos prochaines soirées, en avant-première.
          </p>
          <ContactForm
            eventId={id}
            source="photos"
            submitLabel="Voir les photos"
            consentText="J'accepte de recevoir par email les photos et les invitations aux prochaines soirées Spritz Connection."
            onDone={(d) => {
              remember(id);
              setFirstName(d.firstName || "");
              setEvent(d.event || event);
              setPhotos(d.photos || []);
            }}
          />
        </div>
      )}

      {photos && (
        <>
          {photos.length === 0 ? (
            <div style={{ ...card, textAlign: "center", fontSize: 14, lineHeight: 1.5 }}>
              Les photos ne sont pas encore en ligne. Tu recevras le lien par email dès qu'elles le sont, avec nos prochaines soirées.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
              {photos.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setZoom(p.photo_url)}
                  style={{ padding: 0, border: "none", background: colors.border, borderRadius: 12, overflow: "hidden", aspectRatio: "1 / 1", cursor: "zoom-in" }}
                >
                  <img src={p.photo_url} alt="Photo de la soirée" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                </button>
              ))}
            </div>
          )}

          {event?.past && (
            <div style={{ ...card, marginTop: 16, borderColor: colors.orange, background: "rgba(240,90,25,0.05)" }}>
              <div style={{ fontWeight: 800, color: colors.navy, marginBottom: 6 }}>La soirée t'a plu ? Dis-le sur Google 🙏</div>
              <p style={{ fontSize: 13.5, lineHeight: 1.5, margin: "0 0 12px" }}>Un avis prend 30 secondes et aide d'autres personnes à découvrir nos soirées.</p>
              <a
                href={GOOGLE_REVIEW_URL}
                target="_blank"
                rel="noreferrer"
                style={{ display: "block", textAlign: "center", background: colors.orange, color: "#fff", borderRadius: 14, padding: 13, fontWeight: 700, textDecoration: "none" }}
              >
                ⭐ Laisser un avis Google
              </a>
            </div>
          )}

          <div style={{ ...card, marginTop: 14 }}>
            <div style={{ fontWeight: 800, color: colors.navy, marginBottom: 6 }}>Et la prochaine ? 🍹</div>
            <p style={{ fontSize: 13.5, lineHeight: 1.5, margin: "0 0 12px" }}>
              Réserve directement dans l'app : c'est moins cher en prévente, et tu reçois ton billet par email.
            </p>
            <Link
              to="/"
              style={{ display: "block", textAlign: "center", background: colors.navy, color: "#fff", borderRadius: 14, padding: 12, fontWeight: 700, textDecoration: "none", marginBottom: 8 }}
            >
              Voir les prochaines soirées
            </Link>
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noreferrer"
              style={{ display: "block", textAlign: "center", background: "#fff", color: colors.orange, border: `2px solid ${colors.orange}`, borderRadius: 14, padding: 10, fontWeight: 700, textDecoration: "none" }}
            >
              Suivre @spritz_connection
            </a>
          </div>
        </>
      )}

      {zoom && (
        <div
          onClick={() => setZoom(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(6,43,73,0.92)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 12 }}
        >
          <button aria-label="Fermer" onClick={() => setZoom(null)} style={{ position: "absolute", top: 14, right: 14, background: "none", border: "none", color: "#fff", cursor: "pointer" }}>
            <X size={28} />
          </button>
          <img src={zoom} alt="Photo de la soirée" style={{ maxWidth: "100%", maxHeight: "88vh", borderRadius: 10 }} />
        </div>
      )}
    </div>
  );
}
