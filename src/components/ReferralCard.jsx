import React, { useEffect, useState } from "react";
import { Gift, Copy, Share2 } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthContext";
import { colors, fonts } from "../lib/theme";
import { appUrl } from "../lib/invite";
import { shareContent } from "../lib/share";

const THRESHOLD = 3; // doit rester aligné avec REFERRAL_THRESHOLD dans api/_registration.js

export default function ReferralCard() {
  const { user, profile } = useAuth();
  const [rewardedCount, setRewardedCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!user || !import.meta.env.VITE_SUPABASE_URL) return;
    supabase
      .from("referrals")
      .select("status")
      .eq("referrer_id", user.id)
      .then(({ data }) => {
        if (!data) return;
        setRewardedCount(data.filter((r) => r.status === "rewarded").length);
        setPendingCount(data.filter((r) => r.status === "pending").length);
      });
  }, [user]);

  if (!user || !profile?.referral_code) return null;

  const creditsUsed = profile.referral_credits_used || 0;
  const availableCredits = Math.max(0, Math.floor(rewardedCount / THRESHOLD) - creditsUsed);
  const progressInCycle = rewardedCount % THRESHOLD;
  const link = appUrl(`/?ref=${profile.referral_code}`);

  async function handleShare() {
    const result = await shareContent({
      title: "Spritz Connection",
      text: "Rejoins-moi sur Spritz Connection, l'appli des soirées italiennes à Paris !",
      url: link
    });
    if (result === "copied") setMsg("Lien copié !");
    if (result === "failed") setMsg("Impossible de partager pour le moment.");
    if (result === "copied" || result === "failed") setTimeout(() => setMsg(""), 2500);
  }

  return (
    <div
      style={{
        background: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: 16,
        padding: 16,
        marginBottom: 20
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <Gift size={17} color={colors.orange} />
        <h2 style={{ fontFamily: fonts.display, fontSize: 15.5, margin: 0 }}>Parraine tes amis</h2>
      </div>

      <p style={{ fontSize: 12.5, color: colors.muted, lineHeight: 1.5, margin: "0 0 12px" }}>
        Invite tes amis avec ton lien personnel. Dès que {THRESHOLD} filleuls ont participé à leur
        première soirée payante, tu gagnes une entrée gratuite.
      </p>

      {availableCredits > 0 ? (
        <div
          style={{
            background: "rgba(255,197,43,0.15)",
            border: `1px solid ${colors.gold}`,
            borderRadius: 12,
            padding: "10px 12px",
            fontSize: 13,
            fontWeight: 700,
            marginBottom: 12
          }}
        >
          🎉 Tu as {availableCredits} entrée{availableCredits > 1 ? "s" : ""} gratuite{availableCredits > 1 ? "s" : ""} à
          utiliser — l'option apparaîtra au moment de payer ta prochaine soirée.
        </div>
      ) : (
        <p style={{ fontSize: 12, color: colors.ink, margin: "0 0 12px" }}>
          {progressInCycle} / {THRESHOLD} filleul{progressInCycle > 1 ? "s" : ""} payant{progressInCycle > 1 ? "s" : ""}
          {" "}— encore {THRESHOLD - progressInCycle} pour ta prochaine entrée gratuite.
          {pendingCount > 0 && (
            <span style={{ color: colors.muted }}>
              {" "}
              ({pendingCount} en attente d'une première participation payée)
            </span>
          )}
        </p>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <div
          style={{
            flex: 1,
            background: colors.bg,
            border: `1px solid ${colors.border}`,
            borderRadius: 10,
            padding: "9px 11px",
            fontSize: 12.5,
            color: colors.muted,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap"
          }}
        >
          {link}
        </div>
        <button
          onClick={handleShare}
          aria-label="Partager mon lien de parrainage"
          style={{
            background: colors.orange,
            color: "#fff",
            border: "none",
            borderRadius: 10,
            padding: "0 14px",
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12.5,
            fontWeight: 700,
            cursor: "pointer"
          }}
        >
          {navigator.share ? <Share2 size={14} /> : <Copy size={14} />} Partager
        </button>
      </div>
      {msg && <p style={{ fontSize: 11.5, color: colors.olive, marginTop: 6 }}>{msg}</p>}
    </div>
  );
}
