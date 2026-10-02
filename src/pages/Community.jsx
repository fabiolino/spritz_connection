import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthContext";
import { colors, fonts } from "../lib/theme";
import CrewAvatar, { isCrewOfMonth } from "../components/CrewAvatar.jsx";

export default function Community() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!import.meta.env.VITE_SUPABASE_URL) {
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, photo_url, tastes, is_member, is_ambassador, crew_of_month_until")
        .order("name", { ascending: true });
      if (!error && data) setMembers(data);
      setLoading(false);
    }
    load();
  }, []);

  if (!authLoading && !user) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <p style={{ color: colors.muted, fontSize: 14, marginBottom: 16 }}>
          Connecte-toi pour voir la communauté.
        </p>
        <button
          onClick={() => navigate("/login")}
          style={{ background: colors.orange, color: "#fff", border: "none", borderRadius: 12, padding: "10px 20px", fontWeight: 700, cursor: "pointer" }}
        >
          Se connecter
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: "0 20px 40px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "18px 0 12px" }}>
        <button onClick={() => navigate("/")} style={{ background: "none", border: "none", color: colors.ink, cursor: "pointer" }}>
          <ChevronLeft size={22} />
        </button>
        <h1 style={{ fontFamily: fonts.display, fontSize: 20, margin: 0 }}>Communauté</h1>
      </div>
      <p style={{ fontSize: 13, color: colors.muted, margin: "0 0 18px" }}>
        {members.length} membre{members.length > 1 ? "s" : ""} de Spritz Connection.
      </p>

      {loading && <p style={{ color: colors.muted, fontSize: 13 }}>Chargement…</p>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(84px, 1fr))", gap: 16 }}>
        {members.map((m) => (
          <div key={m.id} style={{ textAlign: "center" }}>
            <CrewAvatar
              name={m.name}
              photoUrl={m.photo_url}
              size={62}
              member={m.is_member}
              crew={m.is_ambassador}
              crewOfMonth={isCrewOfMonth(m)}
              style={{ margin: "0 auto 8px" }}
            />
            <div style={{ fontSize: 12, fontWeight: 600, color: colors.ink }}>{m.name || "Anonyme"}</div>
            {isCrewOfMonth(m) ? (
              <div style={{ fontSize: 9.5, fontWeight: 800, color: "#9A6B00", marginTop: 1 }}>CREW DU MOIS</div>
            ) : m.is_ambassador ? (
              <div style={{ fontSize: 9.5, fontWeight: 800, color: colors.navy, marginTop: 1 }}>SPRITZ CREW</div>
            ) : null}
            {m.tastes?.length > 0 && (
              <div style={{ fontSize: 10, color: colors.muted, marginTop: 2 }}>{m.tastes.slice(0, 2).join(" · ")}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
