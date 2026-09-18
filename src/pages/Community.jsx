import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthContext";
import { colors, fonts } from "../lib/theme";

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
        .select("id, name, photo_url, tastes, is_member")
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
            <div
              style={{
                width: 62,
                height: 62,
                borderRadius: "50%",
                margin: "0 auto 8px",
                background: m.photo_url ? `url(${m.photo_url}) center/cover` : colors.border,
                border: `2px solid ${m.is_member ? colors.gold : colors.bg}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 19,
                fontWeight: 700,
                color: colors.muted
              }}
            >
              {!m.photo_url && (m.name?.[0]?.toUpperCase() || "?")}
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: colors.ink }}>{m.name || "Anonyme"}</div>
            {m.tastes?.length > 0 && (
              <div style={{ fontSize: 10, color: colors.muted, marginTop: 2 }}>{m.tastes.slice(0, 2).join(" · ")}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
