import React, { useState } from "react";
import { Compass } from "lucide-react";
import { colors, fonts } from "../lib/theme";
import { HEARD_FROM_OPTIONS } from "./GroupForm.jsx";

const PERIODS = [
  { days: 30, label: "30 jours" },
  { days: 90, label: "3 mois" },
  { days: 3650, label: "Depuis le début" }
];

// Admin : d'où viennent les participants (réponses à « Comment nous as-tu connus ? »)
export default function AdminHeardFrom({ adminSecret }) {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load(d = days) {
    if (!adminSecret) {
      setError("Renseigne le mot de passe administrateur d'abord");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/manage-guests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminSecret, action: "heard-from-stats", days: d })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erreur");
      setData(json);
    } catch (err) {
      setError(err.message || "Impossible de contacter le serveur");
    }
    setBusy(false);
  }

  const rows = data
    ? HEARD_FROM_OPTIONS.map((o) => ({ ...o, n: data.counts[o.key] || 0 })).sort((a, b) => b.n - a.n)
    : [];
  const max = Math.max(1, ...rows.map((r) => r.n));

  return (
    <div style={{ marginBottom: 28 }}>
      <h2 style={{ fontFamily: fonts.display, fontSize: 16, margin: "0 0 4px", display: "flex", alignItems: "center", gap: 6 }}>
        <Compass size={16} color={colors.orange} /> Comment ils nous ont connus
      </h2>
      <p style={{ fontSize: 12, color: colors.muted, margin: "0 0 10px", lineHeight: 1.45 }}>
        Nombre de personnes inscrites par canal. Les inscriptions importées depuis Meet5 sont comptées dans « Meet5 ».
      </p>

      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        {PERIODS.map((p) => (
          <button
            key={p.days}
            type="button"
            onClick={() => {
              setDays(p.days);
              load(p.days);
            }}
            style={{
              border: `1.5px solid ${days === p.days && data ? colors.orange : colors.border}`,
              background: days === p.days && data ? "rgba(240,90,25,0.1)" : colors.surface,
              color: colors.ink,
              borderRadius: 99,
              padding: "6px 12px",
              fontSize: 12.5,
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {!data && (
        <button
          onClick={() => load()}
          disabled={busy}
          style={{ width: "100%", background: "none", border: `1px solid ${colors.border}`, color: colors.ink, borderRadius: 12, padding: 12, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
        >
          {busy ? "Chargement…" : "Afficher les statistiques"}
        </button>
      )}

      {data && (
        <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 14, padding: 14, opacity: busy ? 0.6 : 1 }}>
          {rows.map((r) => (
            <div key={r.key} style={{ marginBottom: 9 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 3 }}>
                <span style={{ fontWeight: 600 }}>{r.label}</span>
                <span>
                  <strong>{r.n}</strong>
                  {data.answered > 0 && <span style={{ color: colors.muted }}> · {Math.round((r.n / data.answered) * 100)} %</span>}
                </span>
              </div>
              <div style={{ height: 6, background: colors.border, borderRadius: 99, overflow: "hidden" }}>
                <div style={{ width: `${(r.n / max) * 100}%`, height: "100%", background: colors.orange, borderRadius: 99 }} />
              </div>
            </div>
          ))}
          <p style={{ fontSize: 11.5, color: colors.muted, margin: "10px 0 0" }}>
            {data.answered} personne{data.answered > 1 ? "s" : ""} avec une réponse sur {data.total} inscrite{data.total > 1 ? "s" : ""}
            {data.total > data.answered ? " (les inscriptions plus anciennes n'avaient pas la question)" : ""}.
          </p>
        </div>
      )}
      {error && <p style={{ color: colors.red, fontSize: 12, marginTop: 8 }}>{error}</p>}
    </div>
  );
}
