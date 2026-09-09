import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, User, Shield, Heart, X } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { colors, fonts } from "../lib/theme";

const DEMO_EVENTS = [
  {
    id: "demo-1",
    title: "Spritz al Tramonto",
    organizer: "Fabio",
    event_date: "2026-09-12T19:00:00",
    address: "12 Quai de Valmy, 75010 Paris",
    seats: 40,
    taken: 27
  }
];

export default function Feed() {
  const navigate = useNavigate();
  const [events, setEvents] = useState(DEMO_EVENTS);
  const [loading, setLoading] = useState(true);
  const [showJoinBanner, setShowJoinBanner] = useState(true);

  useEffect(() => {
    async function load() {
      if (!import.meta.env.VITE_SUPABASE_URL) {
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("event_date", { ascending: true });
      if (!error && data) setEvents(data);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div style={{ padding: "24px 20px 100px" }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
        <img
          src="/logo.jpg"
          alt="Spritz Connection"
          style={{ width: 84, height: 84, borderRadius: "50%", border: `2px solid ${colors.orange}` }}
        />
      </div>
      <h1 style={{ fontFamily: fonts.display, fontSize: 24, margin: "0 0 6px", textAlign: "center" }}>Spritz Connection</h1>
      <p style={{ fontSize: 14, color: colors.muted, margin: "0 0 20px", textAlign: "center" }}>
        Les prochaines soirées italiennes à Paris.
      </p>

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

      {loading && <p style={{ color: colors.muted, fontSize: 13 }}>Chargement…</p>}

      {!loading && events.length === 0 && (
        <p style={{ color: colors.muted, fontSize: 13, marginBottom: 20 }}>
          Aucun événement programmé pour le moment — reviens bientôt !
        </p>
      )}

      {events.map((e) => (
        <div
          key={e.id}
          onClick={() => navigate(`/event/${e.id}`)}
          style={{
            background: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: 18,
            padding: 16,
            marginBottom: 14,
            cursor: "pointer"
          }}
        >
          <h2 style={{ fontFamily: fonts.display, fontSize: 18, margin: "0 0 8px" }}>{e.title}</h2>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: colors.muted, marginBottom: 4 }}>
            <Calendar size={14} /> {new Date(e.event_date).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: colors.muted }}>
            <User size={14} /> Organisé par {e.organizer}
          </div>
        </div>
      ))}

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
  );
}
