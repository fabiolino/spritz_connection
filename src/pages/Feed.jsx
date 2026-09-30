import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Calendar, User, Shield, Heart, X, LogIn, MapPin, Navigation, Share2, Users2, HelpCircle } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthContext";
import { colors, fonts } from "../lib/theme";
import { distanceKm } from "../lib/categories";
import { useCategories } from "../lib/CategoriesContext";
import { CategoryIcon } from "../lib/eventIcons";
import { shareContent } from "../lib/share";

const DEMO_EVENTS = [
  {
    id: "demo-1",
    title: "Spritz al Tramonto",
    organizer: "Fabio",
    event_date: "2026-09-12T19:00:00",
    address: "12 Quai de Valmy, 75010 Paris",
    seats: 40,
    taken: 27,
    category: "apero",
    latitude: 48.8709,
    longitude: 2.3661
  }
];

const RADII = [5, 10, 20];

const EVENT_IMAGES = {
  apero: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=900&q=85",
  concert: "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=900&q=85",
  soiree: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=900&q=85",
  degustation: "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=85",
  default: "https://images.unsplash.com/photo-1544148103-0773bf10d330?auto=format&fit=crop&w=900&q=85"
};

export default function Feed() {
  const navigate = useNavigate();
  const location = useLocation();
  const isEventsPage = location.pathname === "/events";
  const { user, profile, loading: authLoading } = useAuth();
  const { getCategory } = useCategories();
  const [events, setEvents] = useState(DEMO_EVENTS);
  const [loading, setLoading] = useState(true);
  const [showJoinBanner, setShowJoinBanner] = useState(true);
  const [shareMsg, setShareMsg] = useState("");

  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState("");
  const [radius, setRadius] = useState(null); // null = pas de filtre

  useEffect(() => {
    async function load() {
      if (!import.meta.env.VITE_SUPABASE_URL) {
        setLoading(false);
        return;
      }
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("approved", true)
        .gte("event_date", sevenDaysAgo.toISOString())
        .order("event_date", { ascending: true });
      if (!error && data) setEvents(data);
      setLoading(false);
    }
    load();
  }, []);

  function requestLocation() {
    setLocationError("");
    if (!navigator.geolocation) {
      setLocationError("La géolocalisation n'est pas disponible sur cet appareil.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => setLocationError("Localisation refusée ou indisponible."),
      { enableHighAccuracy: false, timeout: 8000 }
    );
  }

  async function handleShareApp() {
    const result = await shareContent({
      title: "Spritz Connection",
      text: "Rejoins la communauté Spritz Connection — des soirées italiennes à Paris !",
      url: window.location.origin
    });
    if (result === "copied") setShareMsg("Lien copié !");
    if (result === "failed") setShareMsg("Impossible de partager pour le moment.");
    if (result === "copied" || result === "failed") setTimeout(() => setShareMsg(""), 2500);
  }

  const visibleEvents = useMemo(() => {
    if (!radius || !userLocation) return events;
    return events.filter((e) => {
      const d = distanceKm(userLocation.lat, userLocation.lon, e.latitude, e.longitude);
      return d === null ? true : d <= radius; // garde les événements sans coordonnées plutôt que de les cacher
    });
  }, [events, radius, userLocation]);

  return (
    <div style={{ paddingBottom: 100 }}>
      {!isEventsPage && <section
        style={{
          position: "relative",
          minHeight: 390,
          overflow: "hidden",
          backgroundImage: "linear-gradient(180deg, rgba(6,43,73,.18) 0%, rgba(6,43,73,.08) 35%, rgba(6,43,73,.78) 100%), url('/header.png')",
          backgroundSize: "cover",
          backgroundPosition: "center"
        }}
      >
        <img
          src="/logo.jpg"
          alt="Spritz Connection"
          style={{
            position: "absolute",
            top: 18,
            left: 18,
            width: 108,
            height: 108,
            objectFit: "cover",
            borderRadius: "50%",
            boxShadow: "0 8px 24px rgba(0,0,0,.2)"
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 20,
            right: 20,
            bottom: 24,
            color: "#fff"
          }}
        >
          <div style={{ fontFamily: fonts.display, fontSize: 34, lineHeight: 1.02, maxWidth: 310, textShadow: "0 3px 16px rgba(0,0,0,.28)" }}>
            Des rencontres qui ont du goût
          </div>
          <div style={{ marginTop: 12, display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12.5, fontWeight: 700 }}>
            <span style={{ width: 36, height: 4, borderRadius: 99, background: colors.orange }} />
            Apéros · concerts · soirées · communauté
          </div>
        </div>
      </section>}

      {isEventsPage && (
        <div style={{ background: colors.bg, padding: "22px 20px 4px" }}>
          <h1 style={{ fontFamily: fonts.display, fontSize: 30, lineHeight: 1, margin: 0 }}>Tous les événements</h1>
          <p style={{ color: colors.muted, fontSize: 13, margin: "8px 0 0" }}>Trouve ton prochain moment à l’italienne.</p>
        </div>
      )}

      <div style={{ background: colors.bg, padding: "16px 20px 4px" }}>
        {!authLoading && (
          <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
            {user ? (
              <>
                <button
                  onClick={() => navigate("/account")}
                  style={{
                    background: colors.surface,
                    border: `1px solid ${colors.border}`,
                    color: colors.ink,
                    borderRadius: 20,
                    padding: "6px 14px",
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6
                  }}
                >
                  {profile?.is_member && "⭐ "}
                  {profile?.name || user.email}
                </button>
                <button
                  onClick={() => navigate("/friends")}
                  style={{
                    background: colors.surface,
                    border: `1px solid ${colors.border}`,
                    color: colors.ink,
                    borderRadius: 20,
                    padding: "6px 14px",
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  👥 Amis
                </button>
              </>
            ) : (
              <button
                onClick={() => navigate("/login")}
                style={{
                  background: colors.surface,
                  border: `1px solid ${colors.border}`,
                  color: colors.muted,
                  borderRadius: 20,
                  padding: "6px 14px",
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6
                }}
              >
                <LogIn size={13} /> Se connecter
              </button>
            )}
            <button
              onClick={handleShareApp}
              style={{
                background: colors.surface,
                border: `1px solid ${colors.border}`,
                color: colors.ink,
                borderRadius: 20,
                padding: "6px 14px",
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6
              }}
            >
              <Share2 size={13} /> Partager
            </button>
          </div>
        )}
        {shareMsg && (
          <p style={{ textAlign: "center", fontSize: 11.5, color: colors.muted, marginTop: 8 }}>{shareMsg}</p>
        )}
      </div>

      <div style={{ padding: "20px 20px 0" }}>

      {showJoinBanner && (
        <div
          onClick={() => navigate("/join")}
          style={{
            background: "rgba(242,118,46,0.08)",
            border: `1px solid ${colors.orange}`,
            borderRadius: 16,
            padding: "14px 16px",
            marginBottom: 20,
            cursor: "pointer",
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            position: "relative"
          }}
        >
          <Heart size={18} color={colors.orange} style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 3 }}>Envie de rejoindre l'association ?</div>
            <div style={{ fontSize: 12.5, color: colors.muted, lineHeight: 1.4 }}>
              Devenir membre te donne un tarif préférentiel sur chaque soirée — jamais obligatoire pour participer.
            </div>
          </div>
          <button
            onClick={(ev) => {
              ev.stopPropagation();
              setShowJoinBanner(false);
            }}
            aria-label="Fermer"
            style={{ background: "none", border: "none", color: colors.muted, cursor: "pointer", padding: 2, flexShrink: 0 }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Filtre de géolocalisation */}
      <div style={{ marginBottom: 20 }}>
        {!userLocation ? (
          <button
            onClick={requestLocation}
            style={{
              width: "100%",
              background: "none",
              border: `1px solid ${colors.border}`,
              color: colors.ink,
              borderRadius: 14,
              padding: 11,
              fontSize: 12.5,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 7
            }}
          >
            <Navigation size={14} /> Filtrer par proximité
          </button>
        ) : (
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <MapPin size={14} color={colors.muted} />
            {RADII.map((r) => (
              <button
                key={r}
                onClick={() => setRadius(radius === r ? null : r)}
                style={{
                  border: `1.5px solid ${radius === r ? colors.orange : colors.border}`,
                  background: radius === r ? "rgba(242,118,46,0.1)" : colors.surface,
                  color: colors.ink,
                  borderRadius: 20,
                  padding: "5px 12px",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                {r} km
              </button>
            ))}
            {radius && (
              <button
                onClick={() => setRadius(null)}
                style={{ background: "none", border: "none", color: colors.muted, fontSize: 12, cursor: "pointer", textDecoration: "underline" }}
              >
                Tout voir
              </button>
            )}
          </div>
        )}
        {locationError && <p style={{ fontSize: 11.5, color: colors.red, marginTop: 6 }}>{locationError}</p>}
      </div>

      {loading && <p style={{ color: colors.muted, fontSize: 13 }}>Chargement…</p>}

      {!loading && visibleEvents.length === 0 && (
        <p style={{ color: colors.muted, fontSize: 13, marginBottom: 20 }}>
          Aucun événement dans ce rayon pour le moment.
        </p>
      )}

      {visibleEvents.map((e) => {
        const cat = getCategory(e.category);
        const d = userLocation ? distanceKm(userLocation.lat, userLocation.lon, e.latitude, e.longitude) : null;
        return (
          <div
            key={e.id}
            onClick={() => navigate(`/event/${e.id}`)}
            style={{
              display: "flex",
              alignItems: "stretch",
              background: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: 18,
              overflow: "hidden",
              marginBottom: 14,
              cursor: "pointer",
              boxShadow: "0 3px 10px rgba(43,36,25,0.06)"
            }}
          >
            <div
              style={{
                width: 108,
                minHeight: 116,
                flexShrink: 0,
                backgroundImage: `linear-gradient(180deg, rgba(6,43,73,.08), rgba(6,43,73,.62)), url("${EVENT_IMAGES[e.category] || EVENT_IMAGES.default}")`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "center",
                paddingBottom: 10,
                boxSizing: "border-box"
              }}
            >
              <div style={{ width: 38, height: 38, borderRadius: "50%", background: "rgba(255,255,255,.92)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <CategoryIcon category={cat} size={23} />
              </div>
            </div>

            <div style={{ flex: 1, minWidth: 0, padding: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    color: "#fff",
                    background: colors.orange,
                    borderRadius: 20,
                    padding: "3px 9px"
                  }}
                >
                  {cat.label}
                </span>
                {e.is_free && (
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: "#fff", background: colors.olive, borderRadius: 20, padding: "3px 9px" }}>
                    Gratuit
                  </span>
                )}
                {e.visibility === "private" && (
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: "#fff", background: colors.blue, borderRadius: 20, padding: "3px 9px" }}>
                    🔒 Privé
                  </span>
                )}
                {d !== null && (
                  <span style={{ fontSize: 10.5, color: colors.muted, marginLeft: "auto" }}>{d.toFixed(1)} km</span>
                )}
              </div>
              <h2 style={{ fontFamily: fonts.display, fontSize: 17, margin: "0 0 8px" }}>{e.title}</h2>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: colors.muted, marginBottom: 4 }}>
                <Calendar size={13} /> {new Date(e.event_date).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12.5, color: colors.muted }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <User size={13} /> Organisé par {e.organizer}
                </div>
                {e.seats > 0 && (
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: e.taken >= e.seats ? colors.red : colors.muted }}>
                    {e.taken}/{e.seats}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}

      <button
        onClick={() => navigate("/propose-event")}
        style={{
          width: "100%",
          background: "none",
          border: `1px solid ${colors.olive}`,
          color: colors.olive,
          borderRadius: 14,
          padding: 12,
          fontSize: 13,
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          cursor: "pointer",
          marginBottom: 10
        }}
      >
        Organiser une soirée gratuite
      </button>
      <button
        onClick={() => navigate("/community")}
        style={{
          width: "100%",
          background: "none",
          border: `1px solid ${colors.gold}`,
          color: "#96700f",
          borderRadius: 14,
          padding: 12,
          fontSize: 13,
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          cursor: "pointer",
          marginBottom: 10
        }}
      >
        <Users2 size={15} /> Communauté
      </button>
      <button
        onClick={() => navigate("/venues")}
        style={{
          width: "100%",
          background: "none",
          border: `1px solid ${colors.blue}`,
          color: colors.blue,
          borderRadius: 14,
          padding: 12,
          fontSize: 13,
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          cursor: "pointer",
          marginBottom: 10
        }}
      >
        🏛️ Lieux partenaires
      </button>
      <button
        onClick={() => navigate("/help")}
        style={{
          width: "100%",
          background: "none",
          border: `1px solid ${colors.border}`,
          color: colors.muted,
          borderRadius: 14,
          padding: 12,
          fontSize: 13,
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          cursor: "pointer",
          marginBottom: 10
        }}
      >
        <HelpCircle size={15} /> Aide &amp; FAQ
      </button>
      <button
        onClick={() => navigate("/admin")}
        style={{
          width: "100%",
          background: "none",
          border: `1px solid ${colors.border}`,
          color: colors.muted,
          borderRadius: 14,
          padding: 12,
          fontSize: 13,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          cursor: "pointer"
        }}
      >
        <Shield size={15} /> Espace administrateur
      </button>
      </div>
    </div>
  );
}
