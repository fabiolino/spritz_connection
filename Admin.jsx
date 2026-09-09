import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Check, X, CalendarPlus, Clock } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { colors, fonts } from "../lib/theme";

const DEMO_REQUESTS = [
  { id: 1, name: "Giulia R.", note: "Envie d'organiser une soirée cinéma italien à Belleville." }
];

export default function Admin() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState(DEMO_REQUESTS);
  const [pendingEvents, setPendingEvents] = useState([]);
  const [adminSecret, setAdminSecret] = useState("");
  const [moderating, setModerating] = useState(null);
  const [modError, setModError] = useState("");

  useEffect(() => {
    async function loadPending() {
      if (!import.meta.env.VITE_SUPABASE_URL) return;
      const { data } = await supabase.from("events").select("*").eq("approved", false);
      if (data) setPendingEvents(data);
    }
    loadPending();
  }, []);

  async function moderate(eventId, action) {
    if (!adminSecret) {
      setModError("Renseigne le mot de passe administrateur d'abord");
      return;
    }
    setModerating(eventId);
    setModError("");
    try {
      const res = await fetch("/api/moderate-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminSecret, eventId, action })
      });
      const data = await res.json();
      if (!res.ok) {
        setModError(data.error || "Erreur");
        setModerating(null);
        return;
      }
      setPendingEvents((prev) => prev.filter((e) => e.id !== eventId));
      setModerating(null);
    } catch (err) {
      setModError("Impossible de contacter le serveur");
      setModerating(null);
    }
  }

  return (
    <div style={{ padding: "0 20px 40px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "18px 0 16px" }}>
        <button onClick={() => navigate("/")} style={{ background: "none", border: "none", color: colors.ink, cursor: "pointer" }}>
          <ChevronLeft size={22} />
        </button>
        <h1 style={{ fontFamily: fonts.display, fontSize: 20, margin: 0 }}>Espace administrateur</h1>
      </div>

      <button
        onClick={() => navigate("/admin/create-event")}
        style={{
          width: "100%",
          background: colors.orange,
          color: colors.ink,
          border: "none",
          borderRadius: 14,
          padding: 13,
          fontWeight: 700,
          fontSize: 14,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          marginBottom: 28
        }}
      >
        <CalendarPlus size={16} /> Créer un événement payant
      </button>

      {pendingEvents.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontFamily: fonts.display, fontSize: 16, margin: "0 0 10px", display: "flex", alignItems: "center", gap: 6 }}>
            <Clock size={16} color={colors.orange} /> Événements gratuits en attente
          </h2>

          <input
            type="password"
            placeholder="Mot de passe administrateur"
            value={adminSecret}
            onChange={(e) => setAdminSecret(e.target.value)}
            style={{
              width: "100%",
              background: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: 12,
              padding: "10px 12px",
              color: colors.ink,
              fontSize: 13.5,
              marginBottom: 10,
              boxSizing: "border-box"
            }}
          />
          {modError && <p style={{ color: colors.red, fontSize: 12, marginBottom: 10 }}>{modError}</p>}

          {pendingEvents.map((e) => (
            <div key={e.id} style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 14, padding: 14, marginBottom: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{e.title}</div>
              <div style={{ fontSize: 12, color: colors.muted, marginBottom: 2 }}>
                Par {e.organizer} — {e.organizer_contact}
              </div>
              <div style={{ fontSize: 12, color: colors.muted, marginBottom: 12 }}>
                {new Date(e.event_date).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })} — {e.address}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  disabled={moderating === e.id}
                  onClick={() => moderate(e.id, "approve")}
                  style={{ flex: 1, background: colors.olive, border: "none", color: colors.ink, borderRadius: 10, padding: 8, fontWeight: 700, cursor: "pointer" }}
                >
                  <Check size={14} style={{ verticalAlign: "middle", marginRight: 6 }} /> Approuver
                </button>
                <button
                  disabled={moderating === e.id}
                  onClick={() => moderate(e.id, "reject")}
                  style={{ flex: 1, background: "none", border: `1px solid ${colors.border}`, color: colors.ink, borderRadius: 10, padding: 8, cursor: "pointer" }}
                >
                  <X size={14} style={{ verticalAlign: "middle", marginRight: 6 }} /> Refuser
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 style={{ fontFamily: fonts.display, fontSize: 16, margin: "0 0 10px" }}>Co-organisateurs</h2>
      <p style={{ fontSize: 13, color: colors.muted, marginBottom: 20 }}>
        Valide les demandes pour qu'une personne puisse créer ses propres soirées sous Spritz Connection.
      </p>

      {requests.map((r) => (
        <div key={r.id} style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 14, padding: 14, marginBottom: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{r.name}</div>
          <div style={{ fontSize: 13, color: colors.muted, marginBottom: 12 }}>{r.note}</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setRequests((prev) => prev.filter((x) => x.id !== r.id))}
              style={{ flex: 1, background: colors.olive, border: "none", color: colors.ink, borderRadius: 10, padding: 8, fontWeight: 700, cursor: "pointer" }}
            >
              <Check size={14} style={{ verticalAlign: "middle", marginRight: 6 }} /> Valider
            </button>
            <button
              onClick={() => setRequests((prev) => prev.filter((x) => x.id !== r.id))}
              style={{ flex: 1, background: "none", border: `1px solid ${colors.border}`, color: colors.ink, borderRadius: 10, padding: 8, cursor: "pointer" }}
            >
              <X size={14} style={{ verticalAlign: "middle", marginRight: 6 }} /> Refuser
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
