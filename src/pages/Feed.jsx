import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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

export default function Feed() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const { categories, getCategory } = useCategories();
  const [events, setEvents] = useState(DEMO_EVENTS);
  const [loading, setLoading] = useState(true);
  const [showJoinBanner, setShowJoinBanner] = useState(true);
  const [shareMsg, setShareMsg] = useState("");

  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState("");
  const [radius, setRadius] = useState(null); // null = pas de filtre
  const [activeCategory, setActiveCategory] = useState(null); // null = toutes catégories

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
    let list = events;
    if (activeCategory) list = list.filter((e) => e.category === activeCategory);
    if (radius && userLocation) {
      list = list.filter((e) => {
        const d = distanceKm(userLocation.lat, userLocation.lon, e.latitude, e.longitude);
        return d === null ? true : d <= radius; // garde les événements sans coordonnées plutôt que de les cacher
      });
    }
    return list;
  }, [events, radius, userLocation, activeCategory]);

  return (
    <div style={{ paddingBottom: 100 }}>
      <div style={{ position: "relative" }}>
        <img
          src="/header.png"
          alt="Spritz Connection — Aperitivo, Events, Culture & More"
          style={{ width: "100%", display: "block" }}
        />
      </div>

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

      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 6, marginBottom: 18 }}>
        {categories.map((c) => {
          const active = activeCategory === c.id;
          return (
            <button
              key={c.id}
              onClick={() => setActiveCategory(active ? null : c.id)}
              style={{
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                gap: 6,
                border: `1.5px solid ${active ? colors.orange : colors.border}`,
                background: active ? "rgba(240,90,25,0.1)" : colors.surface,
                color: active ? colors.orange : colors.ink,
                borderRadius: 20,
                padding: "7px 13px",
                fontSize: 12.5,
                fontWeight: 700,
                cursor: "pointer"
              }}
            >
              <CategoryIcon category={c} size={16} /> {c.label}
            </button>
          );
        })}
      </div>

      {showJoinBanner && (
        <div
          onClick={() => navigate("/join")}
          style={{
            background: "rgba(240,90,25,0.08)",
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
                  background: radius === r ? "rgba(240,90,25,0.1)" : colors.surface,
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

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <h2 style={{ fontFamily: fonts.display, fontSize: 21, margin: 0, color: colors.navy }}>Prochains événements</h2>
        <i style={{ display: "inline-block", width: 38, height: 6, background: colors.orange, borderRadius: 99, transform: "rotate(-6deg)" }} />
      </div>

      {loading && <p style={{ color: colors.muted, fontSize: 13 }}>Chargement…</p>}

      {!loading && visibleEvents.length === 0 && (
        <p style={{ color: colors.muted, fontSize: 13, marginBottom: 20 }}>
          Aucun événement pour le moment avec ces filtres.
        </p>
      )}

      {visibleEvents.map((e) => {
        const cat = getCategory(e.category);
        const d = userLocation ? distanceKm(userLocation.lat, userLocation.lon, e.latitude, e.longitude) : null;
        const coverUrl = e.cover_photo_url || cat.default_cover_url;
        const hasPhoto = !!coverUrl;
        const dateObj = new Date(e.event_date);
        const weekday = dateObj.toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", "").toUpperCase();
        const day = dateObj.toLocaleDateString("fr-FR", { day: "numeric" });
        const month = dateObj.toLocaleDateString("fr-FR", { month: "short" }).replace(".", "").toUpperCase();
        const timeStr = dateObj.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
        return (
          <div
            key={e.id}
            onClick={() => navigate(`/event/${e.id}`)}
            style={{
              position: "relative",
              height: 206,
              borderRadius: 20,
              overflow: "hidden",
              marginBottom: 14,
              cursor: "pointer",
              background: hasPhoto
                ? `url(${coverUrl})`
                : "linear-gradient(160deg, rgba(240,90,25,0.85), rgba(255,197,43,0.75))",
              backgroundSize: "cover",
              backgroundPosition: "center",
              boxShadow: "0 8px 18px rgba(6,43,73,0.18)"
            }}
          >
            {!hasPhoto && (
              <div style={{ position: "absolute", top: "28%", left: "50%", transform: "translate(-50%, -50%)" }}>
                <CategoryIcon category={cat} size={58} />
              </div>
            )}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(180deg, rgba(6,43,73,0.05) 30%, rgba(6,43,73,0.92) 100%)"
              }}
            />

            {hasPhoto && (
              <div
                style={{
                  position: "absolute",
                  top: 10,
                  left: 10,
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  overflow: "hidden",
                  border: "2px solid #fff",
                  boxShadow: "0 2px 6px rgba(6,43,73,0.35)",
                  flexShrink: 0
                }}
              >
                <img src="/logo.jpg" alt="Spritz Connection" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </div>
            )}

            <div style={{ position: "absolute", top: 10, left: hasPhoto ? 52 : 10, right: 10, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: "#fff", background: colors.orange, borderRadius: 20, padding: "3px 9px" }}>
                {cat.label}
              </span>
              {e.is_free && (
                <span style={{ fontSize: 10.5, fontWeight: 700, color: "#fff", background: colors.olive, borderRadius: 20, padding: "3px 9px" }}>
                  Gratuit
                </span>
              )}
              {e.visibility === "private" && (
                <span style={{ fontSize: 10.5, fontWeight: 700, color: colors.navy, background: colors.gold, borderRadius: 20, padding: "3px 9px" }}>
                  🔒 Privé
                </span>
              )}
              {d !== null && (
                <span style={{ fontSize: 10.5, fontWeight: 600, color: "#fff", marginLeft: "auto", textShadow: "0 1px 3px rgba(0,0,0,0.4)" }}>
                  {d.toFixed(1)} km
                </span>
              )}
            </div>

            <div style={{ position: "absolute", left: 14, right: 14, bottom: 12, display: "flex", gap: 10, alignItems: "flex-end", color: "#fff" }}>
              <div style={{ width: 40, flexShrink: 0, textAlign: "center" }}>
                <b style={{ display: "block", fontSize: 10, letterSpacing: "0.08em" }}>{weekday}</b>
                <strong style={{ display: "block", color: colors.gold, fontSize: 28, lineHeight: 0.95, fontFamily: fonts.display }}>{day}</strong>
                <b style={{ display: "block", fontSize: 10, letterSpacing: "0.08em" }}>{month}</b>
              </div>
              <div style={{ borderLeft: "1px solid rgba(255,255,255,0.4)", paddingLeft: 10, minWidth: 0, flex: 1 }}>
                <h3 style={{ fontFamily: fonts.display, fontSize: 17, margin: "0 0 5px", lineHeight: 1.1 }}>{e.title}</h3>
                <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, opacity: 0.92, marginBottom: 2 }}>
                  <Calendar size={11} /> {timeStr} <span style={{ opacity: 0.6 }}>·</span> <User size={11} /> {e.organizer}
                </div>
                {e.seats > 0 && (
                  <div style={{ fontSize: 11, fontWeight: 700, color: e.taken >= e.seats ? colors.red : "rgba(255,255,255,0.85)" }}>
                    {e.taken}/{e.seats} places
                  </div>
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
