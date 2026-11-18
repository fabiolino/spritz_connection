import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, MapPin, Ticket, ArrowRight, Wine, UtensilsCrossed, Music } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { colors, fonts } from "../lib/theme";
import { useCategories } from "../lib/CategoriesContext";

// Page publique « Nos soirées » : la liste des prochaines soirées ouvertes à tous,
// avec un accès direct à la réservation. Pas besoin d'être connecté pour la consulter.
// Les séries récurrentes (ex. Dopo Lavoro) ont leur propre adresse et un encart de présentation :
// pour en ajouter une, il suffit d'ajouter une entrée dans SERIES et une route dans App.jsx.

export const SERIES = {
  dopolavoro: {
    match: /dopo\s*lavoro/i,
    title: "Il Dopo Lavoro",
    kicker: "L'aperitivo italiano · chez Capucci",
    tagline: "Le travail, c'est avant… après, c'est Dopo Lavoro.",
    intro:
      "Un rendez-vous régulier pour celles et ceux qui travaillent ou vivent entre Saint-Lazare et l'Opéra. Pas de networking organisé, pas de programme compliqué : on passe après le bureau, on trinque, on goûte, on discute. Comme à l'heure de l'aperitivo, en Italie.",
    includes: [
      { icon: Wine, label: "Un verre inclus" },
      { icon: UtensilsCrossed, label: "Buffet d'antipasti & spécialités" },
      { icon: Music, label: "Musique italienne" }
    ],
    priceLine: "15 € en prévente · 20 € sur place",
    place: "Capucci · 21 rue Joubert · Paris 9e",
    empty: "La prochaine date arrive très bientôt. Reviens vite, ou découvre nos autres soirées ci-dessous."
  }
};

function formatEuro(n) {
  const v = Number(n) || 0;
  return v.toLocaleString("fr-FR", { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 }) + " €";
}

function formatDate(iso) {
  const d = new Date(iso);
  const day = d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  const time = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }).replace(":", "h");
  return { day: day.charAt(0).toUpperCase() + day.slice(1), time };
}

function priceText(e) {
  if (e.is_free) return "Gratuit";
  const pre = Number(e.price_member);
  const onsite = Number(e.price_nonmember);
  if (pre > 0 && onsite > 0 && pre !== onsite) return `${formatEuro(pre)} en prévente · ${formatEuro(onsite)} sur place`;
  const p = pre || onsite || Number(e.price);
  return p ? formatEuro(p) : "";
}

function EventCard({ e, cover, onOpen }) {
  const { day, time } = formatDate(e.event_date);
  const full = e.seats > 0 && e.taken >= e.seats;
  const price = priceText(e);
  return (
    <button
      onClick={onOpen}
      style={{
        all: "unset",
        cursor: "pointer",
        display: "block",
        background: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: 18,
        overflow: "hidden",
        boxShadow: "0 6px 18px rgba(6,43,73,0.08)"
      }}
    >
      <div
        style={{
          height: 150,
          background: cover
            ? `url(${cover}) center/cover`
            : `linear-gradient(160deg, ${colors.orange}, ${colors.gold})`
        }}
      />
      <div style={{ padding: "14px 16px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, color: colors.orange, fontWeight: 700, fontSize: 14 }}>
          <Calendar size={16} aria-hidden="true" /> {day} · {time}
        </div>
        <div style={{ fontFamily: fonts.display, fontSize: 22, fontWeight: 700, color: colors.ink, lineHeight: 1.15 }}>{e.title}</div>
        {e.address && (
          <div style={{ display: "flex", alignItems: "flex-start", gap: 6, color: colors.muted, fontSize: 14 }}>
            <MapPin size={16} style={{ flexShrink: 0, marginTop: 1 }} aria-hidden="true" /> {e.address}
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 4 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: colors.ink }}>{price}</span>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: full ? colors.muted : colors.orange,
              color: "#fff",
              fontWeight: 700,
              fontSize: 14,
              padding: "9px 14px",
              borderRadius: 999,
              whiteSpace: "nowrap"
            }}
          >
            {full ? "Complet" : <><Ticket size={16} aria-hidden="true" /> Réserver</>}
          </span>
        </div>
      </div>
    </button>
  );
}

export default function Soirees({ series }) {
  const navigate = useNavigate();
  const { getCategory } = useCategories();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const s = series ? SERIES[series] : null;

  useEffect(() => {
    document.title = s ? `${s.title} — Spritz Connection` : "Nos soirées — Spritz Connection";
    async function load() {
      if (!import.meta.env.VITE_SUPABASE_URL) {
        setLoading(false);
        return;
      }
      const now = new Date();
      now.setHours(now.getHours() - 3); // une soirée en cours reste visible
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("approved", true)
        .gte("event_date", now.toISOString())
        .order("event_date", { ascending: true });
      if (!error && data) setEvents(data.filter((e) => e.visibility !== "private"));
      setLoading(false);
    }
    load();
  }, [series]);

  const seriesEvents = useMemo(() => (s ? events.filter((e) => s.match.test(e.title || "")) : []), [events, s]);
  const otherEvents = useMemo(() => (s ? events.filter((e) => !s.match.test(e.title || "")) : events), [events, s]);

  const coverOf = (e) => e.cover_photo_url || getCategory(e.category)?.default_cover_url || null;
  const open = (e) => navigate(`/event/${e.id}`);

  return (
    <div style={{ paddingBottom: 40 }}>
      {/* En-tête */}
      <div
        style={{
          background: `linear-gradient(170deg, ${colors.navy} 0%, #0B3D66 100%)`,
          color: "#FFFAF0",
          padding: "34px 22px 30px",
          position: "relative",
          overflow: "hidden"
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: -70,
            right: -60,
            width: 200,
            height: 200,
            borderRadius: "50%",
            background: colors.orange,
            boxShadow: `0 0 0 14px ${colors.gold}55`
          }}
        />
        <div style={{ position: "relative" }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: colors.gold }}>
            {s ? s.kicker : "Spritz Connection"}
          </div>
          <h1 style={{ margin: "10px 0 8px", fontFamily: fonts.display, fontStyle: "italic", fontSize: 40, lineHeight: 1, fontWeight: 800 }}>
            {s ? s.title : "Nos soirées"}
          </h1>
          <p style={{ margin: 0, fontSize: 16, lineHeight: 1.45, opacity: 0.92 }}>
            {s ? s.tagline : "Aperitivo, dîners, concerts et rencontres à l'italienne, ouverts à toutes et à tous. Choisis ta soirée et réserve ta place en quelques secondes."}
          </p>
        </div>
      </div>

      {/* Présentation de la série */}
      {s && (
        <div style={{ padding: "22px 20px 6px", display: "flex", flexDirection: "column", gap: 14 }}>
          <p style={{ margin: 0, fontSize: 16, lineHeight: 1.55, color: colors.ink }}>{s.intro}</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
            {s.includes.map(({ icon: Icon, label }) => (
              <div
                key={label}
                style={{
                  background: colors.surface,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 14,
                  padding: "12px 8px",
                  textAlign: "center",
                  fontSize: 13,
                  fontWeight: 600,
                  color: colors.ink,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 6
                }}
              >
                <Icon size={22} color={colors.orange} aria-hidden="true" />
                {label}
              </div>
            ))}
          </div>
          <div style={{ background: colors.orange, color: "#fff", borderRadius: 14, padding: "12px 16px", fontWeight: 700, fontSize: 16 }}>
            {s.priceLine}
            <div style={{ fontWeight: 500, fontSize: 14, marginTop: 4, opacity: 0.95 }}>{s.place}</div>
          </div>
        </div>
      )}

      <div style={{ padding: "20px 20px 0", display: "flex", flexDirection: "column", gap: 16 }}>
        {loading && <p style={{ color: colors.muted, textAlign: "center" }}>Chargement des soirées…</p>}

        {!loading && s && (
          <>
            <h2 style={{ margin: "4px 0 0", fontFamily: fonts.display, fontSize: 24, color: colors.ink }}>Prochaines dates</h2>
            {seriesEvents.length === 0 ? (
              <p style={{ margin: 0, color: colors.muted, fontSize: 15, lineHeight: 1.5 }}>{s.empty}</p>
            ) : (
              seriesEvents.map((e) => <EventCard key={e.id} e={e} cover={coverOf(e)} onOpen={() => open(e)} />)
            )}
          </>
        )}

        {!loading && (
          <>
            {s && otherEvents.length > 0 && (
              <h2 style={{ margin: "14px 0 0", fontFamily: fonts.display, fontSize: 24, color: colors.ink }}>Nos autres soirées</h2>
            )}
            {!s && otherEvents.length === 0 && (
              <p style={{ margin: 0, color: colors.muted, fontSize: 15, textAlign: "center" }}>
                Pas de soirée publique programmée pour le moment. Les prochaines dates arrivent très vite !
              </p>
            )}
            {otherEvents.map((e) => (
              <EventCard key={e.id} e={e} cover={coverOf(e)} onOpen={() => open(e)} />
            ))}
          </>
        )}

        {!loading && s && (
          <button
            onClick={() => navigate("/soirees")}
            style={{
              all: "unset",
              cursor: "pointer",
              alignSelf: "center",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              color: colors.orange,
              fontWeight: 700,
              padding: "10px 6px"
            }}
          >
            Voir toutes nos soirées <ArrowRight size={16} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
