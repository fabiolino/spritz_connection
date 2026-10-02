import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, CheckCircle2, Calendar, MapPin, Loader2, XCircle, Ticket as TicketIcon, ExternalLink, Clock, User, Users, LogOut } from "lucide-react";
import { colors, fonts } from "../lib/theme";
import { NotifyPrompt } from "../components/Notifications.jsx";
import { InstallAppPrompt } from "../components/InstallAppPrompt.jsx";

function formatEuro(n) {
  const v = Number(n) || 0;
  return v.toLocaleString("fr-FR", { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 }) + " €";
}

// Page d'arrivée après le paiement SumUp (/ticket/:id), et billet consultable ensuite.
export default function Ticket() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [error, setError] = useState("");
  const [waitedTooLong, setWaitedTooLong] = useState(false);
  const attempts = useRef(0);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [isCancelled, setIsCancelled] = useState(false);

  async function handleCancelRegistration() {
    if (!window.confirm("Confirmer l'annulation de ton inscription ? Tes places seront libérées pour d'autres personnes.")) return;
    setCancelling(true);
    setCancelError("");
    try {
      const res = await fetch("/api/register-free", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", registrationId: id })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCancelError(data.error || "Impossible d'annuler l'inscription");
        setCancelling(false);
        return;
      }
      setIsCancelled(true);
    } catch (err) {
      setCancelError("Impossible de contacter le serveur");
      setCancelling(false);
    }
  }

  useEffect(() => {
    let timer = null;
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/create-sumup-checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "ticket", registrationId: id })
        });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error || "Billet introuvable");
          return;
        }
        setTicket(data.ticket);
        // Paiement pas encore confirmé : on revérifie toutes les 3 secondes pendant 1 minute
        if (!data.ticket.paid && !data.ticket.failed && !data.ticket.external) {
          attempts.current += 1;
          if (attempts.current < 20) timer = setTimeout(load, 3000);
          else setWaitedTooLong(true);
        }
      } catch (err) {
        if (!cancelled) setError("Impossible de contacter le serveur");
      }
    }
    load();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [id]);

  const isMembership = ticket && !ticket.event;
  const isFree = ticket && !isMembership && Number(ticket.amount) === 0;
  const quantity = ticket?.quantity || 1;
  const optionLine = (o) => Number(o.price || 0) * (o.quantity || 1);

  return (
    <div style={{ padding: "0 20px 40px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "18px 0 16px" }}>
        <button
          onClick={() => navigate(ticket?.event ? `/event/${ticket.event.id}` : "/")}
          style={{ background: "none", border: "none", color: colors.ink, cursor: "pointer" }}
        >
          <ChevronLeft size={22} />
        </button>
        <h1 style={{ fontFamily: fonts.display, fontSize: 22, margin: 0, color: colors.navy }}>{isMembership ? "Mon adhésion" : "Mon billet"}</h1>
        <i style={{ display: "inline-block", width: 30, height: 6, background: colors.orange, borderRadius: 99, transform: "rotate(-6deg)" }} />
      </div>

      {error && <p style={{ color: colors.red, fontSize: 14 }}>{error}</p>}

      {!error && !ticket && <p style={{ color: colors.muted, fontSize: 14 }}>Chargement…</p>}

      {ticket && !ticket.paid && !ticket.failed && !ticket.external && (
        <div style={{ textAlign: "center", padding: "40px 10px" }}>
          <Loader2 size={34} color={colors.orange} style={{ animation: "spin 1s linear infinite" }} />
          <style>{"@keyframes spin { to { transform: rotate(360deg); } }"}</style>
          <p style={{ fontSize: 15, fontWeight: 700, margin: "16px 0 6px" }}>Confirmation du paiement…</p>
          <p style={{ fontSize: 13, color: colors.muted, lineHeight: 1.5, margin: 0 }}>
            {waitedTooLong
              ? "La confirmation prend plus de temps que prévu. Si ton paiement est passé, ton billet apparaîtra dans « Mon compte › Mes billets » d'ici quelques minutes."
              : "Ça ne prend que quelques secondes, ne ferme pas cette page."}
          </p>
        </div>
      )}

      {isCancelled && (
        <div style={{ textAlign: "center", padding: "40px 10px" }}>
          <CheckCircle2 size={36} color={colors.olive} />
          <p style={{ fontSize: 15, fontWeight: 700, margin: "16px 0 6px" }}>Inscription annulée</p>
          <p style={{ fontSize: 13, color: colors.muted, lineHeight: 1.5, margin: "0 0 18px" }}>
            Tes places ont été libérées. À bientôt pour une prochaine soirée !
          </p>
          <button
            onClick={() => navigate("/")}
            style={{ background: colors.orange, color: "#fff", border: "none", borderRadius: 14, padding: "12px 20px", fontWeight: 700, cursor: "pointer" }}
          >
            Retour à l'accueil
          </button>
        </div>
      )}

      {!isCancelled && ticket && ticket.failed && (
        <div style={{ textAlign: "center", padding: "40px 10px" }}>
          <XCircle size={36} color={colors.red} />
          <p style={{ fontSize: 15, fontWeight: 700, margin: "16px 0 6px" }}>Le paiement n'a pas abouti</p>
          <p style={{ fontSize: 13, color: colors.muted, lineHeight: 1.5, margin: "0 0 18px" }}>
            Aucun montant n'a été débité. Tu peux réessayer depuis la page de l'événement.
          </p>
          {ticket.event && (
            <button
              onClick={() => navigate(`/event/${ticket.event.id}`)}
              style={{ background: colors.orange, color: "#fff", border: "none", borderRadius: 14, padding: "12px 20px", fontWeight: 700, cursor: "pointer" }}
            >
              Retour à l'événement
            </button>
          )}
        </div>
      )}

      {!isCancelled && ticket && (ticket.paid || ticket.external) && (
        <>
          <div style={{ textAlign: "center", marginBottom: 18 }}>
            <CheckCircle2 size={40} color={colors.olive} />
            <h2 style={{ fontFamily: fonts.display, fontSize: 24, margin: "10px 0 6px" }}>Grazie mille ! 🍹</h2>
            <p style={{ fontSize: 13.5, color: colors.muted, lineHeight: 1.5, margin: 0 }}>
              {isMembership
                ? "Ton adhésion est bien payée. Ton statut membre sera activé très vite — bienvenue dans la famille Spritz Connection !"
                : ticket.external && !ticket.paid
                ? `Ta réservation est enregistrée ! Il ne reste plus qu'à régler ${formatEuro(ticket.amount)} via SumUp. Montre ensuite cette confirmation à l'entrée.`
                : isFree
                ? `Ton inscription${quantity > 1 ? ` pour ${quantity} personnes` : ""} est confirmée. Montre ce code à l'entrée, on a hâte de vous voir !`
                : `Ton paiement est confirmé${quantity > 1 ? ` pour ${quantity} personnes` : ""}. Montre ce billet à l'entrée, on a hâte de ${quantity > 1 ? "vous" : "te"} voir !`}
            </p>
          </div>

          {ticket.external && !ticket.paid && ticket.event?.sumup_link && (
            <a
              href={ticket.event.sumup_link}
              target="_blank"
              rel="noreferrer"
              style={{
                width: "100%",
                boxSizing: "border-box",
                background: colors.orange,
                color: "#fff",
                borderRadius: 14,
                padding: 14,
                fontWeight: 700,
                fontSize: 15,
                marginBottom: 16,
                boxShadow: "0 4px 12px rgba(232,95,38,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                textDecoration: "none"
              }}
            >
              <ExternalLink size={15} /> Payer {formatEuro(ticket.amount)} via SumUp
            </a>
          )}

          <div
            style={{
              background: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: 20,
              overflow: "hidden",
              boxShadow: "0 6px 18px rgba(232,95,38,0.12)"
            }}
          >
            <div style={{ background: colors.orange, color: "#fff", padding: "14px 18px" }}>
              <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", opacity: 0.9, display: "flex", alignItems: "center", gap: 6 }}>
                <TicketIcon size={13} /> Spritz Connection
              </div>
              <div style={{ fontFamily: fonts.display, fontSize: 19, fontWeight: 700, marginTop: 4 }}>
                {isMembership ? "Adhésion annuelle" : ticket.event.title}
              </div>
            </div>

            {!isMembership && (
              <div style={{ padding: "12px 18px 0", fontSize: 13, color: colors.ink }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <Calendar size={14} color={colors.orange} />
                  {new Date(ticket.event.event_date).toLocaleString("fr-FR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <MapPin size={14} color={colors.orange} /> {ticket.event.address}
                </div>
                {ticket.guestName && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                    <User size={14} color={colors.orange} /> {ticket.guestName}
                  </div>
                )}
                {quantity > 1 && (
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginTop: 6 }}>
                    <Users size={14} color={colors.orange} style={{ marginTop: 2, flexShrink: 0 }} />
                    <span>
                      <strong>Billet pour {quantity} personnes</strong>
                      {ticket.attendeeNames?.length > 0 && (
                        <span style={{ color: colors.muted }}> — avec {ticket.attendeeNames.join(", ")}</span>
                      )}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div style={{ borderTop: `2px dashed ${colors.border}`, margin: "14px 0 0" }} />

            <div style={{ textAlign: "center", padding: "16px 18px 6px" }}>
              <div style={{ fontSize: 11, color: colors.muted, textTransform: "uppercase", letterSpacing: 1.5 }}>
                {ticket.external ? "Code de réservation" : "Code à présenter"}
              </div>
              <div style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 38, fontWeight: 800, letterSpacing: 6, color: colors.ink, margin: "4px 0" }}>
                {ticket.code}
              </div>
              {isFree ? (
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    background: "rgba(107,124,79,0.15)",
                    color: colors.olive,
                    fontWeight: 700,
                    fontSize: 12.5,
                    borderRadius: 20,
                    padding: "4px 12px"
                  }}
                >
                  <CheckCircle2 size={13} /> Inscrit{quantity > 1 ? `s · ${quantity} personnes` : ""}
                </div>
              ) : ticket.paid ? (
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    background: "rgba(107,124,79,0.15)",
                    color: colors.olive,
                    fontWeight: 700,
                    fontSize: 12.5,
                    borderRadius: 20,
                    padding: "4px 12px"
                  }}
                >
                  <CheckCircle2 size={13} /> Payé
                </div>
              ) : (
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    background: "rgba(255,197,43,0.18)",
                    color: "#9A6B00",
                    fontWeight: 700,
                    fontSize: 12.5,
                    borderRadius: 20,
                    padding: "4px 12px"
                  }}
                >
                  <Clock size={13} /> Réservé — paiement via SumUp
                </div>
              )}
            </div>

            {!isFree && (
            <div style={{ padding: "12px 18px 16px", fontSize: 13 }}>
              {!isMembership && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0" }}>
                  <span>
                    {quantity > 1 ? `${quantity} entrées` : "Entrée"}
                    {ticket.option === "both" ? " + adhésion" : ""}
                  </span>
                  <span style={{ color: colors.muted }}>
                    {formatEuro(Number(ticket.amount) - ticket.options.reduce((s, o) => s + optionLine(o), 0))}
                  </span>
                </div>
              )}
              {ticket.options.map((o, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0" }}>
                  <span>
                    + {(o.quantity || 1) > 1 ? `${o.quantity} × ` : ""}
                    {o.label}
                  </span>
                  <span style={{ color: colors.muted }}>{formatEuro(optionLine(o))}</span>
                </div>
              ))}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  borderTop: `1px solid ${colors.border}`,
                  marginTop: 6,
                  paddingTop: 8,
                  fontWeight: 700
                }}
              >
                <span>{ticket.paid ? "Total payé" : "Total à régler"}</span>
                <span>{formatEuro(ticket.amount)}</span>
              </div>
            </div>
            )}
          </div>

          <p style={{ fontSize: 12, color: colors.muted, textAlign: "center", marginTop: 14, lineHeight: 1.5 }}>
            {ticket.emailed && (
              <span style={{ display: "block", fontWeight: 700, color: colors.ink, marginBottom: 4 }}>
                ✉️ Ton billet t'a aussi été envoyé par email (pense à regarder dans les spams).
              </span>
            )}
            {ticket.guestName
              ? "Garde cette page ou fais une capture d'écran : c'est ton justificatif de réservation. Crée un compte avec le même email pour le retrouver automatiquement plus tard dans « Mes billets »."
              : "Tu retrouveras ce billet à tout moment dans « Mon compte › Mes billets »."}
          </p>

          {isFree && ticket.event && new Date(ticket.event.event_date) > new Date() && (
            <div style={{ textAlign: "center", marginTop: 10 }}>
              <button
                onClick={handleCancelRegistration}
                disabled={cancelling}
                style={{
                  background: "none",
                  border: `1px solid ${colors.border}`,
                  color: colors.muted,
                  borderRadius: 14,
                  padding: "10px 16px",
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: cancelling ? "default" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6
                }}
              >
                <LogOut size={13} /> {cancelling ? "Annulation…" : "Annuler mon inscription"}
              </button>
              {cancelError && <p style={{ color: colors.red, fontSize: 12, marginTop: 8 }}>{cancelError}</p>}
            </div>
          )}

          <InstallAppPrompt style={{ marginTop: 18 }} />
          {!isMembership && <NotifyPrompt style={{ marginTop: 12 }} />}
        </>
      )}
    </div>
  );
}
