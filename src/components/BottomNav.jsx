import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Home, Ticket, Crown, Users, UserRound, LogIn } from "lucide-react";
import { colors } from "../lib/theme";
import { useAuth } from "../lib/AuthContext";

// Barre de navigation permanente en bas de l'écran : on passe d'une page à l'autre
// sans dépendre du bouton « retour » du téléphone ou du navigateur.
export const NAV_HEIGHT = 64;

// Pages où la barre est masquée (la discussion a sa propre zone de saisie en bas d'écran)
const HIDDEN = [/^\/event\/[^/]+\/chat/];

export function useBottomNavVisible() {
  const { pathname } = useLocation();
  return !HIDDEN.some((re) => re.test(pathname));
}

export default function BottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user } = useAuth();
  const visible = useBottomNavVisible();
  if (!visible) return null;

  const tabs = [
    { to: "/", label: "Soirées", icon: Home, match: (p) => p === "/" || p.startsWith("/event") },
    { to: "/tickets", label: "Billets", icon: Ticket, match: (p) => p.startsWith("/ticket") },
    { to: "/crew", label: "Crew", icon: Crown, match: (p) => p.startsWith("/crew") },
    { to: "/community", label: "Communauté", icon: Users, match: (p) => p.startsWith("/community") || p.startsWith("/friends") },
    user
      ? { to: "/account", label: "Compte", icon: UserRound, match: (p) => p.startsWith("/account") || p.startsWith("/admin") }
      : { to: "/login", label: "Connexion", icon: LogIn, match: (p) => p.startsWith("/login") }
  ];

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: "50%",
        transform: "translateX(-50%)",
        width: "100%",
        maxWidth: 480,
        zIndex: 50,
        background: "rgba(255,255,255,0.97)",
        backdropFilter: "blur(8px)",
        borderTop: `1px solid ${colors.border}`,
        boxShadow: "0 -4px 16px rgba(6,43,73,0.08)",
        display: "flex",
        justifyContent: "space-around",
        paddingBottom: "env(safe-area-inset-bottom)"
      }}
    >
      {tabs.map((t) => {
        const active = t.match(pathname);
        const Icon = t.icon;
        return (
          <button
            key={t.to}
            onClick={() => {
              if (active && t.to === "/") window.scrollTo({ top: 0, behavior: "smooth" });
              navigate(t.to);
            }}
            aria-current={active ? "page" : undefined}
            style={{
              flex: 1,
              height: NAV_HEIGHT,
              background: "none",
              border: "none",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
              cursor: "pointer",
              color: active ? colors.orange : colors.muted,
              position: "relative"
            }}
          >
            {active && (
              <span style={{ position: "absolute", top: 0, width: 28, height: 3, borderRadius: 99, background: colors.orange }} />
            )}
            <Icon size={21} strokeWidth={active ? 2.4 : 1.9} />
            <span style={{ fontSize: 10.5, fontWeight: active ? 800 : 600 }}>{t.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
