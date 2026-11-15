import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Megaphone, X } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { colors, fonts } from "../lib/theme";

// Bandeau « message à tous » envoyé depuis l'admin : le plus récent des 14 derniers jours,
// affiché jusqu'à ce que la personne le ferme (mémorisé sur l'appareil).
const KEY = "sc_broadcast_seen";

function seenIds() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export default function BroadcastBanner() {
  const [msg, setMsg] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const since = new Date(Date.now() - 14 * 86400000).toISOString();
    supabase
      .from("admin_broadcasts")
      .select("id, title, body, url, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data }) => {
        const seen = seenIds();
        setMsg((data || []).find((b) => !seen.includes(b.id)) || null);
      });
  }, []);

  if (!msg || pathname.startsWith("/admin") || pathname.startsWith("/lieu/")) return null;

  function dismiss() {
    try {
      localStorage.setItem(KEY, JSON.stringify([msg.id, ...seenIds()].slice(0, 30)));
    } catch {}
    setMsg(null);
  }

  function openLink() {
    const url = msg.url;
    dismiss();
    if (!url) return;
    if (url.startsWith("/")) navigate(url);
    else window.open(url, "_blank", "noopener");
  }

  const long = msg.body.length > 140;
  return (
    <div
      style={{
        margin: "10px 12px 0",
        background: colors.navy,
        color: "#fff",
        borderRadius: 16,
        padding: "12px 14px",
        borderBottom: `4px solid ${colors.orange}`,
        boxShadow: "0 8px 20px rgba(6,43,73,0.18)",
        position: "relative"
      }}
    >
      <button
        onClick={dismiss}
        aria-label="Fermer"
        style={{ position: "absolute", top: 8, right: 8, background: "none", border: "none", color: "#fff", opacity: 0.8, cursor: "pointer", padding: 4 }}
      >
        <X size={18} />
      </button>
      <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 16, display: "flex", gap: 7, alignItems: "center", paddingRight: 26 }}>
        <Megaphone size={16} color={colors.gold} /> {msg.title}
      </div>
      <div style={{ fontSize: 13.5, lineHeight: 1.5, marginTop: 6, whiteSpace: "pre-wrap" }}>
        {long && !expanded ? msg.body.slice(0, 130).replace(/\s+\S*$/, "") + "… " : msg.body}
        {long && !expanded && (
          <button onClick={() => setExpanded(true)} style={{ background: "none", border: "none", color: colors.gold, fontWeight: 700, padding: 0, cursor: "pointer", fontSize: 13.5 }}>
            Lire la suite
          </button>
        )}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        {msg.url && (
          <button onClick={openLink} style={{ background: colors.orange, color: "#fff", border: "none", borderRadius: 10, padding: "7px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
            Voir
          </button>
        )}
        <button onClick={dismiss} style={{ background: "rgba(255,255,255,0.12)", color: "#fff", border: "none", borderRadius: 10, padding: "7px 14px", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
          OK, compris
        </button>
      </div>
    </div>
  );
}
