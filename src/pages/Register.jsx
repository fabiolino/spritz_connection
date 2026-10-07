import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Lock, Star, Gift } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { startCheckout } from "../lib/sumupClient";
import { useAuth } from "../lib/AuthContext";
import { colors, fonts } from "../lib/theme";
import { ADVANCE_PRICE_FOR_ALL, groupEntryPrice, onlineEntryPrice, isFormulaEvent } from "../lib/pricing";
import GroupForm, { Stepper, emptyGroup, groupPayload, groupError, MAX_GROUP } from "../components/GroupForm.jsx";

const MEMBERSHIP_PRICE = 25; // doit rester aligné avec Join.jsx
const REFERRAL_THRESHOLD = 3; // doit rester aligné avec REFERRAL_THRESHOLD dans api/_registration.js

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
  const [availableReferralCredits, setAvailableReferralCredits] = useState(0);
  const [useReferralCredit, setUseReferralCredit] = useState(false);

  useEffect(() => {
    async function load() {
      if (!import.meta.env.VITE_SUPABASE_URL) {
        setEvent({ price_member: 8, price_nonmember: 12, seats: 40, taken: 27 });
        return;
      }
      const { data } = await supabase
        .from("events")
        .select("price_member, price_nonmember, is_free, seats, taken")
        .eq("id", id)
        .single();

      // Les lignes (options / formules) sont chargées avant d'afficher l'écran, pour savoir
      // dès le premier affichage s'il s'agit d'un événement à formules.
      const { data: options } = await supabase
        .from("event_options")
        .select("id, label, price, onsite_price")
        .eq("event_id", id)
        .order("price", { ascending: true })
        .order("created_at", { ascending: true });
      if (options) setEventOptions(options);
      setEvent(data);
    }
    load();
  }, [id]);

  // Programme de parrainage : combien d'entrées gratuites il reste à utiliser
  useEffect(() => {
    async function loadCredits() {
      if (!user || !import.meta.env.VITE_SUPABASE_URL) return;
      const { data: referrals } = await supabase.from("referrals").select("status").eq("referrer_id", user.id);
      const rewardedCount = (referrals || []).filter((r) => r.status === "rewarded").length;
      const { data: prof } = await supabase.from("profiles").select("referral_credits_used").eq("id", user.id).maybeSingle();
      const used = prof?.referral_credits_used || 0;
      setAvailableReferralCredits(Math.max(0, Math.floor(rewardedCount / REFERRAL_THRESHOLD) - used));
    }
    loadCredits();
  }, [user]);

  // Événement à formules (ex. Aperitivo Italiano) : pas de billet séparé, le participant choisit
  // une ou plusieurs formules avec une quantité ; le nombre de personnes en découle.
  const formulaMode = isFormulaEvent(event, eventOptions);
  const people = formulaMode ? eventOptions.reduce((sum, o) => sum + (optionQty[o.id] || 0), 0) : 0;
  useEffect(() => {
    if (!formulaMode) return;
    const q = Math.max(1, people);
    setGroup((g) => (g.quantity === q ? g : { ...g, quantity: q }));
  }, [formulaMode, people]);

  if (authLoading || !event) return null;

  const isMember = !!profile?.is_member;
  const seatsLeft = event.seats > 0 ? Math.max(0, event.seats - (event.taken || 0)) : null;
  const maxPeople = Math.max(1, Math.min(MAX_GROUP, seatsLeft ?? MAX_GROUP));
  const entryTotal = formulaMode ? 0 : groupEntryPrice(event, isMember, group.quantity);

  const chosenOptions = eventOptions.filter((o) => (optionQty[o.id] || 0) > 0);
  const optionsTotal = chosenOptions.reduce((sum, o) => sum + Number(o.price) * optionQty[o.id], 0);
  // Ce que ces mêmes formules coûteraient sur place le jour J
  const onsiteTotal = chosenOptions.reduce((sum, o) => sum + (Number(o.onsite_price) || Number(o.price)) * optionQty[o.id], 0);
  const withMembership = addMembership && !!user;
  const applyReferralCredit = useReferralCredit && availableReferralCredits > 0;
  // Entrée gratuite de parrainage : une place offerte (à formules : la formule la moins chère choisie)
  const referralUnit = formulaMode
    ? chosenOptions.length
      ? Math.min(...chosenOptions.map((o) => Number(o.price) || 0))
      : 0
    : onlineEntryPrice(event, isMember);
  const referralDiscount = applyReferralCredit ? Math.min(formulaMode ? optionsTotal : entryTotal, referralUnit) : 0;
  const total = Math.round((entryTotal - referralDiscount + optionsTotal + (withMembership ? MEMBERSHIP_PRICE : 0)) * 100) / 100;
  const option = withMembership ? "both" : "billet";

  async function handlePay() {
    if (formulaMode && people < 1) {
      setError("Choisis au moins une formule.");
      return;
    }
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
        useReferralCredit: applyReferralCredit,
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
        <h1 style={{ fontFamily: fonts.display, fontSize: 22, margin: 0, color: colors.navy }}>Inscription</h1>
        <i style={{ display: "inline-block", width: 30, height: 6, background: colors.orange, borderRadius: 99, transform: "rotate(-6deg)" }} />
      </div>

      {!formulaMode && (
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
      )}

      {formulaMode && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2, fontFamily: fonts.display }}>Choisis ta formule</div>
          <div style={{ fontSize: 11.5, color: colors.muted, marginBottom: 8, lineHeight: 1.4 }}>
            Une ligne par personne : indique combien de personnes prennent chaque formule. Le prix de prévente est celui que tu paies ici, le prix sur place est celui du jour J.
          </div>
          {eventOptions.map((o) => {
            const qty = optionQty[o.id] || 0;
            const onsite = Number(o.onsite_price) || 0;
            return (
              <div
                key={o.id}
                style={{
                  border: `1.5px solid ${qty > 0 ? colors.orange : colors.border}`,
                  background: qty > 0 ? "rgba(240,90,25,0.08)" : colors.surface,
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
                  <div style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.3 }}>{o.label}</div>
                  <div style={{ fontSize: 13, marginTop: 3 }}>
                    <strong style={{ color: colors.orange }}>{formatEuro(o.price)}</strong>
                    <span style={{ color: colors.muted }}> en prévente</span>
                    {onsite > Number(o.price) && (
                      <span style={{ color: colors.muted }}> · {formatEuro(onsite)} sur place</span>
                    )}
                  </div>
                  {qty > 1 && (
                    <div style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>
                      {qty} × {formatEuro(o.price)} = {formatEuro(Number(o.price) * qty)}
                    </div>
                  )}
                </div>
                <Stepper
                  value={qty}
                  min={0}
                  max={Math.max(qty, qty + (maxPeople - people))}
                  onChange={(n) => setOptionQty((p) => ({ ...p, [o.id]: n }))}
                  label={o.label}
                />
              </div>
            );
          })}
          {seatsLeft != null && seatsLeft <= MAX_GROUP && people >= maxPeople && (
            <p style={{ fontSize: 11.5, color: colors.muted, margin: "2px 0 0" }}>
              {seatsLeft} place{seatsLeft > 1 ? "s" : ""} restante{seatsLeft > 1 ? "s" : ""}.
            </p>
          )}
        </div>
      )}

      {(!formulaMode || !user || group.quantity > 1) && (
        <GroupForm
          group={group}
          onChange={setGroup}
          user={user}
          seatsLeft={seatsLeft}
          requireEmail
          unitLabel="un seul paiement"
          hideQuantity={formulaMode}
          onLogin={() => navigate(`/login?next=${encodeURIComponent(`/event/${id}/register`)}`)}
        />
      )}

      {!formulaMode && eventOptions.length > 0 && (
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
                  background: qty > 0 ? "rgba(240,90,25,0.08)" : colors.surface,
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

      {availableReferralCredits > 0 && (
        <div
          onClick={() => setUseReferralCredit((v) => !v)}
          style={{
            border: `1.5px solid ${useReferralCredit ? colors.gold : colors.border}`,
            background: useReferralCredit ? "rgba(255,197,43,0.12)" : colors.surface,
            borderRadius: 14,
            padding: "14px 16px",
            cursor: "pointer",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
            marginBottom: 20
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Gift size={18} color={colors.orange} style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 3 }}>Utiliser mon entrée gratuite</div>
              <div style={{ fontSize: 12, color: colors.muted }}>
                Grâce au parrainage — {availableReferralCredits} disponible{availableReferralCredits > 1 ? "s" : ""}
              </div>
            </div>
          </div>
          <span style={{ fontSize: 14, fontWeight: 700, color: colors.olive, whiteSpace: "nowrap" }}>
            {useReferralCredit ? "− " + formatEuro(referralDiscount) : ""}
          </span>
        </div>
      )}

      {user && !isMember && !ADVANCE_PRICE_FOR_ALL && !formulaMode && (
        <div
          onClick={() => setAddMembership((v) => !v)}
          style={{
            border: `1.5px solid ${addMembership ? colors.orange : colors.border}`,
            background: addMembership ? "rgba(240,90,25,0.08)" : colors.surface,
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
          Total{formulaMode ? (people > 0 ? ` · ${people} personne${people > 1 ? "s" : ""}` : "") : group.quantity > 1 ? ` · ${group.quantity} personnes` : ""}
          {!formulaMode && group.quantity > 1 && (
            <span style={{ display: "block", fontSize: 11.5, fontWeight: 500, color: colors.muted }}>
              Entrées {formatEuro(entryTotal)}
              {optionsTotal > 0 ? ` + options ${formatEuro(optionsTotal)}` : ""}
            </span>
          )}
          {formulaMode &&
            chosenOptions.map((o) => (
              <span key={o.id} style={{ display: "block", fontSize: 11.5, fontWeight: 500, color: colors.muted }}>
                {optionQty[o.id]} × {o.label}
              </span>
            ))}
        </span>
        <span>{formatEuro(total)}</span>
      </div>
      {formulaMode && onsiteTotal > optionsTotal && (
        <p style={{ fontSize: 12, color: colors.olive, fontWeight: 600, padding: "0 4px", margin: "-6px 0 14px" }}>
          Tu économises {formatEuro(onsiteTotal - optionsTotal)} par rapport au prix sur place ({formatEuro(onsiteTotal)}).
        </p>
      )}

      {error && <p style={{ color: colors.red, fontSize: 13, marginBottom: 10 }}>{error}</p>}

      <button
        onClick={handlePay}
        disabled={loading || seatsLeft === 0 || (formulaMode && people < 1)}
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
        {total === 0 ? <Gift size={15} /> : <Lock size={15} />}{" "}
        {seatsLeft === 0
          ? "Complet"
          : loading
          ? "Confirmation…"
          : formulaMode && people < 1
          ? "Choisis au moins une formule"
          : total === 0
          ? "Confirmer mon inscription gratuite"
          : `Payer ${formatEuro(total)} en ligne`}
      </button>
    </div>
  );
}
