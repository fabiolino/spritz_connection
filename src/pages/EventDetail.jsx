import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Calendar, User, MapPin, Phone, MessageCircle, ChevronLeft, Check, Share2, Users, Camera, Images, ExternalLink, Tag, Square, CheckSquare } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { colors, fonts } from "../lib/theme";
import { useCategories } from "../lib/CategoriesContext";
import { CategoryIcon } from "../lib/eventIcons";
import { useAuth } from "../lib/AuthContext";
import { shareContent } from "../lib/share";
import { authHeaders } from "../lib/sumupClient";

function formatEuro(n) {
  const v = Number(n) || 0;
  return v.toLocaleString("fr-FR", { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 }) + " €";
}

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getCategory } = useCategories();
  const { user, profile } = useAuth();
  const [event, setEvent] = useState(null);
  const [registering, setRegistering] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [error, setError] = useState("");
  const [attendees, setAttendees] = useState([]);
  const [shareMsg, setShareMsg] = useState("");
  const [photos, setPhotos] = useState([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [eventOptions, setEventOptions] = useState([]);
  const [selectedExtraIds, setSelectedExtraIds] = useState([]);
  const [guestName, setGuestName] = useState("");
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
        return;
      }
      const { data } = await supabase.from("events").select("*").eq("id", id).single();
      setEvent(data);

      const { data: optionRows } = await supabase
        .from("event_options")
        .select("id, label, price, onsite_price, payment_link")
        .eq("event_id", id)
        .order("price", { ascending: true });
      if (optionRows) setEventOptions(optionRows);

      const res = await fetch("/api/event-attendees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: id })
      });
      if (res.ok) {
        const json = await res.json();
        setAttendees(json.attendees || []);
      }

      const { data: photoRows } = await supabase
        .from("event_photos")
        .select("id, photo_url, user_id")
        .eq("event_id", id)
        .order("created_at", { ascending: true });
      if (photoRows) setPhotos(photoRows);
    }
    load();
  }, [id]);

  if (!event) return null;
  const full = event.taken >= event.seats;
  // Événement réglé par un lien de paiement externe : l'app calcule le montant à payer
  // (entrée + suppléments cochés) pour que le participant sache quoi régler.
  const externalPay = !!event.sumup_link && !event.is_free;
  const isMember = !!profile?.is_member;
  const entryPrice = Number(isMember ? event.price_member : event.price_nonmember) || 0;
  const checkableExtras = eventOptions.filter((o) => !o.payment_link);
  const extrasTotal = checkableExtras
    .filter((o) => selectedExtraIds.includes(o.id))
    .reduce((sum, o) => sum + (Number(o.price) || 0), 0);
  const externalTotal = Math.round((entryPrice + extrasTotal) * 100) / 100;
  async function handleExternalReservation() {
    if (!user && !guestName.trim()) {
      setReserveError("Indique ton prénom et ton nom pour la réservation.");
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
          selectedOptionIds: selectedExtraIds,
          guestName: guestName.trim()
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

  function toggleExtra(optId) {
    setSelectedExtraIds((prev) => (prev.includes(optId) ? prev.filter((x) => x !== optId) : [...prev, optId]));
  }
  const cat = getCategory(event.category);

  async function handleFreeRegister() {
    setRegistering(true);
    setError("");
    try {
      const res = await fetch("/api/register-free", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: id, userId: user?.id || null })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erreur lors de l'inscription");
        setRegistering(false);
        return;
      }
      setRegistered(true);
      setEvent((e) => ({ ...e, taken: e.taken + 1 }));
    } catch (err) {
      setError("Impossible de contacter le serveur");
      setRegistering(false);
    }
  }

  async function handleShare() {
    const result = await shareContent({
      title: event.title,
      text: `Rejoins-moi à "${event.title}" sur Spritz Connection !`,
      url: `${window.location.origin}/event/${id}`
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

  return (
    <div style={{ paddingBottom: 40 }}>
      <div style={{ padding: "18px 20px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button onClick={() => navigate("/")} style={{ background: "none", border: "none", color: colors.ink, cursor: "pointer", padding: 0 }}>
          <ChevronLeft size={22} />
        </button>
        <button onClick={handleShare} style={{ background: "none", border: "none", color: colors.ink, cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 6 }}>
          <Share2 size={18} />
        </button>
      </div>
      {shareMsg && <p style={{ textAlign: "center", fontSize: 11.5, color: colors.muted, margin: "4px 0 0" }}>{shareMsg}</p>}

      <div
        style={{
          margin: "10px 20px 18px",
          borderRadius: 20,
          overflow: "hidden",
          background: "linear-gradient(155deg, rgba(242,118,46,0.28), rgba(240,180,41,0.22))",
          padding: "26px 20px",
          textAlign: "center"
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
          <CategoryIcon category={cat} size={64} />
        </div>
        <span
          style={{
            display: "inline-block",
            fontSize: 11,
            fontWeight: 700,
            color: "#fff",
            background: colors.orange,
            borderRadius: 20,
            padding: "3px 11px",
            marginBottom: 10
          }}
        >
          {cat.label}
        </span>
        <h1 style={{ fontFamily: fonts.display, fontSize: 22, margin: 0 }}>{event.title}</h1>
        {event.seats > 0 && (
          <div style={{ marginTop: 10, fontSize: 13, fontWeight: 700, color: full ? colors.red : colors.ink, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <Users size={14} /> {event.taken}/{event.seats} places
          </div>
        )}
      </div>

      <div style={{ padding: "0 20px" }}>
        <p style={{ fontSize: 14, lineHeight: 1.6, color: colors.muted, marginBottom: 18 }}>{event.description}</p>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            background: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: 16,
            padding: 16,
            marginBottom: 20,
            boxShadow: "0 3px 10px rgba(43,36,25,0.05)"
          }}
        >
          <Field icon={<Calendar size={15} color={colors.orange} />}>
            {new Date(event.event_date).toLocaleString("fr-FR", { dateStyle: "full", timeStyle: "short" })}
          </Field>
          <Field icon={<User size={15} color={colors.orange} />}>Organisateur — {event.organizer}</Field>
          <Field icon={<MapPin size={15} color={colors.orange} />}>{event.address}</Field>
          <Field icon={<Phone size={15} color={colors.orange} />}>{event.phone}</Field>
        </div>

        {attendees.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 12.5, color: colors.muted, marginBottom: 8 }}>
              {attendees.length} participant{attendees.length > 1 ? "s" : ""}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: -6 }}>
              {attendees.slice(0, 12).map((a, i) => (
                <div
                  key={i}
                  title={a.name}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: a.photo_url ? `url(${a.photo_url}) center/cover` : colors.border,
                    border: `2px solid ${colors.bg}`,
                    marginLeft: i === 0 ? 0 : -10,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    fontWeight: 700,
                    color: colors.muted,
                    flexShrink: 0
                  }}
                >
                  {!a.photo_url && a.name?.[0]?.toUpperCase()}
                </div>
              ))}
              {attendees.length > 12 && (
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
                  +{attendees.length - 12}
                </div>
              )}
            </div>
          </div>
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
              <Tag size={15} color={colors.orange} /> En supplément, moins cher à l'avance
            </div>
            <p style={{ fontSize: 11.5, color: colors.muted, margin: "0 0 10px", lineHeight: 1.4 }}>
              {event.sumup_link
                ? "Coche-les pour les ajouter à ton paiement et profiter du prix réduit (prix barré = prix sur place)."
                : "À ajouter lors de l'inscription pour profiter du prix réduit (prix barré = prix sur place)."}
            </p>
            {eventOptions.map((o) => {
              const promo = Number(o.onsite_price) > Number(o.price);
              const checkable = externalPay && !o.payment_link;
              const checked = selectedExtraIds.includes(o.id);
              return (
                <div
                  key={o.id}
                  onClick={checkable ? () => toggleExtra(o.id) : undefined}
                  style={{
                    cursor: checkable ? "pointer" : "default",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    padding: "9px 0",
                    borderTop: `1px solid ${colors.border}`
                  }}
                >
                  {checkable && (
                    <div style={{ flexShrink: 0, color: checked ? colors.orange : colors.muted, display: "flex" }}>
                      {checked ? <CheckSquare size={20} /> : <Square size={20} />}
                    </div>
                  )}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600 }}>{o.label}</div>
                    <div style={{ fontSize: 13.5, marginTop: 2 }}>
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
              <span>Entrée {isMember ? "(tarif membre)" : "(tarif non-membre)"}</span>
              <span>{formatEuro(entryPrice)}</span>
            </div>
            {checkableExtras
              .filter((o) => selectedExtraIds.includes(o.id))
              .map((o) => (
                <div key={o.id} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
                  <span>+ {o.label}</span>
                  <span>{formatEuro(o.price)}</span>
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
            {!isMember && Number(event.price_member) < Number(event.price_nonmember) && (
              <div style={{ fontSize: 11.5, color: colors.muted, marginTop: 6 }}>
                Membre ? Connecte-toi pour voir ton tarif ({formatEuro(event.price_member)} l'entrée).
              </div>
            )}
          </div>
        )}

        {externalPay ? (
          <div style={{ marginBottom: 16 }}>
            {!user && (
              <input
                placeholder="Ton prénom et ton nom"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  background: colors.surface,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 12,
                  padding: "11px 12px",
                  fontSize: 14,
                  color: colors.ink,
                  marginBottom: 10
                }}
              />
            )}
            <button
              onClick={handleExternalReservation}
              disabled={reserving}
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
              <Check size={15} /> {reserving ? "Réservation…" : `Réserver et payer ${formatEuro(externalTotal)}`}
            </button>
            <p style={{ fontSize: 11.5, color: colors.muted, textAlign: "center", margin: "8px 0 0", lineHeight: 1.4 }}>
              Tu reçois ta confirmation avec ton code de réservation, puis tu règles via SumUp.
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
                {full ? "Complet" : registering ? "Inscription…" : "Je m'inscris — gratuit"}
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
              {full ? "Complet" : `S'inscrire — dès ${Math.min(event.price_member, event.price_nonmember)} €`}
            </button>
            {!full && (
              <p style={{ fontSize: 12, color: colors.muted, textAlign: "center", marginTop: -4, marginBottom: 16 }}>
                {event.price_member} € membres · {event.price_nonmember} € non-membres
              </p>
            )}
          </>
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

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <h2 style={{ fontFamily: fonts.display, fontSize: 16, margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
            <Images size={16} color={colors.orange} /> Souvenirs de la soirée
          </h2>
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

function Field({ icon, children }) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13 }}>
      {icon} {children}
    </div>
  );
}
