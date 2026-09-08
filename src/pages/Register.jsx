import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Lock } from "lucide-react";
import { startCheckout } from "../lib/sumupClient";
import { colors, fonts } from "../lib/theme";

const OPTIONS = [
  { id: "billet", label: "Billet pour la soirée", price: 12 },
  { id: "adhesion", label: "Adhésion Spritz Connection (annuelle)", price: 25 },
  { id: "both", label: "Billet + adhésion", price: 37 }
];

export default function Register() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [option, setOption] = useState("billet");
  const [loading, setLoading] = useState(false);

  const chosen = OPTIONS.find((o) => o.id === option);

  async function handlePay() {
    setLoading(true);
    try {
      await startCheckout({ eventId: id, option, amount: chosen.price * 100 });
    } catch (err) {
      alert("Le paiement n'a pas pu démarrer — vérifie que le backend SumUp est configuré (voir README).");
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: "0 20px 40px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "18px 0 16px" }}>
        <button onClick={() => navigate(`/event/${id}`)} style={{ background: "none", border: "none", color: colors.cream, cursor: "pointer" }}>
          <ChevronLeft size={22} />
        </button>
        <h1 style={{ fontFamily: fonts.display, fontSize: 20, margin: 0 }}>Inscription</h1>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
        {OPTIONS.map((opt) => (
          <div
            key={opt.id}
            onClick={() => setOption(opt.id)}
            style={{
              border: `1.5px solid ${option === opt.id ? colors.orange : colors.border}`,
              background: option === opt.id ? "rgba(242,118,46,0.08)" : colors.surface,
              borderRadius: 14,
              padding: "14px 16px",
              cursor: "pointer",
              display: "flex",
              justifyContent: "space-between"
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 600 }}>{opt.label}</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: colors.orange }}>{opt.price} €</span>
          </div>
        ))}
      </div>

      <button
        onClick={handlePay}
        disabled={loading}
        style={{
          width: "100%",
          background: colors.orange,
          color: colors.ink,
          border: "none",
          borderRadius: 14,
          padding: 14,
          fontWeight: 700,
          fontSize: 15,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8
        }}
      >
        <Lock size={15} /> {loading ? "Redirection vers le paiement…" : "Payer en ligne"}
      </button>
    </div>
  );
}
