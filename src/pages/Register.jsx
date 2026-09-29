import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Lock, Star } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { startCheckout } from "../lib/sumupClient";
import { useAuth } from "../lib/AuthContext";
import { colors, fonts } from "../lib/theme";
import { ADVANCE_PRICE_FOR_ALL, groupEntryPrice } from "../lib/pricing";
import GroupForm, { Stepper, emptyGroup, groupPayload, groupError } from "../components/GroupForm.jsx";

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
  const [optionQty, setOptionQty] = useState({});
  const [group, setGroup] = useState(emptyGroup());
  const [addMembership, setAddMembership] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      if (!import.meta.env.VITE_SUPABASE_URL) {
        setEvent({ price_member: 8, price_nonmember: 12, seats: 40, taken: 27 });
        return;
      }
      const { data } = await supabase
        .from("events")
        .select("price_member, price_nonmember, seats, taken")
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

  const isMember = !!profile?.is_member;
  const seatsLeft = event.seats > 0 ? Math.max(0, event.seats - (event.taken || 0)) : null;
  const entryTotal = groupEntryPrice(event, isMember, group.quantity);

  const chosenOptions = eventOptions.filter((o) => (optionQty[o.id] || 0) > 0);
  const optionsTotal = chosenOptions.reduce((sum, o) => sum + Number(o.price) * optionQty[o.id], 0);
  const withMembership = addMembership && !!user;
  const total = Math.round((entryTotal + optionsTotal + (withMembership ? MEMBERSHIP_PRICE : 0)) * 100) / 100;
  const option = withMembership ? "both" : "billet";

  async function handlePay() {
    const check = groupError(group, user, { requireEmail: true });
    if (check) {
      setError(check);
      return;
    }
    setLoading(true);
    setError("");
    try {
      await startCheckout({
        eventId: id,
        option,
        optionQuantities: Object.fromEntries(chosenOptions.map((o) => [o.id, optionQty[o.id]])),
        ...groupPayload(group, user)
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
              <strong>{formatEuro(event.price_member)}</strong> par personne
            </>
          ) : isMember ? (
            <>Tarif membre appliqué — <strong>{event.price_member} €</strong></>
          ) : (
            <>Tarif non-membre — <strong>{event.price_nonmember} €</strong></>
          )}
        </div>
      </div>

      <GroupForm
        group={group}
        onChange={setGroup}
        user={user}
        seatsLeft={seatsLeft}
        requireEmail
        unitLabel="un seul paiement"
        onLogin={() => navigate(`/login?next=${encodeURIComponent(`/event/${id}/register`)}`)}
      />

      {eventOptions.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>Options en supplément</div>
          <div style={{ fontSize: 11.5, color: colors.muted, marginBottom: 8 }}>
            Choisis combien en prendre{group.quantity > 1 ? " pour tout le groupe" : ""}.
          </div>
          {eventOptions.map((o) => {
            const qty = optionQty[o.id] || 0;
            return (
              <div
                key={o.id}
                style={{
                  border: `1.5px solid ${qty > 0 ? colors.orange : colors.border}`,
                  background: qty > 0 ? "rgba(242,118,46,0.08)" : colors.surface,
                  borderRadius: 12,
                  padding: "10px 12px 10px 14px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 8
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>{o.label}</div>
                  <div style={{ fontSize: 13, marginTop: 2 }}>
                    {Number(o.onsite_price) > Number(o.price) && (
                      <span style={{ textDecoration: "line-through", color: colors.muted, marginRight: 6 }}>
                        {formatEuro(o.onsite_price)}
                      </span>
                    )}
                    <strong style={{ color: colors.orange }}>{formatEuro(o.price)}</strong>
                    {qty > 1 && <span style={{ color: colors.muted }}> · {formatEuro(Number(o.price) * qty)}</span>}
                  </div>
                </div>
                <Stepper value={qty} min={0} max={Math.max(20, group.quantity * 3)} onChange={(n) => setOptionQty((p) => ({ ...p, [o.id]: n }))} label={o.label} />
              </div>
            );
          })}
        </div>
      )}

      {user && !isMember && !ADVANCE_PRICE_FOR_ALL && (
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
        <span>
          Total{group.quantity > 1 ? ` · ${group.quantity} personnes` : ""}
          {group.quantity > 1 && (
            <span style={{ display: "block", fontSize: 11.5, fontWeight: 500, color: colors.muted }}>
              Entrées {formatEuro(entryTotal)}
              {optionsTotal > 0 ? ` + options ${formatEuro(optionsTotal)}` : ""}
            </span>
          )}
        </span>
        <span>{formatEuro(total)}</span>
      </div>

      {error && <p style={{ color: colors.red, fontSize: 13, marginBottom: 10 }}>{error}</p>}

      <button
        onClick={handlePay}
        disabled={loading || seatsLeft === 0}
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
        <Lock size={15} /> {seatsLeft === 0 ? "Complet" : loading ? "Redirection vers le paiement…" : `Payer ${formatEuro(total)} en ligne`}
      </button>
    </div>
  );
}
