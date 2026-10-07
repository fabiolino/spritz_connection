import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Calendar, User, MapPin, Phone, MessageCircle, ChevronLeft, Check, Share2, Users, Camera, Images, ExternalLink, Tag, Square, CheckSquare, Image as ImageIcon } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { colors, fonts } from "../lib/theme";
import { useCategories } from "../lib/CategoriesContext";
import { CategoryIcon } from "../lib/eventIcons";
import { useAuth } from "../lib/AuthContext";
import { shareContent } from "../lib/share";
import { authHeaders } from "../lib/sumupClient";
import { ADVANCE_PRICE_FOR_ALL, onlineEntryPrice, groupEntryPrice, isFormulaEvent, cheapestFormulaPrice } from "../lib/pricing";
import GroupForm, { Stepper, emptyGroup, groupPayload, groupError } from "../components/GroupForm.jsx";
import { eventInviteUrl } from "../lib/invite";
import InviteButtons from "../components/InviteButtons.jsx";
import { NotifyPrompt } from "../components/Notifications.jsx";
import FindTicket from "../components/FindTicket.jsx";
import CrewAvatar from "../components/CrewAvatar.jsx";

function formatEuro(n) {
  const v = Number(n) || 0;
  return v.toLocaleString("fr-FR", { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 }) + " €";
}

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getCategory } = useCategories();
  const { user, profile, loading: authLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get("invite");
  const [event, setEvent] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [invitePreview, setInvitePreview] = useState(null);
  const [inviteError, setInviteError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [registering, setRegistering] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [error, setError] = useState("");
  const [attendees, setAttendees] = useState([]);
  const [attendeeTotal, setAttendeeTotal] = useState(0);
  const [shareMsg, setShareMsg] = useState("");
  const [photos, setPhotos] = useState([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [eventOptions, setEventOptions] = useState([]);
  const [optionQty, setOptionQty] = useState({});
  const [group, setGroup] = useState(emptyGroup());
  const [reserving, setReserving] = useState(false);
  const [reserveError, setReserveError] = useState("");

  useEffect(() => {
    async function load() {
      if (!import.meta.env.VITE_SUPABASE_URL) {
        setEvent({
          id,
          title: "Spritz al Tramonto",
          organizer: "Fabio",
          event_date: "2026-09-12T19:00:00",
          address: "12 Quai de Valmy, 75010 Paris",
          phone: "06 12 34 56 78",
          description: "Apéritif italien classique au bord du canal.",
          price_member: 8,
          price_nonmember: 12,
          is_free: false,
          seats: 40,
          taken: 27
        });
        setLoaded(true);
        return;
      }
      const { data } = await supabase.from("events").select("*").eq("id", id).maybeSingle();
      setEvent(data || null);

      if (!data) {
        // Événement privé (ou introuvable) : si le lien contient une invitation, on montre un aperçu
        if (inviteToken) {
          try {
            const res = await fetch("/api/event-attendees", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "invite-preview", eventId: id, token: inviteToken })
            });
            const json = await res.json();
            if (res.ok) setInvitePreview(json.event);
            else setInviteError(json.error || "Lien d'invitation invalide");
          } catch {
            setInviteError("Impossible de contacter le serveur");
          }
        }
        setLoaded(true);
        return;
      }
      setInvitePreview(null);
      setLoaded(true);

      const { data: optionRows } = await supabase
        .from("event_options")
        .select("id, label, price, onsite_price, payment_link")
        .eq("event_id", id)
        .order("price", { ascending: true })
        .order("created_at", { ascending: true });
      if (optionRows) setEventOptions(optionRows);

      const res = await fetch("/api/event-attendees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: id })
      });
      if (res.ok) {
        const json = await res.json();
        setAttendees(json.attendees || []);
        setAttendeeTotal(json.total ?? (json.attendees || []).length);
      }

      const { data: photoRows } = await supabase
        .from("event_photos")
        .select("id, photo_url, user_id")
        .eq("event_id", id)
        .order("created_at", { ascending: true });
      if (photoRows) setPhotos(photoRows);
    }
    if (authLoading) return;
    load();
  }, [id, user?.id, authLoading, reloadKey]);

  // Connecté·e avec un lien d'invitation valide : on s'ajoute aux invités puis on recharge l'événement
  useEffect(() => {
    if (!user || !invitePreview || event) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/event-attendees", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(await authHeaders()) },
          body: JSON.stringify({ action: "invite-accept", eventId: id, token: inviteToken })
        });
        const json = await res.json();
        if (cancelled) return;
        if (res.ok) setReloadKey((k) => k + 1);
        else setInviteError(json.error || "L'invitation n'a pas pu être acceptée");
      } catch {
        if (!cancelled) setInviteError("Impossible de contacter le serveur");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, invitePreview, event, id, inviteToken]);

  if (!event) {
    if (!loaded) return null;
    if (invitePreview) {
      return (
        <InviteLanding
          event={invitePreview}
          category={getCategory(invitePreview.category)}
          user={user}
          error={inviteError}
          onLogin={() => navigate(`/login?next=${encodeURIComponent(`/event/${id}?invite=${inviteToken}`)}`)}
          onBack={() => navigate("/")}
        />
      );
    }
    return (
      <div style={{ padding: "60px 24px", textAlign: "center" }}>
        <p style={{ fontFamily: fonts.display, fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Événement introuvable</p>
        <p style={{ fontSize: 13, color: colors.muted, lineHeight: 1.5, marginBottom: 20 }}>
          {inviteError ||
            (user
              ? "Il a peut-être été supprimé, ou il est privé et tu n'y es pas invité·e."
              : "Il est peut-être privé : connecte-toi avec le compte invité pour le voir.")}
        </p>
        <button
          onClick={() => navigate(user ? "/" : `/login?next=${encodeURIComponent(`/event/${id}`)}`)}
          style={{ background: colors.orange, color: "#fff", border: "none", borderRadius: 14, padding: "12px 20px", fontWeight: 700, cursor: "pointer" }}
        >
          {user ? "Voir les événements" : "Se connecter"}
        </button>
      </div>
    );
  }
  const full = event.taken >= event.seats;
  // Événement réglé par un lien de paiement externe : l'app calcule le montant à payer
  // (entrée + suppléments cochés) pour que le participant sache quoi régler.
  const externalPay = !!event.sumup_link && !event.is_free;
  // Événement à formules (ex. Aperitivo Italiano) : pas de billet d'entrée, chaque ligne est une
  // formule complète avec son prix de prévente et son prix sur place (voir src/lib/pricing.js).
  const formulaMode = isFormulaEvent(event, eventOptions);
  const formulaFrom = cheapestFormulaPrice(eventOptions);
  const formulaOnsiteFrom = Math.min(...eventOptions.map((o) => Number(o.onsite_price) || Infinity));
  const isMember = !!profile?.is_member;
  const entryPrice = onlineEntryPrice(event, isMember);
  const groupEntry = groupEntryPrice(event, isMember, group.quantity);
  const onsitePrice = Number(event.price_nonmember) || 0;
  const seatsLeft = event.seats > 0 ? Math.max(0, event.seats - (event.taken || 0)) : null;
  const checkableExtras = eventOptions.filter((o) => !o.payment_link);
  const chosenExtras = checkableExtras.filter((o) => (optionQty[o.id] || 0) > 0);
  const extrasTotal = chosenExtras.reduce((sum, o) => sum + (Number(o.price) || 0) * optionQty[o.id], 0);
  const externalTotal = Math.round((groupEntry + extrasTotal) * 100) / 100;
  const loginToRegister = () => navigate(`/login?next=${encodeURIComponent(`/event/${id}`)}`);

  async function handleExternalReservation() {
    const check = groupError(group, user);
    if (check) {
      setReserveError(check);
      return;
    }
    setReserving(true);
    setReserveError("");
    try {
      const res = await fetch("/api/create-sumup-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeaders()) },
        body: JSON.stringify({
          action: "external-reservation",
          eventId: id,
          optionQuantities: Object.fromEntries(chosenExtras.map((o) => [o.id, optionQty[o.id]])),
          ...groupPayload(group, user)
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setReserveError(data.error || "La réservation n'a pas pu être enregistrée");
        setReserving(false);
        return;
      }
      navigate(`/ticket/${data.registrationId}`);
    } catch (err) {
      setReserveError("Impossible de contacter le serveur");
      setReserving(false);
    }
  }

  const cat = getCategory(event.category);
  const coverUrl = event.cover_photo_url || cat.default_cover_url;

  async function handleFreeRegister() {
    const check = groupError(group, user);
    if (check) {
      setError(check);
      return;
    }
    setRegistering(true);
    setError("");
    try {
      const res = await fetch("/api/register-free", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeaders()) },
        body: JSON.stringify({ eventId: id, ...groupPayload(group, user) })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erreur lors de l'inscription");
        setRegistering(false);
        return;
      }
      // Page de confirmation avec le code à montrer à l'entrée (valable pour tout le groupe)
      if (data.registrationId) {
        navigate(`/ticket/${data.registrationId}`);
        return;
      }
      setRegistered(true);
      setEvent((e) => ({ ...e, taken: e.taken + (data.quantity || 1) }));
    } catch (err) {
      setError("Impossible de contacter le serveur");
      setRegistering(false);
    }
  }

  async function handleShare() {
    const result = await shareContent({
      title: event.title,
      text: `Rejoins-moi à "${event.title}" sur Spritz Connection !`,
      url: eventInviteUrl(id, null, profile?.referral_code)
    });
    if (result === "copied") setShareMsg("Lien copié !");
    if (result === "failed") setShareMsg("Impossible de partager pour le moment.");
    if (result === "copied" || result === "failed") setTimeout(() => setShareMsg(""), 2500);
  }

  async function handlePhotoUpload(e) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingPhoto(true);
    setPhotoError("");
    try {
      const ext = file.name.split(".").pop();
      const path = `${id}/${user.id}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("event-photos").upload(path, file);
      if (uploadError) throw uploadError;

      const { data: pub } = supabase.storage.from("event-photos").getPublicUrl(path);

      const { error: insertError } = await supabase.from("event_photos").insert({
        event_id: id,
        user_id: user.id,
        photo_url: pub.publicUrl
      });
      if (insertError) throw insertError;

      setPhotos((prev) => [...prev, { id: `${Date.now()}`, photo_url: pub.publicUrl, user_id: user.id }]);
    } catch (err) {
      setPhotoError("Impossible d'ajouter la photo — seules les personnes inscrites et confirmées à cet événement peuvent en ajouter.");
    }
    setUploadingPhoto(false);
    e.target.value = "";
  }

  const dateObj = new Date(event.event_date);
  const heroWeekday = dateObj.toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", "").toUpperCase();
  const heroDay = dateObj.toLocaleDateString("fr-FR", { day: "numeric" });
  const heroMonth = dateObj.toLocaleDateString("fr-FR", { month: "short" }).replace(".", "").toUpperCase();
  const heroTime = dateObj.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const roundBtn = {
    width: 38,
    height: 38,
    borderRadius: "50%",
    border: "none",
    background: "rgba(255,255,255,0.92)",
    color: colors.navy,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    boxShadow: "0 2px 8px rgba(6,43,73,0.25)"
  };

  return (
    <div style={{ paddingBottom: 40 }}>
      {/* En-tête : même langage visuel que les cartes de la page d'accueil (photo pleine largeur,
          bloc date jaune, titre Fraunces), en grand */}
      <div
        style={{
          position: "relative",
          height: 300,
          overflow: "hidden",
          background: coverUrl ? `url(${coverUrl}) center/cover` : "linear-gradient(160deg, rgba(240,90,25,0.9), rgba(255,197,43,0.8))"
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: coverUrl
              ? "linear-gradient(180deg, rgba(6,43,73,0.35) 0%, rgba(6,43,73,0.05) 35%, rgba(6,43,73,0.75) 100%)"
              : "linear-gradient(180deg, rgba(6,43,73,0) 40%, rgba(6,43,73,0.35) 100%)"
          }}
        />
        {!coverUrl && (
          <div style={{ position: "absolute", top: "34%", left: "50%", transform: "translate(-50%, -50%)" }}>
            <CategoryIcon category={cat} size={84} />
          </div>
        )}

        <div style={{ position: "absolute", top: 14, left: 16, right: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button onClick={() => navigate("/")} aria-label="Retour" style={roundBtn}>
            <ChevronLeft size={22} />
          </button>
          <button onClick={handleShare} aria-label="Partager" style={roundBtn}>
            <Share2 size={17} />
          </button>
        </div>

        <div style={{ position: "absolute", top: 64, left: 16, right: 16, display: "flex", gap: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", background: colors.orange, borderRadius: 20, padding: "3px 10px" }}>{cat.label}</span>
          {event.is_free && (
            <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", background: colors.olive, borderRadius: 20, padding: "3px 10px" }}>Gratuit</span>
          )}
          {event.visibility === "private" && (
            <span style={{ fontSize: 11, fontWeight: 700, color: colors.navy, background: colors.gold, borderRadius: 20, padding: "3px 10px" }}>🔒 Privé</span>
          )}
        </div>

        <div
          style={{
            position: "absolute",
            left: 18,
            right: 18,
            bottom: 18,
            display: "flex",
            gap: 12,
            alignItems: "flex-end",
            color: "#fff",
            textShadow: "0 2px 8px rgba(6,43,73,0.85), 0 1px 2px rgba(6,43,73,0.9)"
          }}
        >
          <div style={{ width: 50, flexShrink: 0, textAlign: "center" }}>
            <b style={{ display: "block", fontSize: 11, letterSpacing: "0.08em" }}>{heroWeekday}</b>
            <strong style={{ display: "block", color: colors.gold, fontSize: 38, lineHeight: 0.95, fontFamily: fonts.display }}>{heroDay}</strong>
            <b style={{ display: "block", fontSize: 11, letterSpacing: "0.08em" }}>{heroMonth}</b>
          </div>
          <div style={{ borderLeft: "1px solid rgba(255,255,255,0.45)", paddingLeft: 12, minWidth: 0, flex: 1 }}>
            <h1 style={{ fontFamily: fonts.display, fontSize: 25, margin: "0 0 6px", lineHeight: 1.08 }}>{event.title}</h1>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, opacity: 0.95, flexWrap: "wrap" }}>
              <Calendar size={12} /> {heroTime}
              <span style={{ opacity: 0.6 }}>·</span>
              <User size={12} /> {event.organizer}
              {event.seats > 0 && (
                <>
                  <span style={{ opacity: 0.6 }}>·</span>
                  <span style={{ fontWeight: 800, color: full ? "#FFB4A6" : "#fff" }}>
                    <Users size={12} style={{ verticalAlign: "-2px" }} /> {full ? "Complet" : `${event.taken}/${event.seats} places`}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      <div style={{ height: 6, background: colors.orange }} />
      {shareMsg && <p style={{ textAlign: "center", fontSize: 11.5, color: colors.muted, margin: "6px 0 0" }}>{shareMsg}</p>}

      <div
        style={{
          backgroundImage: "linear-gradient(to bottom, rgba(240,90,25,0.12) 0%, rgba(240,90,25,0.04) 260px, transparent 520px)",
          backgroundRepeat: "no-repeat",
          padding: "4px 20px 0"
        }}
      >
        {event.description && (
          <p style={{ fontSize: 14.5, lineHeight: 1.65, color: colors.ink, margin: "16px 0 4px", whiteSpace: "pre-line" }}>{event.description}</p>
        )}

        <SectionTitle>Infos pratiques</SectionTitle>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            background: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: 18,
            padding: 16,
            marginBottom: 8,
            boxShadow: "0 6px 16px rgba(6,43,73,0.07)"
          }}
        >
          <Field icon={<Calendar size={15} color={colors.orange} />}>
            {new Date(event.event_date).toLocaleString("fr-FR", { dateStyle: "full", timeStyle: "short" })}
          </Field>
          <Field icon={<User size={15} color={colors.orange} />}>Organisateur — {event.organizer}</Field>
          {event.address && (
            <Field icon={<MapPin size={15} color={colors.orange} />}>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.address)}`}
                target="_blank"
                rel="noreferrer"
                style={{ color: colors.navy, textDecoration: "underline", textDecorationColor: colors.border }}
              >
                {event.address}
              </a>
            </Field>
          )}
          {event.phone && (
            <Field icon={<Phone size={15} color={colors.orange} />}>
              <a href={`tel:${String(event.phone).replace(/\s/g, "")}`} style={{ color: colors.navy, textDecoration: "none" }}>
                {event.phone}
              </a>
            </Field>
          )}
        </div>

        {attendeeTotal > 0 && (
          <div style={{ marginBottom: 8 }}>
            <SectionTitle>
              {attendeeTotal} participant{attendeeTotal > 1 ? "s" : ""}
            </SectionTitle>
            <div style={{ display: "flex", flexWrap: "wrap", gap: -6 }}>
              {attendees.slice(0, 12).map((a, i) => (
                <div key={i} title={a.name} style={{ marginLeft: i === 0 ? 0 : -10, border: `2px solid ${colors.bg}`, borderRadius: "50%" }}>
                  <CrewAvatar name={a.name} photoUrl={a.photo_url} size={38} crew={a.crew} crewOfMonth={a.crewOfMonth} />
                </div>
              ))}
              {attendeeTotal > 12 && (
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: colors.surface,
                    border: `2px solid ${colors.bg}`,
                    marginLeft: -10,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 10.5,
                    fontWeight: 700,
                    color: colors.muted
                  }}
                >
                  +{attendeeTotal - Math.min(12, attendees.length)}
                </div>
              )}
            </div>
            {attendees.length > 0 && (
              <p style={{ fontSize: 12.5, color: colors.muted, margin: "8px 0 0", lineHeight: 1.5 }}>
                {(() => {
                  const shown = attendees.slice(0, 15).map((a) => a.name);
                  const others = attendeeTotal - shown.length;
                  return others > 0 ? `${shown.join(", ")} et ${others} autre${others > 1 ? "s" : ""}` : shown.join(", ");
                })()}
              </p>
            )}
          </div>
        )}

        {new Date(event.event_date) > new Date() && (
          <SectionTitle>{full ? "Complet" : event.is_free ? "Je m'inscris" : "Réserver ma place"}</SectionTitle>
        )}

        {!full && (externalPay || (event.is_free && !registered)) && (
          <GroupForm
            group={group}
            onChange={setGroup}
            user={user}
            seatsLeft={seatsLeft}
            unitLabel={externalPay ? "un seul paiement" : "un seul billet"}
            onLogin={loginToRegister}
          />
        )}

        {eventOptions.length > 0 && (
          <div
            style={{
              background: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: 16,
              padding: 14,
              marginBottom: 16
            }}
          >
            <div style={{ fontFamily: fonts.display, fontSize: 15, fontWeight: 700, marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
              <Tag size={15} color={colors.orange} /> {formulaMode ? "Nos formules" : "En supplément, moins cher à l'avance"}
            </div>
            <p style={{ fontSize: 11.5, color: colors.muted, margin: "0 0 10px", lineHeight: 1.4 }}>
              {formulaMode
                ? "Réserve à l'avance pour payer moins cher que sur place. Tu choisis ta ou tes formules à l'étape suivante."
                : event.sumup_link
                ? `Ajoute-les à ton paiement${group.quantity > 1 ? " (pour tout le groupe)" : ""} et profite du prix réduit (prix barré = prix sur place).`
                : "À ajouter lors de l'inscription pour profiter du prix réduit (prix barré = prix sur place)."}
            </p>
            {eventOptions.map((o) => {
              const promo = Number(o.onsite_price) > Number(o.price);
              const checkable = externalPay && !o.payment_link;
              const qty = optionQty[o.id] || 0;
              return (
                <div
                  key={o.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    padding: "9px 0",
                    borderTop: `1px solid ${colors.border}`
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600 }}>{o.label}</div>
                    {formulaMode && (
                      <div style={{ fontSize: 13.5, marginTop: 2 }}>
                        <strong style={{ color: colors.orange }}>{formatEuro(o.price)}</strong>
                        <span style={{ color: colors.muted }}> en prévente</span>
                        {promo && <span style={{ color: colors.muted }}> · {formatEuro(o.onsite_price)} sur place</span>}
                      </div>
                    )}
                    <div style={{ fontSize: 13.5, marginTop: 2, display: formulaMode ? "none" : undefined }}>
                      {promo && (
                        <span style={{ textDecoration: "line-through", color: colors.muted, marginRight: 6 }}>
                          {formatEuro(o.onsite_price)}
                        </span>
                      )}
                      <strong style={{ color: colors.orange }}>{formatEuro(o.price)}</strong>
                      {promo && (
                        <span
                          style={{
                            marginLeft: 8,
                            fontSize: 10.5,
                            fontWeight: 700,
                            color: "#fff",
                            background: colors.orange,
                            borderRadius: 20,
                            padding: "2px 7px"
                          }}
                        >
                          -{Math.round((1 - Number(o.price) / Number(o.onsite_price)) * 100)} %
                        </span>
                      )}
                    </div>
                  </div>
                  {checkable && (
                    <Stepper
                      value={qty}
                      min={0}
                      max={Math.max(20, group.quantity * 3)}
                      onChange={(n) => setOptionQty((p) => ({ ...p, [o.id]: n }))}
                      label={o.label}
                    />
                  )}
                  {event.sumup_link && o.payment_link && (
                    <a
                      href={o.payment_link}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        flexShrink: 0,
                        background: "none",
                        border: `1.5px solid ${colors.orange}`,
                        color: colors.orange,
                        borderRadius: 10,
                        padding: "7px 12px",
                        fontSize: 12.5,
                        fontWeight: 700,
                        textDecoration: "none",
                        display: "flex",
                        alignItems: "center",
                        gap: 5
                      }}
                    >
                      <ExternalLink size={12} /> Réserver
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {externalPay && (
          <div
            style={{
              background: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: 14,
              padding: "12px 14px",
              marginBottom: 12,
              fontSize: 13.5
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
              <span>
                {group.quantity > 1 ? `${group.quantity} entrées` : "Entrée"}{" "}
                {ADVANCE_PRICE_FOR_ALL ? "(réservation à l'avance)" : isMember ? "(tarif membre)" : "(tarif non-membre)"}
              </span>
              <span>
                {ADVANCE_PRICE_FOR_ALL && onsitePrice > entryPrice && (
                  <span style={{ textDecoration: "line-through", color: colors.muted, marginRight: 6 }}>
                    {formatEuro(onsitePrice * group.quantity)}
                  </span>
                )}
                {formatEuro(groupEntry)}
              </span>
            </div>
            {chosenExtras.map((o) => (
              <div key={o.id} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
                <span>
                  + {optionQty[o.id] > 1 ? `${optionQty[o.id]} × ` : ""}
                  {o.label}
                </span>
                <span>{formatEuro(Number(o.price) * optionQty[o.id])}</span>
              </div>
            ))}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                borderTop: `1px solid ${colors.border}`,
                marginTop: 6,
                paddingTop: 8,
                fontWeight: 800,
                fontSize: 15
              }}
            >
              <span>Total à régler</span>
              <span style={{ color: colors.orange }}>{formatEuro(externalTotal)}</span>
            </div>
            {ADVANCE_PRICE_FOR_ALL && onsitePrice > entryPrice && (
              <div style={{ fontSize: 11.5, color: colors.muted, marginTop: 6 }}>
                Entrée à {formatEuro(onsitePrice)} par personne si tu paies sur place le jour J.
              </div>
            )}
            {!ADVANCE_PRICE_FOR_ALL && !isMember && Number(event.price_member) < Number(event.price_nonmember) && (
              <div style={{ fontSize: 11.5, color: colors.muted, marginTop: 6 }}>
                Membre ? Connecte-toi pour voir ton tarif ({formatEuro(event.price_member)} l'entrée).
              </div>
            )}
          </div>
        )}

        {externalPay ? (
          <div style={{ marginBottom: 16 }}>
            <button
              onClick={handleExternalReservation}
              disabled={reserving || full}
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
                boxShadow: "0 4px 12px rgba(232,95,38,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8
              }}
            >
              <Check size={15} />{" "}
              {full
                ? "Complet"
                : reserving
                ? "Réservation…"
                : `Réserver${group.quantity > 1 ? ` pour ${group.quantity}` : ""} et payer ${formatEuro(externalTotal)}`}
            </button>
            <p style={{ fontSize: 11.5, color: colors.muted, textAlign: "center", margin: "8px 0 0", lineHeight: 1.4 }}>
              Tu reçois ta confirmation avec {group.quantity > 1 ? "un seul code pour tout le groupe" : "ton code de réservation"}, puis tu règles
              {group.quantity > 1 ? " le total en une fois" : ""} via SumUp.
            </p>
            {reserveError && <p style={{ color: colors.red, fontSize: 12.5, marginTop: 6 }}>{reserveError}</p>}
          </div>
        ) : event.sumup_link ? (
          <a
            href={event.sumup_link}
            target="_blank"
            rel="noreferrer"
            style={{
              width: "100%",
              boxSizing: "border-box",
              background: colors.orange,
              color: "#fff",
              border: "none",
              borderRadius: 14,
              padding: 14,
              fontWeight: 700,
              fontSize: 15,
              cursor: "pointer",
              marginBottom: 16,
              boxShadow: "0 4px 12px rgba(232,95,38,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              textDecoration: "none"
            }}
          >
            <ExternalLink size={15} /> Payer via SumUp
          </a>
        ) : event.is_free ? (
          registered ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                background: colors.surface,
                border: `1px solid ${colors.olive}`,
                borderRadius: 14,
                padding: 14,
                marginBottom: 16,
                color: colors.olive,
                fontWeight: 700
              }}
            >
              <Check size={16} /> Inscription confirmée
            </div>
          ) : (
            <>
              <button
                disabled={full || registering}
                onClick={handleFreeRegister}
                style={{
                  width: "100%",
                  background: full ? colors.border : colors.olive,
                  color: colors.ink,
                  border: "none",
                  borderRadius: 14,
                  padding: 14,
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: full ? "not-allowed" : "pointer",
                  marginBottom: 6,
                  boxShadow: full ? "none" : "0 4px 12px rgba(107,124,79,0.28)"
                }}
              >
                {full
                  ? "Complet"
                  : registering
                  ? "Inscription…"
                  : group.quantity > 1
                  ? `Inscrire ${group.quantity} personnes — gratuit`
                  : "Je m'inscris — gratuit"}
              </button>
              {error && <p style={{ color: colors.red, fontSize: 12, textAlign: "center", marginBottom: 10 }}>{error}</p>}
            </>
          )
        ) : (
          <>
            <button
              disabled={full}
              onClick={() => navigate(`/event/${id}/register`)}
              style={{
                width: "100%",
                background: full ? colors.border : colors.orange,
                color: full ? colors.muted : "#fff",
                border: "none",
                borderRadius: 14,
                padding: 14,
                fontWeight: 700,
                fontSize: 15,
                cursor: full ? "not-allowed" : "pointer",
                marginBottom: 10,
                boxShadow: full ? "none" : "0 4px 12px rgba(232,95,38,0.3)"
              }}
            >
              {full
                ? "Complet"
                : formulaMode
                ? `Réserver — dès ${formatEuro(formulaFrom)}`
                : `S'inscrire — dès ${Math.min(event.price_member, event.price_nonmember)} €`}
            </button>
            {!full && (
              <p style={{ fontSize: 12, color: colors.muted, textAlign: "center", marginTop: -4, marginBottom: 16 }}>
                {formulaMode
                  ? Number.isFinite(formulaOnsiteFrom) && formulaOnsiteFrom > formulaFrom
                    ? `Prévente dès ${formatEuro(formulaFrom)} · dès ${formatEuro(formulaOnsiteFrom)} sur place le jour J`
                    : `Prévente dès ${formatEuro(formulaFrom)}`
                  : ADVANCE_PRICE_FOR_ALL
                  ? `${formatEuro(event.price_member)} en réservant à l'avance · ${formatEuro(event.price_nonmember)} sur place le jour J`
                  : `${formatEuro(event.price_member)} membres · ${formatEuro(event.price_nonmember)} non-membres`}
              </p>
            )}
          </>
        )}

        {registered && <NotifyPrompt style={{ marginBottom: 16 }} />}

        {new Date(event.event_date) > new Date(Date.now() - 24 * 3600 * 1000) && (
          <FindTicket eventId={id} style={{ marginBottom: 18 }} />
        )}

        <button
          onClick={() => navigate(`/event/${id}/chat`)}
          style={{
            width: "100%",
            background: colors.surface,
            border: `1px solid ${colors.border}`,
            color: colors.ink,
            borderRadius: 14,
            padding: 13,
            fontWeight: 600,
            fontSize: 14,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            marginBottom: 26
          }}
        >
          <MessageCircle size={16} /> Discussion de l'événement
        </button>

        {event.visibility !== "private" && user && (event.organizer_id === user.id || profile?.is_ambassador) && (
          <button
            onClick={() => navigate(`/event/${id}/affichette`)}
            style={{
              width: "100%",
              background: "none",
              border: `1.5px dashed ${colors.orange}`,
              color: colors.orange,
              borderRadius: 14,
              padding: 12,
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              marginTop: -12,
              marginBottom: 26
            }}
          >
            <ImageIcon size={16} /> Créer une affichette pour cet événement
          </button>
        )}

        {event.visibility !== "private" && new Date(event.event_date) > new Date() && (
          <InviteButtons event={event} url={eventInviteUrl(id, null, profile?.referral_code)} style={{ marginTop: -12, marginBottom: 26 }} />
        )}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <SectionTitle style={{ margin: 0 }}>Souvenirs de la soirée</SectionTitle>
          {user && (
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                fontWeight: 700,
                color: colors.orange,
                cursor: uploadingPhoto ? "not-allowed" : "pointer"
              }}
            >
              <Camera size={15} />
              {uploadingPhoto ? "Envoi…" : "Ajouter"}
              <input type="file" accept="image/*" onChange={handlePhotoUpload} disabled={uploadingPhoto} style={{ display: "none" }} />
            </label>
          )}
        </div>

        {photoError && <p style={{ color: colors.red, fontSize: 12, marginBottom: 10 }}>{photoError}</p>}

        {photos.length === 0 ? (
          <p style={{ fontSize: 12.5, color: colors.muted }}>
            Pas encore de photo — les personnes inscrites à cet événement pourront en ajouter une fois la soirée passée.
          </p>
        ) : (
          <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 6 }}>
            {photos.map((p) => (
              <a key={p.id} href={p.photo_url} target="_blank" rel="noreferrer" style={{ flexShrink: 0 }}>
                <img
                  src={p.photo_url}
                  alt="Photo de l'événement"
                  style={{ width: 130, height: 130, objectFit: "cover", borderRadius: 14, border: `1px solid ${colors.border}` }}
                />
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SectionTitle({ children, style }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "22px 0 12px", ...style }}>
      <h2 style={{ fontFamily: fonts.display, fontSize: 19, margin: 0, color: colors.navy }}>{children}</h2>
      <i style={{ display: "inline-block", width: 34, height: 6, background: colors.orange, borderRadius: 99, transform: "rotate(-6deg)" }} />
    </div>
  );
}

function Field({ icon, children }) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13.5, color: colors.ink }}>
      {icon} {children}
    </div>
  );
}

// Aperçu d'un événement privé pour une personne arrivée via un lien d'invitation (WhatsApp / SMS)
function InviteLanding({ event, category, user, error, onLogin, onBack }) {
  const coverUrl = event.cover_photo_url || category?.default_cover_url;
  return (
    <div style={{ paddingBottom: 40 }}>
      <div style={{ padding: "18px 20px 0" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: colors.ink, cursor: "pointer", padding: 0 }}>
          <ChevronLeft size={22} />
        </button>
      </div>
      <div
        style={{
          margin: "10px 20px 18px",
          borderRadius: 20,
          overflow: "hidden",
          position: "relative",
          background: coverUrl
            ? `url(${coverUrl})`
            : "linear-gradient(155deg, rgba(240,90,25,0.28), rgba(255,197,43,0.22))",
          backgroundSize: "cover",
          backgroundPosition: "center",
          padding: "26px 20px",
          textAlign: "center"
        }}
      >
        {coverUrl && (
          <>
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(6,43,73,0.15) 0%, rgba(6,43,73,0.55) 100%)" }} />
            <div
              style={{
                position: "absolute",
                top: 12,
                left: 12,
                width: 40,
                height: 40,
                borderRadius: "50%",
                overflow: "hidden",
                border: "2px solid #fff",
                boxShadow: "0 2px 6px rgba(6,43,73,0.35)"
              }}
            >
              <img src="/logo.jpg" alt="Spritz Connection" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            </div>
          </>
        )}
        <div style={{ position: "relative" }}>
          {!coverUrl && (
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
              <CategoryIcon category={category} size={64} />
            </div>
          )}
          <span
            style={{ display: "inline-block", fontSize: 11, fontWeight: 700, color: "#fff", background: colors.blue, borderRadius: 20, padding: "3px 11px", marginBottom: 10 }}
          >
            🔒 Tu es invité·e
          </span>
          <h1
            style={{
              fontFamily: fonts.display,
              fontSize: 22,
              margin: 0,
              color: coverUrl ? "#fff" : colors.ink,
              textShadow: coverUrl ? "0 2px 8px rgba(6,43,73,0.5)" : "none"
            }}
          >
            {event.title}
          </h1>
        </div>
      </div>

      <div style={{ padding: "0 20px" }}>
        {event.description && <p style={{ fontSize: 14, lineHeight: 1.6, color: colors.muted, marginBottom: 18 }}>{event.description}</p>}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            background: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: 16,
            padding: 16,
            marginBottom: 20
          }}
        >
          <Field icon={<Calendar size={15} color={colors.orange} />}>
            {new Date(event.event_date).toLocaleString("fr-FR", { dateStyle: "full", timeStyle: "short" })}
          </Field>
          {event.organizer && <Field icon={<User size={15} color={colors.orange} />}>Organisateur — {event.organizer}</Field>}
          {event.address && <Field icon={<MapPin size={15} color={colors.orange} />}>{event.address}</Field>}
        </div>

        {user ? (
          <p style={{ textAlign: "center", fontSize: 13.5, color: error ? colors.red : colors.muted }}>
            {error || "On t'ajoute à la liste des invités…"}
          </p>
        ) : (
          <>
            <button
              onClick={onLogin}
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
                boxShadow: "0 4px 12px rgba(232,95,38,0.3)"
              }}
            >
              Accepter l'invitation
            </button>
            <p style={{ fontSize: 12, color: colors.muted, textAlign: "center", marginTop: 8, lineHeight: 1.5 }}>
              Il suffit de ton email : tu reçois un lien de connexion, et tu reviens directement ici pour t'inscrire.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
