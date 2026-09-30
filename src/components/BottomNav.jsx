import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Home, CalendarDays, UsersRound, MapPin, UserRound } from "lucide-react";
import { colors, fonts } from "../lib/theme";

const items = [
  { to: "/", label: "Accueil", icon: Home },
  { to: "/events", label: "Événements", icon: CalendarDays },
  { to: "/community", label: "Communauté", icon: UsersRound },
  { to: "/venues", label: "Carte", icon: MapPin },
  { to: "/account", label: "Profil", icon: UserRound }
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const active = (to) => {
    if (to === "/") return location.pathname === "/";
    if (to === "/events") return location.pathname === "/events" || location.pathname.startsWith("/event/");
    return location.pathname === to || location.pathname.startsWith(to + "/");
  };

  return (
    <nav
      aria-label="Navigation principale"
      style={{
        position: "fixed",
        left: "50%",
        bottom: 10,
        transform: "translateX(-50%)",
        width: "min(470px, calc(100vw - 20px))",
        boxSizing: "border-box",
        padding: "8px 8px calc(8px + env(safe-area-inset-bottom))",
        background: colors.navy,
        border: "1px solid rgba(255,255,255,.10)",
        borderRadius: 24,
        boxShadow: "0 10px 30px rgba(6,43,73,.30)",
        zIndex: 50,
        display: "grid",
        gridTemplateColumns: "repeat(5, 1fr)",
        gap: 2,
        backdropFilter: "blur(12px)"
      }}
    >
      {items.map(({ to, label, icon: Icon }) => {
        const isActive = active(to);
        return (
          <button
            key={to}
            onClick={() => navigate(to)}
            aria-current={isActive ? "page" : undefined}
            style={{
              border: 0,
              background: isActive ? "rgba(232,95,38,.16)" : "transparent",
              color: isActive ? colors.orange : "rgba(255,255,255,.92)",
              borderRadius: 16,
              padding: "6px 2px 5px",
              minWidth: 0,
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              fontFamily: fonts.body,
              fontSize: 10.5,
              fontWeight: isActive ? 800 : 650
            }}
          >
            <span
              style={{
                width: 34,
                height: 28,
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "transparent",
                color: isActive ? colors.orange : "rgba(255,255,255,.92)",
                boxShadow: "none"
              }}
            >
              <Icon size={17} strokeWidth={2.5} />
            </span>
            <span>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
