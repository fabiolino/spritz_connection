import React from "react";
import { LayoutDashboard, CalendarDays, Inbox, Users, Building2, ClipboardCheck } from "lucide-react";
import { colors, fonts } from "../lib/theme";

export const ADMIN_SECTIONS = [
  { key: "accueil", label: "Tableau de bord", icon: LayoutDashboard },
  { key: "soirees", label: "Soirées & inscrits", icon: CalendarDays },
  { key: "autres", label: "Autres applications", icon: Inbox },
  { key: "membres", label: "Membres & Spritz Crew", icon: Users },
  { key: "lieux", label: "Lieux partenaires", icon: Building2 },
  { key: "propositions", label: "Propositions & co-organisateurs", icon: ClipboardCheck }
];

// Mise en page de l'admin sur ordinateur : menu à gauche, contenu en grand à droite
export default function AdminDesktopShell({ section, onSection, controls, counts = {}, children }) {
  const current = ADMIN_SECTIONS.find((s) => s.key === section);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "300px minmax(0, 1fr)", minHeight: "100vh", background: colors.bg }}>
      <aside
        style={{
          borderRight: `1px solid ${colors.border}`,
          background: colors.surface,
          padding: "8px 20px 28px",
          position: "sticky",
          top: 0,
          height: "100vh",
          overflowY: "auto",
          boxSizing: "border-box"
        }}
      >
        {controls}
        <nav style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
          {ADMIN_SECTIONS.map((s) => {
            const active = s.key === section;
            const Icon = s.icon;
            const count = counts[s.key];
            return (
              <button
                key={s.key}
                onClick={() => onSection(s.key)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  width: "100%",
                  textAlign: "left",
                  background: active ? "rgba(240,90,25,0.1)" : "none",
                  border: "none",
                  borderLeft: `3px solid ${active ? colors.orange : "transparent"}`,
                  borderRadius: 10,
                  padding: "10px 12px",
                  fontSize: 14,
                  fontWeight: active ? 800 : 600,
                  color: active ? colors.navy : colors.ink,
                  cursor: "pointer"
                }}
              >
                <Icon size={17} color={active ? colors.orange : colors.muted} />
                <span style={{ flex: 1 }}>{s.label}</span>
                {count > 0 && (
                  <span style={{ background: colors.orange, color: "#fff", borderRadius: 20, padding: "1px 8px", fontSize: 11.5, fontWeight: 800 }}>{count}</span>
                )}
              </button>
            );
          })}
        </nav>
      </aside>
      <main style={{ padding: "28px 40px 60px", minWidth: 0 }}>
        <div style={{ maxWidth: section === "accueil" ? 1100 : 860 }}>
          <h1 style={{ fontFamily: fonts.display, fontSize: 28, color: colors.navy, margin: "0 0 22px" }}>{current?.label}</h1>
          {children}
        </div>
      </main>
    </div>
  );
}

function fmtDate(iso, opts) {
  return new Date(iso).toLocaleString("fr-FR", { timeZone: "Europe/Paris", ...opts });
}

const th = { textAlign: "left", fontSize: 11.5, textTransform: "uppercase", letterSpacing: 0.6, color: colors.muted, padding: "10px 14px", borderBottom: `2px solid ${colors.border}` };
const td = { padding: "12px 14px", borderBottom: `1px solid ${colors.border}`, fontSize: 14, verticalAlign: "middle" };

function EventsTable({ events, onOpenEvent, past }) {
  return (
    <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 16, overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={th}>Date</th>
            <th style={th}>Soirée</th>
            <th style={{ ...th, width: 260 }}>{past ? "Participants" : "Remplissage"}</th>
            <th style={{ ...th, width: 110 }} />
          </tr>
        </thead>
        <tbody>
          {events.map((e) => {
            const pct = e.seats ? Math.min(100, Math.round(((e.taken || 0) / e.seats) * 100)) : 0;
            const full = e.seats && (e.taken || 0) >= e.seats;
            return (
              <tr key={e.id}>
                <td style={{ ...td, whiteSpace: "nowrap" }}>
                  <strong>{fmtDate(e.event_date, { weekday: "short", day: "numeric", month: "short" })}</strong>
                  <div style={{ color: colors.muted, fontSize: 12.5 }}>{fmtDate(e.event_date, { hour: "2-digit", minute: "2-digit" })}</div>
                </td>
                <td style={td}>
                  <strong>{e.title}</strong>
                  {e.visibility === "private" && <span style={{ marginLeft: 8, fontSize: 11.5, color: colors.muted }}>🔒 privée</span>}
                  {e.approved === false && <span style={{ marginLeft: 8, fontSize: 11.5, color: colors.orange, fontWeight: 700 }}>à valider</span>}
                </td>
                <td style={td}>
                  {e.seats ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ flex: 1, height: 8, background: colors.bg, borderRadius: 8, overflow: "hidden", border: `1px solid ${colors.border}` }}>
                        <div style={{ width: `${pct}%`, height: "100%", background: full ? colors.olive : colors.orange }} />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", color: full ? colors.olive : colors.ink }}>
                        {e.taken || 0} / {e.seats}
                        {full ? " · complet" : ""}
                      </span>
                    </div>
                  ) : (
                    <span style={{ color: colors.muted, fontSize: 13 }}>{e.taken || 0} inscrits</span>
                  )}
                </td>
                <td style={{ ...td, textAlign: "right" }}>
                  <button
                    onClick={() => onOpenEvent(e.id)}
                    style={{ background: colors.navy, color: "#fff", border: "none", borderRadius: 10, padding: "8px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
                  >
                    Gérer
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Tableau de bord : chiffres clés et prochaines soirées
export function AdminDashboard({ events, pendingCount, onOpenEvent, onSection }) {
  const now = Date.now();
  const upcoming = (events || []).filter((e) => new Date(e.event_date).getTime() >= now - 6 * 3600 * 1000).sort((a, b) => new Date(a.event_date) - new Date(b.event_date));
  const past = (events || []).filter((e) => new Date(e.event_date).getTime() < now - 6 * 3600 * 1000).slice(0, 6);
  const booked = upcoming.reduce((n, e) => n + (e.taken || 0), 0);
  const seats = upcoming.reduce((n, e) => n + (e.seats || 0), 0);
  const cards = [
    { label: "Soirées à venir", value: upcoming.length },
    { label: "Places réservées à venir", value: seats ? `${booked} / ${seats}` : booked },
    { label: "Taux de remplissage", value: seats ? `${Math.round((booked / seats) * 100)} %` : "—" },
    { label: "Propositions en attente", value: pendingCount, action: pendingCount ? () => onSection("propositions") : null }
  ];
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 16, marginBottom: 28 }}>
        {cards.map((c) => (
          <div
            key={c.label}
            onClick={c.action || undefined}
            style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 16, padding: "16px 18px", cursor: c.action ? "pointer" : "default" }}
          >
            <div style={{ fontSize: 12.5, color: colors.muted, fontWeight: 600 }}>{c.label}</div>
            <div style={{ fontFamily: fonts.display, fontSize: 30, fontWeight: 700, color: colors.navy, marginTop: 4 }}>{c.value}</div>
          </div>
        ))}
      </div>
      <h2 style={{ fontFamily: fonts.display, fontSize: 19, color: colors.navy, margin: "0 0 12px" }}>Prochaines soirées</h2>
      {upcoming.length ? <EventsTable events={upcoming} onOpenEvent={onOpenEvent} /> : <p style={{ color: colors.muted }}>Aucune soirée à venir.</p>}
      {past.length > 0 && (
        <>
          <h2 style={{ fontFamily: fonts.display, fontSize: 19, color: colors.navy, margin: "28px 0 12px" }}>Dernières soirées</h2>
          <EventsTable events={past} onOpenEvent={onOpenEvent} past />
        </>
      )}
      <p style={{ fontSize: 12.5, color: colors.muted, marginTop: 16 }}>
        Astuce : valide d'abord ton mot de passe administrateur à gauche pour afficher les inscrits, la liste d'attente et les notes.
      </p>
    </>
  );
}
