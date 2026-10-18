import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Users } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthContext";
import { rememberAfterLogin } from "../lib/afterLogin";
import { colors, fonts } from "../lib/theme";

// Page ouverte depuis le lien d'invitation d'une communauté : /c/<code>
export default function CommunityJoin() {
  const { code } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [info, setInfo] = useState(undefined); // undefined = chargement, null = introuvable
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.rpc("community_preview", { p_code: code }).then(({ data, error: err }) => {
      setInfo(!err && data && data[0] ? data[0] : null);
    });
  }, [code]);

  function goLogin() {
    const next = `/c/${code}`;
    rememberAfterLogin(next);
    navigate(`/login?next=${encodeURIComponent(next)}`);
  }

  async function join() {
    setBusy(true);
    setError("");
    const { error: err } = await supabase.rpc("join_community", { p_code: code });
    if (err) {
      setError(err.message || "Impossible de rejoindre pour le moment.");
      setBusy(false);
      return;
    }
    navigate("/communities");
  }

  if (authLoading || info === undefined) return null;

  return (
    <div style={{ padding: "0 20px 40px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "18px 0 16px" }}>
        <button onClick={() => navigate("/")} style={{ background: "none", border: "none", color: colors.ink, cursor: "pointer" }}>
          <ChevronLeft size={22} />
        </button>
        <h1 style={{ fontFamily: fonts.display, fontSize: 20, margin: 0 }}>Invitation</h1>
      </div>

      <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 18, padding: 20, textAlign: "center" }}>
        {info === null ? (
          <p style={{ fontSize: 14, color: colors.muted, margin: 0 }}>Ce lien n'est plus valable : la communauté n'existe plus.</p>
        ) : (
          <>
            <Users size={26} color={colors.orange} style={{ marginBottom: 8 }} />
            <div style={{ fontFamily: fonts.display, fontSize: 20, fontWeight: 700, color: colors.navy }}>{info.name}</div>
            <p style={{ fontSize: 13.5, color: colors.muted, lineHeight: 1.5, margin: "8px 0 16px" }}>
              {info.owner_name} t'invite à rejoindre sa communauté sur Spritz Connection
              {Number(info.member_count) > 1 ? ` (${info.member_count} membres)` : ""}.
              Vous voyez quand l'un de vous réserve une soirée, et vous pouvez venir ensemble.
            </p>
            {user ? (
              <button
                onClick={join}
                disabled={busy}
                style={{ background: colors.orange, color: colors.ink, border: "none", borderRadius: 12, padding: "11px 22px", fontWeight: 800, fontSize: 14, cursor: "pointer" }}
              >
                {busy ? "…" : "Rejoindre la communauté"}
              </button>
            ) : (
              <button
                onClick={goLogin}
                style={{ background: colors.orange, color: colors.ink, border: "none", borderRadius: 12, padding: "11px 22px", fontWeight: 800, fontSize: 14, cursor: "pointer" }}
              >
                Se connecter pour rejoindre
              </button>
            )}
            {error && <p style={{ fontSize: 12.5, color: "#B3261E", margin: "12px 0 0" }}>{error}</p>}
            <p style={{ fontSize: 11.5, color: colors.muted, margin: "14px 0 0", lineHeight: 1.45 }}>
              Tu choisis si tes réservations sont visibles par la communauté, et tu peux la quitter quand tu veux.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
