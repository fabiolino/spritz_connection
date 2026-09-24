import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Ticket as TicketIcon, ChevronRight } from "lucide-react";
import { useAuth } from "../lib/AuthContext";
import { authHeaders } from "../lib/sumupClient";
import { colors, fonts } from "../lib/theme";

export default function MyTickets() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [tickets, setTickets] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading || !user) return;
    async function load() {
      try {
        const res = await fetch("/api/create-sumup-checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(await authHeaders()) },
          body: JSON.stringify({ action: "my-tickets" })
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Erreur");
          return;
        }
        setTickets(data.tickets || []);
      } catch (err) {
        setError("Impossible de contacter le serveur");
      }
    }
    load();
  }, [authLoading, user]);

  if (authLoading) return null;

  const now = Date.now();
  const upcoming = (tickets || []).filter((t) => !t.event || new Date(t.event.event_date).getTime() > now - 12 * 3600 * 1000);
  const past = (tickets || []).filter((t) => !upcoming.includes(t));

  function renderTicket(t) {
    return (
      <button
        key={t.id}
        onClick={() => navigate(`/ticket/${t.id}`)}
        style={{
          width: "100%",
          textAlign: "left",
          display: "flex",
          alignItems: "center",
          gap: 12,
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: 14,
          padding: "12px 14px",
          marginBottom: 10,
          cursor: "pointer",
          color: colors.ink
        }}
      >
        <TicketIcon size={20} color={colors.orange} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {t.event ? t.event.title : "Adhésion annuelle"}
          </div>
          <div style={{ fontSize: 12, color: colors.muted }}>
            {t.event
              ? new Date(t.event.event_date).toLocaleString("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })
              : "Adhésion"}
            {" · "}
            <span style={{ fontFamily: "ui-monospace, Menlo, monospace", fontWeight: 700, color: colors.ink }}>{t.code}</span>
            {!t.paid && t.external && <span style={{ color: "#9A6B00" }}> · réservé</span>}
          </div>
        </div>
        <ChevronRight size={18} color={colors.muted} />
      </button>
    );
  }

  return (
    <div style={{ padding: "0 20px 40px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "18px 0 16px" }}>
        <button onClick={() => navigate("/account")} style={{ background: "none", border: "none", color: colors.ink, cursor: "pointer" }}>
          <ChevronLeft size={22} />
        </button>
        <h1 style={{ fontFamily: fonts.display, fontSize: 20, margin: 0 }}>Mes billets</h1>
      </div>

      {!user && (
        <p style={{ fontSize: 13, color: colors.muted }}>Connecte-toi pour voir tes billets.</p>
      )}
      {error && <p style={{ color: colors.red, fontSize: 13 }}>{error}</p>}
      {user && !error && tickets === null && <p style={{ color: colors.muted, fontSize: 13 }}>Chargement…</p>}
      {tickets && tickets.length === 0 && (
        <p style={{ fontSize: 13, color: colors.muted, lineHeight: 1.5 }}>
          Aucun billet pour l'instant. Les billets des soirées payées en ligne dans l'app apparaîtront ici.
        </p>
      )}

      {upcoming.length > 0 && upcoming.map(renderTicket)}
      {past.length > 0 && (
        <>
          <h2 style={{ fontFamily: fonts.display, fontSize: 15, margin: "18px 0 10px", color: colors.muted }}>Soirées passées</h2>
          {past.map(renderTicket)}
        </>
      )}
    </div>
  );
}
