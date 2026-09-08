import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, User, Shield } from "lucide-react";
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
      <h1 style={{ fontFamily: fonts.display, fontSize: 24, margin: "0 0 6px" }}>Spritz Connection</h1>
      <p style={{ fontSize: 14, color: colors.muted, margin: "0 0 20px" }}>
        Les prochaines soirées italiennes à Paris.
      </p>

      {loading && <p style={{ color: colors.muted, fontSize: 13 }}>Chargement…</p>}

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
