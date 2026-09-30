import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Calendar, User, Shield, Heart, X, LogIn, MapPin, Navigation, Share2,
  Users2, HelpCircle, Wine, Music2, Globe2, Utensils, UsersRound,
  ChevronRight, Clock3
} from "lucide-react";
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
  },
  {
    id: "demo-2",
    title: "Apéro Italiano",
    organizer: "Spritz Connection",
    event_date: "2026-10-17T19:00:00",
    address: "Paris — La Terrasse",
    seats: 60,
    taken: 42,
    category: "apero",
    latitude: 48.8566,
    longitude: 2.3522
  }
];

const RADII = [5, 10, 20];

const EVENT_IMAGES = {
  // Direction photo : Italie réelle, lumière chaude, convivialité, spritz et gastronomie.
  // Pas de mojitos, pas de restaurant générique, pas de banques d'images froides.
  hero: "https://create.bainbridgebarn.org/web/image/event.event/181694/image_1024",
  apero: "https://images.gayborhood.com/mil/aperitivo-culture-done-right.webp",
  concert: "https://images.xceed.me/clubs/gallery/terrazza-martini-club-milano-xceed-6.jpg?fm=auto&h=1920&q=90&w=1920",
  soiree: "https://lirp.cdn-website.com/f9831a4e/dms3rep/multi/opt/Vista%2BSky%2BBar%2BDj-cdc8302f-1920w.jpg",
  degustation: "https://cdn.foodstorm.com/8f1f75b066de46f09379f9d055593dc6/images/4a3df2b29ef14857a5ea0ffd6301cc8e_720w.jpg",
  default: "https://images.squarespace-cdn.com/content/v1/5c71847992441b1f77ae73a1/1600348181315-O5Y5NOAFVW1MT07GMKAT/PAESAN%2BLOW%2BRES%2BSEPTEMBER%2B2020%2B%40lateef.photography-11-2.jpg"
};

const CATEGORY_CARDS = [
  { key: "apero", label: "Apéros", icon: Wine, color: colors.orange, text: "#fff" },
  { key: "concert", label: "Concerts", icon: Music2, color: colors.gold, text: colors.navy },
  { key: "soiree", label: "Soirées", icon: Globe2, color: colors.navy, text: "#fff" },
  { key: "degustation", label: "Dégustations", icon: Utensils, color: colors.orange, text: "#fff" },
  { key: "community", label: "Communauté", icon: UsersRound, color: colors.gold, text: colors.navy }
];

function formatEventDate(value) {
  const d = new Date(value);
  return {
    day: d.toLocaleDateString("fr-FR", { day: "2-digit" }),
    month: d.toLocaleDateString("fr-FR", { month: "short" }).replace(".", "").toUpperCase()
  };
}

export default function Feed() {
  const navigate = useNavigate();
  const location = useLocation();
  const isEventsPage = location.pathname === "/events";
  const { user, profile, loading: authLoading } = useAuth();
  const { getCategory } = useCategories();

  const [events, setEvents] = useState(DEMO_EVENTS);
  const [loading, setLoading] = useState(true);
  const [showJoinBanner, setShowJoinBanner] = useState(false);
  const [shareMsg, setShareMsg] = useState("");
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState("");
  const [radius, setRadius] = useState(null);

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

      if (!error && data?.length) setEvents(data);
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
    if (result === "copied" || result === "failed") {
      setTimeout(() => setShareMsg(""), 2500);
    }
  }

  const visibleEvents = useMemo(() => {
    if (!radius || !userLocation) return events;
    return events.filter((e) => {
      const d = distanceKm(userLocation.lat, userLocation.lon, e.latitude, e.longitude);
      return d === null ? true : d <= radius;
    });
  }, [events, radius, userLocation]);

  const featuredEvents = visibleEvents.slice(0, 4);

  return (
    <div style={{ minHeight: "100vh", background: colors.bg, paddingBottom: 118 }}>
      {!isEventsPage ? (
        <>
          {/* HERO — reproduction de la maquette validée */}
          <section
            style={{
              position: "relative",
              height: 438,
              overflow: "hidden",
              backgroundImage: `linear-gradient(180deg, rgba(6,43,73,.05) 18%, rgba(6,43,73,.08) 42%, rgba(6,43,73,.64) 100%), url("${EVENT_IMAGES.hero}")`,
              backgroundSize: "cover",
              backgroundPosition: "center"
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "radial-gradient(circle at 18% 55%, rgba(255,181,20,.16), transparent 26%), radial-gradient(circle at 82% 32%, rgba(232,95,38,.10), transparent 30%)"
              }}
            />

            <button
              onClick={() => navigate("/")}
              aria-label="Spritz Connection"
              style={{
                position: "absolute",
                top: 24,
                left: 20,
                width: 116,
                height: 116,
                padding: 0,
                border: 0,
                borderRadius: "50%",
                background: "#fff",
                overflow: "hidden",
                boxShadow: "0 8px 22px rgba(0,0,0,.24)",
                cursor: "pointer",
                zIndex: 2
              }}
            >
              <img
                src="/logo.jpg"
                alt="Spritz Connection"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </button>

            <div
              style={{
                position: "absolute",
                left: 24,
                bottom: 30,
                width: "64%",
                color: "#fff",
                zIndex: 2
              }}
            >
              <div
                style={{
                  fontFamily: "'Brush Script MT', 'Segoe Script', cursive",
                  fontSize: 48,
                  lineHeight: .88,
                  fontWeight: 700,
                  letterSpacing: "-.035em",
                  textShadow: "0 4px 14px rgba(0,0,0,.38)"
                }}
              >
                Des<br />rencontres<br />qui ont<br />du goût
              </div>
              <div
                style={{
                  width: 72,
                  height: 7,
                  borderRadius: 99,
                  background: colors.orange,
                  transform: "rotate(-5deg)",
                  marginTop: 10,
                  marginLeft: 4
                }}
              />
            </div>

            <div
              style={{
                position: "absolute",
                left: 212,
                top: 214,
                width: 58,
                height: 13,
                borderRadius: 99,
                background: colors.gold,
                transform: "rotate(-54deg)",
                opacity: .95
              }}
            />
            <div
              style={{
                position: "absolute",
                left: 226,
                top: 244,
                width: 48,
                height: 11,
                borderRadius: 99,
                background: colors.gold,
                transform: "rotate(-35deg)",
                opacity: .95
              }}
            />
            <div
              style={{
                position: "absolute",
                left: 246,
                top: 266,
                width: 42,
                height: 10,
                borderRadius: 99,
                background: colors.gold,
                transform: "rotate(-18deg)",
                opacity: .95
              }}
            />
          </section>

          {/* CATEGORIES */}
          <section
            style={{
              background: colors.bg,
              borderRadius: "28px 28px 0 0",
              marginTop: -1,
              position: "relative",
              padding: "16px 14px 0"
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
                gap: 7,
                alignItems: "start"
              }}
            >
              {CATEGORY_CARDS.map(({ key, label, icon: Icon, color, text }) => (
                <button
                  key={key}
                  onClick={() => navigate(key === "community" ? "/community" : "/events")}
                  style={{
                    border: 0,
                    background: "transparent",
                    padding: 0,
                    cursor: "pointer",
                    minWidth: 0,
                    color: colors.navy,
                    fontFamily: fonts.body
                  }}
                >
                  <span
                    style={{
                      display: "flex",
                      width: "100%",
                      aspectRatio: "1 / .92",
                      maxWidth: 70,
                      margin: "0 auto 7px",
                      borderRadius: 16,
                      alignItems: "center",
                      justifyContent: "center",
                      background: color,
                      color: text,
                      boxShadow: "0 5px 10px rgba(6,43,73,.08)"
                    }}
                  >
                    <Icon size={31} strokeWidth={2.1} />
                  </span>
                  <span
                    style={{
                      display: "block",
                      fontSize: 10.5,
                      lineHeight: 1.05,
                      fontWeight: 750,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis"
                    }}
                  >
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </section>

          {/* PROCHAINS ÉVÉNEMENTS */}
          <section style={{ padding: "18px 14px 0", background: colors.bg }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                marginBottom: 12
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <h2
                  style={{
                    margin: 0,
                    color: colors.navy,
                    fontFamily: fonts.display,
                    fontSize: 27,
                    lineHeight: 1
                  }}
                >
                  Prochains événements
                </h2>
                <span
                  style={{
                    width: 44,
                    height: 6,
                    borderRadius: 99,
                    background: colors.orange,
                    transform: "rotate(-5deg)",
                    marginTop: 12
                  }}
                />
              </div>
              <button
                onClick={() => navigate("/events")}
                style={{
                  border: 0,
                  background: "transparent",
                  color: colors.orange,
                  fontWeight: 800,
                  fontSize: 12.5,
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                  cursor: "pointer",
                  whiteSpace: "nowrap"
                }}
              >
                Voir tout <ChevronRight size={18} />
              </button>
            </div>

            {loading && <p style={{ color: colors.muted, fontSize: 13 }}>Chargement…</p>}

            {!loading && featuredEvents.length === 0 && (
              <p style={{ color: colors.muted, fontSize: 13 }}>
                Aucun événement pour le moment.
              </p>
            )}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 10
              }}
            >
              {featuredEvents.map((e) => {
                const cat = getCategory(e.category);
                const date = formatEventDate(e.event_date);

                return (
                  <button
                    key={e.id}
                    onClick={() => navigate(`/event/${e.id}`)}
                    style={{
                      padding: 0,
                      textAlign: "left",
                      border: 0,
                      overflow: "hidden",
                      borderRadius: 20,
                      background: colors.navy,
                      color: "#fff",
                      cursor: "pointer",
                      boxShadow: "0 8px 18px rgba(6,43,73,.16)"
                    }}
                  >
                    <div
                      style={{
                        position: "relative",
                        height: 174,
                        backgroundImage: `linear-gradient(180deg, rgba(6,43,73,.04) 25%, rgba(6,43,73,.90) 100%), url("${EVENT_IMAGES[e.category] || EVENT_IMAGES.default}")`,
                        backgroundSize: "cover",
                        backgroundPosition: "center"
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          top: 10,
                          right: 10,
                          width: 31,
                          height: 31,
                          borderRadius: "50%",
                          background: "rgba(6,43,73,.40)",
                          border: "1px solid rgba(255,255,255,.75)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center"
                        }}
                      >
                        <Heart size={17} color="#fff" />
                      </div>

                      <div
                        style={{
                          position: "absolute",
                          left: 10,
                          right: 10,
                          bottom: 10,
                          display: "flex",
                          gap: 9,
                          alignItems: "flex-end"
                        }}
                      >
                        <div style={{ width: 40, flexShrink: 0 }}>
                          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".08em" }}>
                            {new Date(e.event_date).toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", "").toUpperCase()}
                          </div>
                          <div style={{ color: colors.orange, fontSize: 31, lineHeight: .9, fontWeight: 900 }}>
                            {date.day}
                          </div>
                          <div style={{ fontSize: 10, fontWeight: 800, marginTop: 2 }}>
                            {date.month}
                          </div>
                        </div>

                        <div style={{ borderLeft: "1px solid rgba(255,255,255,.35)", paddingLeft: 9, minWidth: 0 }}>
                          <div
                            style={{
                              fontFamily: fonts.display,
                              fontSize: 19,
                              lineHeight: 1,
                              marginBottom: 7
                            }}
                          >
                            {e.title}
                          </div>
                          <div style={{ fontSize: 10.5, display: "flex", alignItems: "center", gap: 4, marginBottom: 3 }}>
                            <Clock3 size={11} /> {new Date(e.event_date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} – 01h00
                          </div>
                          <div style={{ fontSize: 10.5, display: "flex", alignItems: "center", gap: 4 }}>
                            <MapPin size={11} /> {e.address?.split(",")[0] || "Paris"}
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* CONTROLES DISCRETS — les fonctions restent accessibles sans casser la maquette */}
          <section style={{ padding: "18px 14px 0", background: colors.bg }}>
            {!authLoading && (
              <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
                {user ? (
                  <button
                    onClick={() => navigate("/account")}
                    style={{
                      background: colors.surface,
                      border: `1px solid ${colors.border}`,
                      color: colors.ink,
                      borderRadius: 999,
                      padding: "8px 13px",
                      fontSize: 11.5,
                      fontWeight: 700,
                      cursor: "pointer"
                    }}
                  >
                    {profile?.is_member && "⭐ "}{profile?.name || user.email}
                  </button>
                ) : (
                  <button
                    onClick={() => navigate("/login")}
                    style={{
                      background: colors.surface,
                      border: `1px solid ${colors.border}`,
                      color: colors.ink,
                      borderRadius: 999,
                      padding: "8px 13px",
                      fontSize: 11.5,
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 5
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
                    borderRadius: 999,
                    padding: "8px 13px",
                    fontSize: 11.5,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 5
                  }}
                >
                  <Share2 size={13} /> Partager
                </button>
              </div>
            )}
            {shareMsg && (
              <p style={{ textAlign: "center", fontSize: 11, color: colors.muted, margin: "7px 0 0" }}>
                {shareMsg}
              </p>
            )}
          </section>
        </>
      ) : (
        <section style={{ background: colors.bg, minHeight: "100vh", padding: "24px 14px 0" }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <div style={{ color: colors.orange, fontSize: 10, fontWeight: 900, letterSpacing: ".14em", textTransform: "uppercase" }}>
                Spritz Connection
              </div>
              <h1 style={{ fontFamily: fonts.display, color: colors.navy, fontSize: 31, lineHeight: 1, margin: "5px 0 0" }}>
                Tous les événements
              </h1>
            </div>
            <button
              onClick={requestLocation}
              style={{
                width: 42,
                height: 42,
                borderRadius: "50%",
                border: `1px solid ${colors.border}`,
                background: colors.surface,
                color: colors.navy,
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
              aria-label="Filtrer par proximité"
            >
              <Navigation size={18} />
            </button>
          </div>

          {userLocation && (
            <div style={{ display: "flex", gap: 7, marginBottom: 14 }}>
              {RADII.map((r) => (
                <button
                  key={r}
                  onClick={() => setRadius(radius === r ? null : r)}
                  style={{
                    border: `1.5px solid ${radius === r ? colors.orange : colors.border}`,
                    background: radius === r ? "rgba(232,95,38,.10)" : colors.surface,
                    color: colors.navy,
                    borderRadius: 999,
                    padding: "6px 11px",
                    fontSize: 11,
                    fontWeight: 800
                  }}
                >
                  {r} km
                </button>
              ))}
            </div>
          )}

          {locationError && <p style={{ color: colors.red, fontSize: 11.5 }}>{locationError}</p>}

          <div style={{ display: "grid", gap: 12 }}>
            {visibleEvents.map((e) => {
              const cat = getCategory(e.category);
              return (
                <button
                  key={e.id}
                  onClick={() => navigate(`/event/${e.id}`)}
                  style={{
                    border: 0,
                    padding: 0,
                    textAlign: "left",
                    borderRadius: 20,
                    overflow: "hidden",
                    background: colors.navy,
                    color: "#fff"
                  }}
                >
                  <div
                    style={{
                      height: 180,
                      backgroundImage: `linear-gradient(180deg, transparent 30%, rgba(6,43,73,.92)), url("${EVENT_IMAGES[e.category] || EVENT_IMAGES.default}")`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      padding: 14,
                      display: "flex",
                      alignItems: "flex-end"
                    }}
                  >
                    <div>
                      <div style={{ color: colors.orange, fontSize: 10, fontWeight: 900, textTransform: "uppercase" }}>
                        {cat.label}
                      </div>
                      <div style={{ fontFamily: fonts.display, fontSize: 24, lineHeight: 1.05, marginTop: 4 }}>
                        {e.title}
                      </div>
                      <div style={{ fontSize: 11.5, marginTop: 7, opacity: .9 }}>
                        {new Date(e.event_date).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div style={{ marginTop: 18, display: "grid", gap: 9 }}>
            <button onClick={() => navigate("/propose-event")} style={{ width: "100%", padding: 12, borderRadius: 14, border: `1px solid ${colors.orange}`, background: "transparent", color: colors.orange, fontWeight: 800 }}>
              Organiser une soirée gratuite
            </button>
            <button onClick={() => navigate("/help")} style={{ width: "100%", padding: 12, borderRadius: 14, border: `1px solid ${colors.border}`, background: "transparent", color: colors.muted, fontWeight: 700 }}>
              <HelpCircle size={15} style={{ verticalAlign: "middle", marginRight: 5 }} /> Aide & FAQ
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
