import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Lock, Heart } from "lucide-react";
import { startCheckout } from "../lib/sumupClient";
import { colors, fonts } from "../lib/theme";

const MEMBERSHIP_PRICE = 25; // € / an — ajuste ici si besoin

export default function Join() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  async function handlePay() {
    setLoading(true);
    try {
      await startCheckout({
        eventId: "membership",
        option: "adhesion",
        amount: MEMBERSHIP_PRICE * 100
      });
    } catch (err) {
      alert("Le paiement n'a pas pu démarrer — vérifie la configuration SumUp.");
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: "0 20px 40px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "18px 0 16px" }}>
        <button onClick={() => navigate("/")} style={{ background: "none", border: "none", color: colors.cream, cursor: "pointer" }}>
          <ChevronLeft size={22} />
        </button>
        <h1 style={{ fontFamily: fonts.display, fontSize: 20, margin: 0 }}>Rejoindre l'association</h1>
      </div>

      <div
        style={{
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: 18,
          padding: 20,
          marginBottom: 20
        }}
      >
        <Heart size={20} color={colors.orange} style={{ marginBottom: 10 }} />
        <p style={{ fontSize: 14, lineHeight: 1.6, color: colors.cream, margin: "0 0 14px" }}>
          Devenir membre de Spritz Connection, c'est soutenir les soirées italiennes à Paris
          et profiter d'un tarif préférentiel sur chaque événement toute l'année.
        </p>
        <p style={{ fontSize: 13, color: colors.muted, margin: 0 }}>
          L'adhésion n'est jamais obligatoire pour participer aux événements — c'est simplement
          une option pour ceux qui veulent aller plus loin.
        </p>
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
        <Lock size={15} /> {loading ? "Redirection vers le paiement…" : `Adhérer — ${MEMBERSHIP_PRICE} € / an`}
      </button>
    </div>
  );
}
