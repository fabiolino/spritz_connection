import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Lock, Star } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { startCheckout } from "../lib/sumupClient";
import { useAuth } from "../lib/AuthContext";
import { colors, fonts } from "../lib/theme";

const MEMBERSHIP_PRICE = 25; // doit rester aligné avec Join.jsx

export default function Register() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const [event, setEvent] = useState(null);
  const [addMembership, setAddMembership] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      if (!import.meta.env.VITE_SUPABASE_URL) {
        setEvent({ price_member: 8, price_nonmember: 12 });
        return;
      }
      const { data } = await supabase
        .from("events")
        .select("price_member, price_nonmember")
        .eq("id", id)
        .single();
      setEvent(data);
    }
    load();
  }, [id]);

  if (authLoading || !event) return null;

  if (!user) {
    return (
      <div style={{ padding: "0 20px 40px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "18px 0 16px" }}>
          <button onClick={() => navigate(`/event/${id}`)} style={{ background: "none", border: "none", color: colors.ink, cursor: "pointer" }}>
            <ChevronLeft size={22} />
          </button>
          <h1 style={{ fontFamily: fonts.display, fontSize: 20, margin: 0 }}>Inscription</h1>
        </div>
        <p style={{ fontSize: 13, color: colors.muted, marginBottom: 16, lineHeight: 1.5 }}>
          Connecte-toi pour t'inscrire — ça permet d'appliquer automatiquement ton tarif si tu es déjà membre.
        </p>
        <button
          onClick={() => navigate("/login")}
          style={{ width: "100%", background: colors.orange, color: colors.ink, border: "none", borderRadius: 14, padding: 14, fontWeight: 700, fontSize: 15, cursor: "pointer" }}
        >
          Se connecter
        </button>
      </div>
    );
  }

  const isMember = !!profile?.is_member;
  const ticketPrice = isMember ? event.price_member : event.price_nonmember;
  const total = ticketPrice + (addMembership ? MEMBERSHIP_PRICE : 0);
  const option = addMembership ? "both" : "billet";

  async function handlePay() {
    setLoading(true);
    setError("");
    try {
      await startCheckout({ eventId: id, option, amount: total * 100, userId: user.id, userEmail: user.email });
    } catch (err) {
      setError("Le paiement n'a pas pu démarrer — vérifie que le backend SumUp est configuré.");
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: "0 20px 40px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "18px 0 16px" }}>
        <button onClick={() => navigate(`/event/${id}`)} style={{ background: "none", border: "none", color: colors.ink, cursor: "pointer" }}>
          <ChevronLeft size={22} />
        </button>
        <h1 style={{ fontFamily: fonts.display, fontSize: 20, margin: 0 }}>Inscription</h1>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: 14,
          padding: "12px 14px",
          marginBottom: 20
        }}
      >
        {isMember && <Star size={15} color={colors.gold} />}
        <div style={{ fontSize: 13 }}>
          {isMember ? (
            <>Tarif membre appliqué — <strong>{event.price_member} €</strong></>
          ) : (
            <>Tarif non-membre — <strong>{event.price_nonmember} €</strong></>
          )}
        </div>
      </div>

      {!isMember && (
        <div
          onClick={() => setAddMembership((v) => !v)}
          style={{
            border: `1.5px solid ${addMembership ? colors.orange : colors.border}`,
            background: addMembership ? "rgba(242,118,46,0.08)" : colors.surface,
            borderRadius: 14,
            padding: "14px 16px",
            cursor: "pointer",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20
          }}
        >
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 3 }}>Adhérer en même temps</div>
            <div style={{ fontSize: 12, color: colors.muted }}>Profite du tarif membre dès la prochaine soirée</div>
          </div>
          <span style={{ fontSize: 14, fontWeight: 700, color: colors.orange, whiteSpace: "nowrap" }}>
            + {MEMBERSHIP_PRICE} €
          </span>
        </div>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 14,
          fontWeight: 700,
          padding: "0 4px",
          marginBottom: 14
        }}
      >
        <span>Total</span>
        <span>{total} €</span>
      </div>

      {error && <p style={{ color: colors.red, fontSize: 13, marginBottom: 10 }}>{error}</p>}

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
