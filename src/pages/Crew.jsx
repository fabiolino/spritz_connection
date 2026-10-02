import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Share2, Copy, Check, Gift, Trophy, CalendarPlus, Crown, Users } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthContext";
import { colors, fonts } from "../lib/theme";
import { appUrl } from "../lib/invite";
import { shareContent } from "../lib/share";
import CrewAvatar from "../components/CrewAvatar.jsx";

const PEOPLE_PER_VOUCHER = 5; // aligné avec la fonction SQL crew_my_stats

function SectionTitle({ children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "26px 0 12px" }}>
      <h2 style={{ fontFamily: fonts.display, fontSize: 19, margin: 0, color: colors.navy }}>{children}</h2>
      <i style={{ display: "inline-block", width: 34, height: 6, background: colors.orange, borderRadius: 99, transform: "rotate(-6deg)" }} />
    </div>
  );
}

const card = {
  background: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: 18,
  padding: 16,
  boxShadow: "0 6px 16px rgba(6,43,73,0.07)"
};

const PERKS = [
  {
    icon: "🔗",
    title: "Ton lien personnel",
    text: "Chaque personne qui s'inscrit à une soirée grâce à ton lien t'est attribuée — avec ou sans compte, seule ou en groupe."
  },
  {
    icon: "🍹",
    title: "5 personnes = 1 Spritz offert",
    text: "Toutes les 5 personnes venues grâce à toi, tu gagnes un bon Spritz."
  },
  {
    icon: "🎟️",
    title: "2 bons = 1 soirée offerte",
    text: "À 10 personnes, choisis : deux Spritz, ou ton entrée offerte à la soirée de ton choix."
  },
  {
    icon: "🏆",
    title: "Spritz Crew du mois",
    text: "Le membre de la Crew qui a ramené le plus de monde dans le mois gagne un cadre doré et la couronne sur son profil tout le mois suivant."
  },
  {
    icon: "🎉",
    title: "Co-organisateur",
    text: "Propose tes propres soirées, gratuites ou payantes. Chaque proposition est validée par Fabio avant publication ; pour une soirée payante, Fabio encaisse via l'app et te reverse ta part."
  },
  {
    icon: "👑",
    title: "Le badge Spritz Crew",
    text: "Ta couronne est visible dans la communauté et dans la liste des participants."
  }
];

export default function Crew() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [stats, setStats] = useState(null);
  const [board, setBoard] = useState([]);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!import.meta.env.VITE_SUPABASE_URL) return;
    supabase.rpc("crew_leaderboard").then(({ data }) => setBoard(data || []));
  }, []);

  useEffect(() => {
    if (!user || !import.meta.env.VITE_SUPABASE_URL) return;
    supabase.rpc("crew_my_stats").then(({ data }) => setStats((data && data[0]) || null));
  }, [user]);

  const isCrew = !!(stats?.is_ambassador ?? profile?.is_ambassador);
  const link = profile?.referral_code ? appUrl(`/?ref=${profile.referral_code}`) : null;
  const monthLabel = new Date().toLocaleDateString("fr-FR", { month: "long" });
  const ranked = board.filter((b) => b.people > 0);
  const crewOfMonth = board.find((b) => b.crew_of_month);
  const progress = stats ? stats.people_counted % PEOPLE_PER_VOUCHER : 0;

  async function handleShare() {
    if (!link) return;
    const result = await shareContent({
      title: "Spritz Connection",
      text: "Viens aux soirées Spritz Connection avec moi ! Inscris-toi ici 🍹",
      url: link
    });
    if (result === "copied") setMsg("Lien copié !");
    if (result === "failed") setMsg("Impossible de partager pour le moment.");
    if (result === "copied" || result === "failed") setTimeout(() => setMsg(""), 2500);
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(link);
      setMsg("Lien copié !");
    } catch {
      setMsg(link);
    }
    setTimeout(() => setMsg(""), 2500);
  }

  return (
    <div style={{ paddingBottom: 60 }}>
      <div
        style={{
          background: colors.navy,
          color: "#fff",
          padding: "16px 20px 26px",
          borderBottom: `6px solid ${colors.orange}`,
          position: "relative",
          overflow: "hidden"
        }}
      >
        <button
          onClick={() => navigate(-1)}
          aria-label="Retour"
          style={{ background: "rgba(255,255,255,0.14)", border: "none", color: "#fff", borderRadius: "50%", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
        >
          <ChevronLeft size={20} />
        </button>
        <div style={{ position: "absolute", right: -10, top: 8, fontSize: 92, opacity: 0.16, transform: "rotate(12deg)" }}>👑</div>
        <div style={{ marginTop: 14, fontSize: 11, letterSpacing: "0.18em", fontWeight: 700, color: colors.gold }}>AMBASSADEURS</div>
        <h1 style={{ fontFamily: fonts.display, fontSize: 30, margin: "4px 0 8px", lineHeight: 1.05 }}>Spritz Crew</h1>
        <p style={{ fontSize: 14, lineHeight: 1.5, margin: 0, opacity: 0.9, maxWidth: 330 }}>
          Celles et ceux qui font vivre les soirées : ils ramènent leurs amis, proposent des événements, et sont récompensés pour ça.
        </p>
      </div>

      <div style={{ padding: "0 20px" }}>
        {user && isCrew && stats && (
          <>
            <SectionTitle>Mon tableau de bord</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <div style={{ ...card, padding: 14 }}>
                <div style={{ fontSize: 11.5, color: colors.muted }}>En {monthLabel}</div>
                <div style={{ fontFamily: fonts.display, fontSize: 30, fontWeight: 700, color: colors.navy, lineHeight: 1.1 }}>{stats.people_this_month}</div>
                <div style={{ fontSize: 11.5, color: colors.muted }}>
                  personne{stats.people_this_month > 1 ? "s" : ""} ramenée{stats.people_this_month > 1 ? "s" : ""}
                  {stats.rank_this_month ? ` · ${stats.rank_this_month}${stats.rank_this_month === 1 ? "er" : "e"}` : ""}
                </div>
              </div>
              <div style={{ ...card, padding: 14, background: stats.vouchers_available > 0 ? "rgba(255,197,43,0.16)" : colors.surface, borderColor: stats.vouchers_available > 0 ? colors.gold : colors.border }}>
                <div style={{ fontSize: 11.5, color: colors.muted }}>Bons disponibles</div>
                <div style={{ fontFamily: fonts.display, fontSize: 30, fontWeight: 700, color: colors.navy, lineHeight: 1.1 }}>{stats.vouchers_available}</div>
                <div style={{ fontSize: 11.5, color: colors.muted }}>1 bon = 1 Spritz · 2 = 1 soirée</div>
              </div>
            </div>
            <div style={{ ...card, marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 6 }}>
                <span>Prochain bon Spritz</span>
                <strong>
                  {progress}/{PEOPLE_PER_VOUCHER}
                </strong>
              </div>
              <div style={{ height: 10, background: colors.bg, borderRadius: 99, overflow: "hidden", border: `1px solid ${colors.border}` }}>
                <div style={{ width: `${(progress / PEOPLE_PER_VOUCHER) * 100}%`, height: "100%", background: colors.orange, borderRadius: 99 }} />
              </div>
              <p style={{ fontSize: 11.5, color: colors.muted, margin: "8px 0 0", lineHeight: 1.45 }}>
                {stats.people_total} personne{stats.people_total > 1 ? "s" : ""} inscrite{stats.people_total > 1 ? "s" : ""} grâce à toi au total
                {stats.people_total !== stats.people_counted ? ` (${stats.people_counted} déjà venue${stats.people_counted > 1 ? "s" : ""} : on compte les bons une fois la soirée passée)` : ""}.
                {stats.vouchers_available > 0 ? " Pour utiliser un bon, montre cette page à Fabio à la soirée." : ""}
              </p>
            </div>
            {link && (
              <div style={{ ...card, marginBottom: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Mon lien personnel</div>
                <div
                  style={{
                    fontFamily: "ui-monospace, Menlo, monospace",
                    fontSize: 12,
                    background: colors.bg,
                    border: `1px solid ${colors.border}`,
                    borderRadius: 10,
                    padding: "8px 10px",
                    wordBreak: "break-all",
                    marginBottom: 10
                  }}
                >
                  {link}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={handleShare} style={{ ...btn, background: colors.orange, color: "#fff", border: "none" }}>
                    <Share2 size={14} /> Partager
                  </button>
                  <button onClick={handleCopy} style={{ ...btn, background: "none", color: colors.navy }}>
                    {msg === "Lien copié !" ? <Check size={14} /> : <Copy size={14} />} Copier
                  </button>
                </div>
                {msg && msg !== "Lien copié !" && <p style={{ fontSize: 11.5, color: colors.muted, marginTop: 6 }}>{msg}</p>}
                <p style={{ fontSize: 11.5, color: colors.muted, margin: "8px 0 0", lineHeight: 1.45 }}>
                  Astuce : le bouton « Inviter » d'une soirée partage aussi ton lien personnel.
                </p>
              </div>
            )}
            <button
              onClick={() => navigate("/propose-event")}
              style={{ ...btn, width: "100%", flex: "none", padding: 13, background: colors.navy, color: "#fff", border: "none" }}
            >
              <CalendarPlus size={15} /> Proposer une soirée (co-organisateur)
            </button>
          </>
        )}

        <SectionTitle>Classement de {monthLabel}</SectionTitle>
        {crewOfMonth && (
          <div style={{ ...card, display: "flex", alignItems: "center", gap: 12, marginBottom: 12, borderColor: colors.gold, background: "rgba(255,197,43,0.12)" }}>
            <CrewAvatar name={crewOfMonth.name} photoUrl={crewOfMonth.photo_url} size={52} crewOfMonth />
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", color: "#9A6B00" }}>SPRITZ CREW DU MOIS</div>
              <div style={{ fontFamily: fonts.display, fontSize: 18, fontWeight: 700, color: colors.navy }}>{crewOfMonth.name}</div>
              <div style={{ fontSize: 11.5, color: colors.muted }}>Champion·ne du mois dernier — bravo !</div>
            </div>
          </div>
        )}
        {ranked.length === 0 ? (
          <p style={{ fontSize: 13, color: colors.muted, lineHeight: 1.5 }}>
            Personne n'a encore ramené de monde ce mois-ci : la première place est à prendre ! 🍹
          </p>
        ) : (
          <div style={{ ...card, padding: "6px 14px" }}>
            {ranked.slice(0, 10).map((b, i) => (
              <div
                key={b.profile_id}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 0", borderTop: i === 0 ? "none" : `1px solid ${colors.border}` }}
              >
                <div style={{ width: 22, textAlign: "center", fontFamily: fonts.display, fontWeight: 700, fontSize: 17, color: i === 0 ? colors.orange : colors.navy }}>
                  {i === 0 ? <Trophy size={18} color={colors.gold} /> : i + 1}
                </div>
                <CrewAvatar name={b.name} photoUrl={b.photo_url} size={38} crew crewOfMonth={b.crew_of_month} />
                <div style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {b.name}
                  {user && b.profile_id === user.id && <span style={{ color: colors.orange }}> (toi)</span>}
                </div>
                <div style={{ fontSize: 13, fontWeight: 800, color: colors.navy, display: "flex", alignItems: "center", gap: 4 }}>
                  <Users size={13} color={colors.orange} /> {b.people}
                </div>
              </div>
            ))}
          </div>
        )}

        <SectionTitle>Les avantages Spritz Crew</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {PERKS.map((p) => (
            <div key={p.title} style={{ ...card, display: "flex", gap: 12, padding: 14 }}>
              <div style={{ fontSize: 26, lineHeight: 1 }}>{p.icon}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: colors.navy, marginBottom: 3 }}>{p.title}</div>
                <div style={{ fontSize: 12.5, color: colors.muted, lineHeight: 1.5 }}>{p.text}</div>
              </div>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 11.5, color: colors.muted, lineHeight: 1.5, marginTop: 12 }}>
          Les personnes sont comptées une fois la soirée passée ; ta propre inscription ne compte pas ; une réservation
          annulée est retirée. Le statut Spritz Crew est attribué par Fabio et peut être retiré en cas d'abus.
        </p>

        {!isCrew && (
          <div style={{ ...card, marginTop: 18, textAlign: "center", background: "rgba(240,90,25,0.06)", borderColor: colors.orange }}>
            <Crown size={22} color={colors.orange} />
            <div style={{ fontFamily: fonts.display, fontSize: 17, fontWeight: 700, color: colors.navy, margin: "4px 0 6px" }}>Envie de rejoindre la Crew ?</div>
            <p style={{ fontSize: 12.5, color: colors.muted, lineHeight: 1.5, margin: "0 0 12px" }}>
              Tu viens souvent et tu aimes faire découvrir nos soirées ? Écris à Fabio, ou parle-lui en à la prochaine soirée.
            </p>
            <a
              href="mailto:fabiocasilli@gmail.com?subject=Je%20veux%20rejoindre%20la%20Spritz%20Crew"
              style={{ ...btn, display: "inline-flex", flex: "none", background: colors.orange, color: "#fff", border: "none", textDecoration: "none", padding: "11px 18px" }}
            >
              <Gift size={14} /> Je veux en faire partie
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

const btn = {
  flex: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  borderRadius: 12,
  padding: 10,
  fontSize: 13,
  fontWeight: 700,
  border: `1.5px solid ${colors.navy}`,
  cursor: "pointer",
  boxSizing: "border-box"
};
