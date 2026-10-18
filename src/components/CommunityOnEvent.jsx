import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { colors, fonts } from "../lib/theme";
import CrewAvatar from "./CrewAvatar.jsx";

// Sur la fiche d'une soirée : quels amis de mes communautés y vont (ceux qui acceptent de le montrer).
// Invisible tant que la personne n'a pas de communauté et que personne n'y va ; sans effet si la
// migration « communautés » n'est pas encore passée.
export default function CommunityOnEvent({ eventId }) {
  const navigate = useNavigate();
  const [friends, setFriends] = useState([]);
  const [hasCommunity, setHasCommunity] = useState(true);

  useEffect(() => {
    let alive = true;
    async function load() {
      const [{ data: going, error: e1 }, { data: mine, error: e2 }] = await Promise.all([
        supabase.rpc("friends_on_event", { p_event_id: eventId }),
        supabase.rpc("my_communities")
      ]);
      if (!alive || e1 || e2) return;
      setFriends(going || []);
      setHasCommunity((mine || []).length > 0);
    }
    load();
    return () => {
      alive = false;
    };
  }, [eventId]);

  if (friends.length === 0 && hasCommunity) return null;

  return (
    <div
      style={{
        background: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: 16,
        padding: 14,
        marginBottom: 14,
        boxShadow: "0 3px 10px rgba(6,43,73,0.05)"
      }}
    >
      {friends.length > 0 ? (
        <>
          <div style={{ fontFamily: fonts.display, fontSize: 15, fontWeight: 700, marginBottom: 8 }}>
            🍹 {friends.length === 1 ? "Un ami de ta communauté y va" : `${friends.length} amis de ta communauté y vont`}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {friends.map((f) => (
              <div key={f.user_id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                <CrewAvatar name={f.name} photoUrl={f.photo_url} size={28} />
                <span>{String(f.name || "").split(" ")[0]}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <div style={{ fontFamily: fonts.display, fontSize: 15, fontWeight: 700, marginBottom: 4 }}>👥 Viens avec tes amis</div>
          <p style={{ fontSize: 12, color: colors.muted, margin: "0 0 10px", lineHeight: 1.45 }}>
            Crée ta petite communauté : tes amis voient quand tu réserves une soirée, et tu peux les inviter plus facilement.
          </p>
          <button
            onClick={() => navigate("/communities")}
            style={{ background: colors.orange, color: colors.ink, border: "none", borderRadius: 12, padding: "9px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
          >
            Créer ma communauté
          </button>
        </>
      )}
    </div>
  );
}
