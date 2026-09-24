import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Lock, Star } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { startCheckout } from "../lib/sumupClient";
import { useAuth } from "../lib/AuthContext";
import { colors, fonts } from "../lib/theme";
import { ADVANCE_PRICE_FOR_ALL, onlineEntryPrice } from "../lib/pricing";

const MEMBERSHIP_PRICE = 25; // doit rester aligné avec Join.jsx

function formatEuro(n) {
  const v = Number(n) || 0;
  return v.toLocaleString("fr-FR", { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 }) + " €";
}

export default function Register() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const [event, setEvent] = useState(null);
  const [eventOptions, setEventOptions] = useState([]);
  const [selectedOptionIds, setSelectedOptionIds] = useState([]);
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

      const { data: options } = await supabase
        .from("event_options")
        .select("id, label, price, onsite_price")
        .eq("event_id", id)
        .order("price", { ascending: true });
      if (options) setEventOptions(options);
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
          Connecte-toi pour t'inscrire et payer en ligne — tu recevras ton billet dans l'app.
        </p>
        <button
          onClick={() => navigate("/login")}
          style={{ width: "100%", background: colors.orange, color: "#fff", border: "none", borderRadius: 14, padding: 14, fontWeight: 700, fontSize: 15, cursor: "pointer", boxShadow: "0 4px 12px rgba(232,95,38,0.3)" }}
        >
          Se connecter
        </button>
      </div>
    );
  }

  const isMember = !!profile?.is_member;
  const ticketPrice = onlineEntryPrice(event, isMember);

  function toggleOption(optId) {
    setSelectedOptionIds((prev) => (prev.includes(optId) ? prev.filter((x) => x !== optId) : [...prev, optId]));
  }

  const chosenOptions = eventOptions.filter((o) => selectedOptionIds.includes(o.id));
  const optionsTotal = chosenOptions.reduce((sum, o) => sum + Number(o.price), 0);
  const total = Math.round((Number(ticketPrice) + optionsTotal + (addMembership ? MEMBERSHIP_PRICE : 0)) * 100) / 100;
  const option = addMembership ? "both" : "billet";

  async function handlePay() {
    setLoading(true);
    setError("");
    try {
      await startCheckout({
        eventId: id,
        option,
        selectedOptionIds: chosenOptions.map((o) => o.id)
      });
    } catch (err) {
      setError(err.message || "Le paiement n'a pas pu démarrer.");
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
          {ADVANCE_PRICE_FOR_ALL ? (
            <>
              Tarif réservation à l'avance —{" "}
              {Number(event.price_nonmember) > Number(event.price_member) && (
                <span style={{ textDecoration: "line-through", color: colors.muted, marginRight: 4 }}>{formatEuro(event.price_nonmember)}</span>
              )}
              <strong>{formatEuro(event.price_member)}</strong>
            </>
          ) : isMember ? (
            <>Tarif membre appliqué — <strong>{event.price_member} €</strong></>
          ) : (
            <>Tarif non-membre — <strong>{event.price_nonmember} €</strong></>
          )}
        </div>
      </div>

      {eventOptions.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Options en supplément</div>
          {eventOptions.map((o) => {
            const checked = selectedOptionIds.includes(o.id);
            return (
              <div
                key={o.id}
                onClick={() => toggleOption(o.id)}
                style={{
                  border: `1.5px solid ${checked ? colors.orange : colors.border}`,
                  background: checked ? "rgba(242,118,46,0.08)" : colors.surface,
                  borderRadius: 12,
                  padding: "11px 14px",
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8
                }}
              >
                <div style={{ fontSize: 13.5 }}>{o.label}</div>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: colors.orange, whiteSpace: "nowrap" }}>
                  {Number(o.onsite_price) > Number(o.price) && (
                    <span style={{ textDecoration: "line-through", color: colors.muted, fontWeight: 500, marginRight: 6 }}>
                      {formatEuro(o.onsite_price)}
                    </span>
                  )}
                  + {formatEuro(o.price)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {!isMember && !ADVANCE_PRICE_FOR_ALL && (
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
        <span>{formatEuro(total)}</span>
      </div>

      {error && <p style={{ color: colors.red, fontSize: 13, marginBottom: 10 }}>{error}</p>}

      <button
        onClick={handlePay}
        disabled={loading}
        style={{
          width: "100%",
          background: colors.orange,
          color: "#fff",
          border: "none",
          borderRadius: 14,
          padding: 14,
          fontWeight: 700,
          fontSize: 15,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          boxShadow: "0 4px 12px rgba(232,95,38,0.3)"
        }}
      >
        <Lock size={15} /> {loading ? "Redirection vers le paiement…" : `Payer ${formatEuro(total)} en ligne`}
      </button>
    </div>
  );
}
