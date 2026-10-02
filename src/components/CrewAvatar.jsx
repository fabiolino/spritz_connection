import React from "react";
import { colors } from "../lib/theme";

export function isCrewOfMonth(p) {
  return !!p?.crew_of_month_until && new Date(p.crew_of_month_until) > new Date();
}

// Avatar rond avec les distinctions Spritz Crew :
//  - membre Spritz Crew : petite couronne 👑
//  - Spritz Crew du mois : cadre doré épais + couronne, pendant tout le mois suivant
export default function CrewAvatar({ name, photoUrl, size = 40, crew = false, crewOfMonth = false, member = false, style }) {
  const ring = crewOfMonth ? Math.max(3, Math.round(size / 14)) : 2;
  const badge = Math.max(14, Math.round(size * 0.38));
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0, ...style }}>
      <div
        style={{
          width: size,
          height: size,
          boxSizing: "border-box",
          borderRadius: "50%",
          background: photoUrl ? `url(${photoUrl}) center/cover` : colors.border,
          border: `${ring}px solid ${crewOfMonth ? colors.gold : member ? colors.gold : colors.bg}`,
          boxShadow: crewOfMonth ? `0 0 0 2px ${colors.orange}, 0 4px 12px rgba(255,197,43,0.55)` : "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: Math.round(size * 0.32),
          fontWeight: 700,
          color: colors.muted
        }}
      >
        {!photoUrl && (name?.[0]?.toUpperCase() || "?")}
      </div>
      {(crew || crewOfMonth) && (
        <span
          title={crewOfMonth ? "Spritz Crew du mois" : "Spritz Crew"}
          style={{
            position: "absolute",
            right: -3,
            bottom: -3,
            width: badge,
            height: badge,
            borderRadius: "50%",
            background: crewOfMonth ? colors.gold : colors.navy,
            border: `2px solid #fff`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: Math.round(badge * 0.6),
            lineHeight: 1
          }}
        >
          👑
        </span>
      )}
    </div>
  );
}
