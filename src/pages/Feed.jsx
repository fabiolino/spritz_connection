import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, User, Shield, Heart, X, LogIn, MapPin, Navigation } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthContext";
import { colors, fonts } from "../lib/theme";
import { distanceKm } from "../lib/categories";
import { useCategories } from "../lib/CategoriesContext";
import { CategoryIcon } from "../lib/eventIcons";

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
  const { getCategory } = useCategories();
  const [events, setEvents] = useState(DEMO_EVENTS);
  const [loading, setLoading] = useState(true);
  const [showJoinBanner, setShowJoinBanner] = useState(true);

  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState("");
  const [radius, setRadius] = useState(null); // null = pas de filtre

  useEffect(() => {
    async function load() {
      if (!import.meta.env.VITE_SUPABASE_URL) {
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("approved", true)
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

  const visibleEvents = useMemo(() => {
    if (!radius || !userLocation) return events;
    return events.filter((e) => {
      const d = distanceKm(userLocation.lat, userLocation.lon, e.latitude, e.longitude);
      return d === null ? true : d <= radius; // garde les événements sans coordonnées plutôt que de les cacher
    });
  }, [events, radius, userLocation]);

  return (
    <div style={{ paddingBottom: 100 }}>
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          background: "linear-gradient(to bottom, #F0C468 0%, #F6D98E 45%, #FBF3E0 100%)",
          padding: "30px 20px 28px"
        }}
      >
        <span style={{ position: "absolute", top: "8%", left: "8%", width: 10, height: 10, borderRadius: "50%", background: colors.red, opacity: 0.85 }} />
        <span style={{ position: "absolute", top: "18%", left: "18%", width: 6, height: 6, borderRadius: "50%", background: colors.blue, opacity: 0.75 }} />
        <span style={{ position: "absolute", top: "12%", right: "10%", width: 9, height: 9, borderRadius: "50%", background: colors.blue, opacity: 0.8 }} />
        <span style={{ position: "absolute", top: "30%", right: "18%", width: 5, height: 5, borderRadius: "50%", background: colors.red, opacity: 0.7 }} />
        <span style={{ position: "absolute", bottom: "22%", left: "6%", width: 5, height: 5, borderRadius: "50%", background: colors.olive, opacity: 0.65 }} />
        <span style={{ position: "absolute", bottom: "16%", right: "7%", width: 7, height: 7, borderRadius: "50%", background: colors.red, opacity: 0.7 }} />

        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
          <img
            src="/logo.jpg"
            alt="Spritz Connection"
            style={{ width: 84, height: 84, borderRadius: "50%", border: `2px solid ${colors.orange}`, boxShadow: "0 6px 16px rgba(232,95,38,0.18)" }}
          />
        </div>
        <h1 style={{ fontFamily: fonts.display, fontSize: 24, margin: "0 0 6px", textAlign: "center" }}>Spritz Connection</h1>
        <p style={{ fontSize: 14, color: colors.muted, margin: "0 0 16px", textAlign: "center" }}>
          Les prochaines soirées italiennes à Paris.
        </p>

        {!authLoading && (
          <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
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
          </div>
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
                width: 84,
                flexShrink: 0,
                background: "linear-gradient(160deg, rgba(242,118,46,0.32), rgba(240,180,41,0.28))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <CategoryIcon category={cat} size={56} />
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
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: colors.muted }}>
                <User size={13} /> Organisé par {e.organizer}
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
