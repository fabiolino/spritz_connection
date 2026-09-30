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
        bottom: 0,
        transform: "translateX(-50%)",
        width: "min(480px, 100vw)",
        boxSizing: "border-box",
        padding: "9px 12px calc(9px + env(safe-area-inset-bottom))",
        background: colors.navy,
        borderRadius: "26px 26px 0 0",
        boxShadow: "0 -8px 28px rgba(25,43,64,.18)",
        zIndex: 50,
        display: "grid",
        gridTemplateColumns: "repeat(5, 1fr)",
        gap: 2
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
              background: "transparent",
              color: isActive ? colors.orange : "#fff",
              padding: "3px 2px 1px",
              minWidth: 0,
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              fontFamily: fonts.body,
              fontSize: 10.5,
              fontWeight: isActive ? 700 : 500,
              opacity: isActive ? 1 : .92
            }}
          >
            <Icon size={21} strokeWidth={isActive ? 2.5 : 2} />
            <span>{label}</span>
            <span
              aria-hidden="true"
              style={{
                width: isActive ? 34 : 0,
                height: 3,
                borderRadius: 99,
                background: colors.orange,
                transition: "width .2s ease"
              }}
            />
          </button>
        );
      })}
    </nav>
  );
}
