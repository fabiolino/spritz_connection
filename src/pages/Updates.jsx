import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Sparkles } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { colors, fonts } from "../lib/theme";

// Page publique « Nouveautés » : les améliorations de l'app, la plus récente en premier
export default function Updates() {
  const navigate = useNavigate();
  const [items, setItems] = useState(null);
  useEffect(() => {
    supabase
      .from("app_updates")
      .select("id, title, body, published_at")
      .not("published_at", "is", null)
      .order("published_at", { ascending: false })
      .limit(30)
      .then(({ data }) => setItems(data || []));
  }, []);
  return (
    <div style={{ padding: "0 20px 40px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "18px 0 12px" }}>
        <button onClick={() => navigate(-1)} style={{ background: "none", border: "none", color: colors.ink, cursor: "pointer" }} aria-label="Retour">
          <ChevronLeft size={22} />
        </button>
        <h1 style={{ fontFamily: fonts.display, fontSize: 22, margin: 0, color: colors.navy }}>Nouveautés</h1>
      </div>
      {items === null && <p style={{ color: colors.muted }}>Chargement…</p>}
      {items && items.length === 0 && <p style={{ color: colors.muted }}>Pas encore de nouveauté publiée.</p>}
      {(items || []).map((u) => (
        <div key={u.id} style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 18, padding: 16, marginBottom: 14, boxShadow: "0 6px 16px rgba(6,43,73,0.06)" }}>
          <div style={{ fontSize: 11.5, color: colors.muted, fontWeight: 700, letterSpacing: 0.4 }}>
            {new Date(u.published_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
          </div>
          <div style={{ fontFamily: fonts.display, fontSize: 18, fontWeight: 700, color: colors.navy, margin: "4px 0 8px", display: "flex", gap: 6, alignItems: "center" }}>
            <Sparkles size={17} color={colors.orange} /> {u.title}
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{u.body}</div>
        </div>
      ))}
    </div>
  );
}
