import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Check, X } from "lucide-react";
import { colors, fonts } from "../lib/theme";

const DEMO_REQUESTS = [
  { id: 1, name: "Giulia R.", note: "Envie d'organiser une soirée cinéma italien à Belleville." }
];

export default function Admin() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState(DEMO_REQUESTS);

  return (
    <div style={{ padding: "0 20px 40px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "18px 0 16px" }}>
        <button onClick={() => navigate("/")} style={{ background: "none", border: "none", color: colors.cream, cursor: "pointer" }}>
          <ChevronLeft size={22} />
        </button>
        <h1 style={{ fontFamily: fonts.display, fontSize: 20, margin: 0 }}>Co-organisateurs</h1>
      </div>

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
              style={{ flex: 1, background: "none", border: `1px solid ${colors.border}`, color: colors.cream, borderRadius: 10, padding: 8, cursor: "pointer" }}
            >
              <X size={14} style={{ verticalAlign: "middle", marginRight: 6 }} /> Refuser
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
