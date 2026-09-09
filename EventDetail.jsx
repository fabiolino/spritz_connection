import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Calendar, User, MapPin, Phone, MessageCircle, ChevronLeft, Check } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { colors, fonts } from "../lib/theme";

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [registering, setRegistering] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [error, setError] = useState("");

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
    }
    load();
  }, [id]);

  if (!event) return null;
  const full = event.taken >= event.seats;

  async function handleFreeRegister() {
    setRegistering(true);
    setError("");
    try {
      const res = await fetch("/api/register-free", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: id })
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

  return (
    <div style={{ padding: "0 20px 40px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "18px 0 16px" }}>
        <button onClick={() => navigate("/")} style={{ background: "none", border: "none", color: colors.ink, cursor: "pointer" }}>
          <ChevronLeft size={22} />
        </button>
        <h1 style={{ fontFamily: fonts.display, fontSize: 20, margin: 0 }}>{event.title}</h1>
      </div>

      <p style={{ fontSize: 14, lineHeight: 1.6, color: colors.muted, marginBottom: 20 }}>{event.description}</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
        <Field icon={<Calendar size={15} color={colors.orange} />}>
          {new Date(event.event_date).toLocaleString("fr-FR", { dateStyle: "full", timeStyle: "short" })}
        </Field>
        <Field icon={<User size={15} color={colors.orange} />}>Organisateur — {event.organizer}</Field>
        <Field icon={<MapPin size={15} color={colors.orange} />}>{event.address}</Field>
        <Field icon={<Phone size={15} color={colors.orange} />}>{event.phone}</Field>
      </div>

      {event.is_free ? (
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
                marginBottom: 6
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
              color: full ? colors.muted : colors.ink,
              border: "none",
              borderRadius: 14,
              padding: 14,
              fontWeight: 700,
              fontSize: 15,
              cursor: full ? "not-allowed" : "pointer",
              marginBottom: 10
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
          background: "none",
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
          gap: 8
        }}
      >
        <MessageCircle size={16} /> Discussion de l'événement
      </button>
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
