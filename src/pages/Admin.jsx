import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Check, X, CalendarPlus, Clock, Star, Users, UserCheck, Ban, Copy, BarChart3, Pencil, Trash2 } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { colors, fonts } from "../lib/theme";

const DEMO_REQUESTS = [
  { id: 1, name: "Giulia R.", note: "Envie d'organiser une soirée cinéma italien à Belleville." }
];

export default function Admin() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState(DEMO_REQUESTS);
  const [pendingEvents, setPendingEvents] = useState([]);
  const [adminSecret, setAdminSecret] = useState("");
  const [moderating, setModerating] = useState(null);
  const [modError, setModError] = useState("");

  const [members, setMembers] = useState(null);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [membersError, setMembersError] = useState("");
  const [togglingId, setTogglingId] = useState(null);

  const [allEvents, setAllEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [guestState, setGuestState] = useState(null);
  const [loadingGuests, setLoadingGuests] = useState(false);
  const [guestsError, setGuestsError] = useState("");
  const [guestToggling, setGuestToggling] = useState(null);

  const [duplicateDate, setDuplicateDate] = useState("");
  const [duplicating, setDuplicating] = useState(false);
  const [duplicateMsg, setDuplicateMsg] = useState("");

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState("");

  const [venueStats, setVenueStats] = useState(null);
  const [loadingVenueStats, setLoadingVenueStats] = useState(false);
  const [venueStatsError, setVenueStatsError] = useState("");

  const [adminVerified, setAdminVerified] = useState(null);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    async function loadPending() {
      if (!import.meta.env.VITE_SUPABASE_URL) return;
      const { data } = await supabase.from("events").select("*").eq("approved", false);
      if (data) setPendingEvents(data);
    }
    loadPending();

    async function loadAllEvents() {
      if (!import.meta.env.VITE_SUPABASE_URL) return;
      const { data } = await supabase.from("events").select("id, title, event_date").order("event_date", { ascending: false }).limit(50);
      if (data) setAllEvents(data);
    }
    loadAllEvents();
  }, []);

  async function handleVerifyAdmin(e) {
    if (e) e.preventDefault();
    if (!adminSecret) {
      setAdminVerified(false);
      return;
    }
    setVerifying(true);
    setAdminVerified(null);
    try {
      const res = await fetch("/api/list-members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminSecret })
      });
      const data = await res.json();
      if (!res.ok) {
        setAdminVerified(false);
        setVerifying(false);
        return;
      }
      setMembers(data.profiles);
      setAdminVerified(true);
      setVerifying(false);
    } catch (err) {
      setAdminVerified(false);
      setVerifying(false);
    }
  }

  async function moderate(eventId, action) {
    if (!adminSecret) {
      setModError("Renseigne le mot de passe administrateur d'abord");
      return;
    }
    setModerating(eventId);
    setModError("");
    try {
      const res = await fetch("/api/moderate-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminSecret, eventId, action })
      });
      const data = await res.json();
      if (!res.ok) {
        setModError(data.error || "Erreur");
        setModerating(null);
        return;
      }
      setPendingEvents((prev) => prev.filter((e) => e.id !== eventId));
      setModerating(null);
    } catch (err) {
      setModError("Impossible de contacter le serveur");
      setModerating(null);
    }
  }

  async function loadMembers() {
    if (!adminSecret) {
      setMembersError("Renseigne le mot de passe administrateur d'abord");
      return;
    }
    setLoadingMembers(true);
    setMembersError("");
    try {
      const res = await fetch("/api/list-members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminSecret })
      });
      const data = await res.json();
      if (!res.ok) {
        setMembersError(data.error || "Erreur");
        setLoadingMembers(false);
        return;
      }
      setMembers(data.profiles);
      setLoadingMembers(false);
    } catch (err) {
      setMembersError("Impossible de contacter le serveur");
      setLoadingMembers(false);
    }
  }

  async function toggleMember(profileId, current) {
    setTogglingId(profileId);
    try {
      const res = await fetch("/api/set-member-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminSecret, profileId, isMember: !current })
      });
      if (res.ok) {
        setMembers((prev) => prev.map((m) => (m.id === profileId ? { ...m, is_member: !current } : m)));
      }
      setTogglingId(null);
    } catch (err) {
      setTogglingId(null);
    }
  }

  async function loadGuests(eventId) {
    setSelectedEventId(eventId);
    setGuestState(null);
    setGuestsError("");
    setDuplicateMsg("");
    setDuplicateDate("");
    setConfirmingDelete(false);
    setDeleteMsg("");
    if (!eventId) return;
    if (!adminSecret) {
      setGuestsError("Renseigne le mot de passe administrateur d'abord");
      return;
    }
    if (!members) {
      await loadMembers();
    }
    setLoadingGuests(true);
    try {
      const res = await fetch("/api/manage-guests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminSecret, action: "list", eventId })
      });
      const data = await res.json();
      if (!res.ok) {
        setGuestsError(data.error || "Erreur");
        setLoadingGuests(false);
        return;
      }
      setGuestState({ invited: data.invited || [], blocked: data.blocked || [] });
      setLoadingGuests(false);
    } catch (err) {
      setGuestsError("Impossible de contacter le serveur");
      setLoadingGuests(false);
    }
  }

  async function toggleGuestAction(action, userId, currentlyOn) {
    setGuestToggling(userId + action);
    try {
      const res = await fetch("/api/manage-guests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminSecret, action, eventId: selectedEventId, userId, value: !currentlyOn })
      });
      if (res.ok) {
        setGuestState((prev) => {
          const key = action === "set-invite" ? "invited" : "blocked";
          const list = prev[key];
          const next = currentlyOn ? list.filter((id) => id !== userId) : [...list, userId];
          return { ...prev, [key]: next };
        });
      }
      setGuestToggling(null);
    } catch (err) {
      setGuestToggling(null);
    }
  }

  async function handleDuplicate() {
    if (!adminSecret) {
      setDuplicateMsg("Renseigne le mot de passe administrateur d'abord");
      return;
    }
    if (!duplicateDate) {
      setDuplicateMsg("Choisis une date pour la copie");
      return;
    }
    setDuplicating(true);
    setDuplicateMsg("");
    try {
      const res = await fetch("/api/create-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminSecret, action: "duplicate", eventId: selectedEventId, newDate: duplicateDate })
      });
      const data = await res.json();
      if (!res.ok) {
        setDuplicateMsg(data.error || "Erreur lors de la duplication");
        setDuplicating(false);
        return;
      }
      setDuplicateMsg("Événement dupliqué avec succès !");
      setDuplicateDate("");
      setDuplicating(false);
    } catch (err) {
      setDuplicateMsg("Impossible de contacter le serveur");
      setDuplicating(false);
    }
  }

  async function handleDelete() {
    if (!adminSecret) {
      setDeleteMsg("Renseigne le mot de passe administrateur d'abord");
      return;
    }
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    setDeleting(true);
    setDeleteMsg("");
    try {
      const res = await fetch("/api/create-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminSecret, action: "delete", eventId: selectedEventId })
      });
      const data = await res.json();
      if (!res.ok) {
        setDeleteMsg(data.error || "Erreur lors de la suppression");
        setDeleting(false);
        setConfirmingDelete(false);
        return;
      }
      setAllEvents((prev) => prev.filter((e) => e.id !== selectedEventId));
      setSelectedEventId("");
      setGuestState(null);
      setDeleting(false);
      setConfirmingDelete(false);
      setDeleteMsg("Événement supprimé.");
    } catch (err) {
      setDeleteMsg("Impossible de contacter le serveur");
      setDeleting(false);
      setConfirmingDelete(false);
    }
  }

  async function loadVenueStats() {
    if (!adminSecret) {
      setVenueStatsError("Renseigne le mot de passe administrateur d'abord");
      return;
    }
    setLoadingVenueStats(true);
    setVenueStatsError("");
    try {
      const res = await fetch("/api/manage-guests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminSecret, action: "venue-stats" })
      });
      const data = await res.json();
      if (!res.ok) {
        setVenueStatsError(data.error || "Erreur");
        setLoadingVenueStats(false);
        return;
      }
      setVenueStats(data.stats);
      setLoadingVenueStats(false);
    } catch (err) {
      setVenueStatsError("Impossible de contacter le serveur");
      setLoadingVenueStats(false);
    }
  }

  return (
    <div style={{ padding: "0 20px 40px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "18px 0 16px" }}>
        <button onClick={() => navigate("/")} style={{ background: "none", border: "none", color: colors.ink, cursor: "pointer" }}>
          <ChevronLeft size={22} />
        </button>
        <h1 style={{ fontFamily: fonts.display, fontSize: 20, margin: 0 }}>Espace administrateur</h1>
      </div>

      <button
        onClick={() => navigate("/admin/create-event")}
        style={{
          width: "100%",
          background: colors.orange,
          color: "#fff",
          border: "none",
          borderRadius: 14,
          padding: 13,
          fontWeight: 700,
          fontSize: 14,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          marginBottom: 20,
          boxShadow: "0 4px 12px rgba(232,95,38,0.3)"
        }}
      >
        <CalendarPlus size={16} /> Créer un événement payant
      </button>

      <label style={{ fontSize: 12, color: colors.muted, marginBottom: 5, display: "block" }}>
        Mot de passe administrateur (pour les actions ci-dessous)
      </label>
      <form onSubmit={handleVerifyAdmin} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <input
          type="password"
          placeholder="Mot de passe administrateur"
          value={adminSecret}
          onChange={(e) => {
            setAdminSecret(e.target.value);
            setAdminVerified(null);
          }}
          style={{
            flex: 1,
            background: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: 12,
            padding: "10px 12px",
            color: colors.ink,
            fontSize: 13.5,
            boxSizing: "border-box"
          }}
        />
        <button
          type="submit"
          disabled={verifying}
          style={{
            background: colors.orange,
            border: "none",
            color: "#fff",
            borderRadius: 12,
            padding: "0 16px",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            whiteSpace: "nowrap"
          }}
        >
          {verifying ? "…" : "Valider"}
        </button>
      </form>
      {adminVerified === true && (
        <p style={{ fontSize: 12, color: colors.olive, marginBottom: 28, fontWeight: 600 }}>
          <Check size={13} style={{ verticalAlign: "middle", marginRight: 4 }} />
          Mot de passe correct — tu peux utiliser les actions ci-dessous.
        </p>
      )}
      {adminVerified === false && (
        <p style={{ fontSize: 12, color: colors.red, marginBottom: 28, fontWeight: 600 }}>
          <X size={13} style={{ verticalAlign: "middle", marginRight: 4 }} />
          Mot de passe incorrect.
        </p>
      )}
      {adminVerified === null && <div style={{ marginBottom: 20 }} />}

      {pendingEvents.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontFamily: fonts.display, fontSize: 16, margin: "0 0 10px", display: "flex", alignItems: "center", gap: 6 }}>
            <Clock size={16} color={colors.orange} /> Événements gratuits en attente
          </h2>
          {modError && <p style={{ color: colors.red, fontSize: 12, marginBottom: 10 }}>{modError}</p>}

          {pendingEvents.map((e) => (
            <div key={e.id} style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 14, padding: 14, marginBottom: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{e.title}</div>
              <div style={{ fontSize: 12, color: colors.muted, marginBottom: 2 }}>
                Par {e.organizer} — {e.organizer_contact}
              </div>
              <div style={{ fontSize: 12, color: colors.muted, marginBottom: 12 }}>
                {new Date(e.event_date).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })} — {e.address}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  disabled={moderating === e.id}
                  onClick={() => moderate(e.id, "approve")}
                  style={{ flex: 1, background: colors.olive, border: "none", color: colors.ink, borderRadius: 10, padding: 8, fontWeight: 700, cursor: "pointer" }}
                >
                  <Check size={14} style={{ verticalAlign: "middle", marginRight: 6 }} /> Approuver
                </button>
                <button
                  disabled={moderating === e.id}
                  onClick={() => moderate(e.id, "reject")}
                  style={{ flex: 1, background: "none", border: `1px solid ${colors.border}`, color: colors.ink, borderRadius: 10, padding: 8, cursor: "pointer" }}
                >
                  <X size={14} style={{ verticalAlign: "middle", marginRight: 6 }} /> Refuser
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontFamily: fonts.display, fontSize: 16, margin: "0 0 10px", display: "flex", alignItems: "center", gap: 6 }}>
          <UserCheck size={16} color={colors.orange} /> Invités, exclusions &amp; duplication
        </h2>
        <select
          value={selectedEventId}
          onChange={(e) => loadGuests(e.target.value)}
          style={{
            width: "100%",
            background: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: 12,
            padding: "10px 12px",
            color: colors.ink,
            fontSize: 13.5,
            marginBottom: 14,
            boxSizing: "border-box"
          }}
        >
          <option value="">Choisir un événement…</option>
          {allEvents.map((e) => (
            <option key={e.id} value={e.id}>
              {e.title} — {new Date(e.event_date).toLocaleDateString("fr-FR")}
            </option>
          ))}
        </select>

        {selectedEventId && (
          <button
            onClick={() => navigate(`/admin/edit-event/${selectedEventId}`)}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              background: "none",
              border: `1px solid ${colors.blue}`,
              color: colors.blue,
              borderRadius: 12,
              padding: 10,
              fontSize: 12.5,
              fontWeight: 700,
              cursor: "pointer",
              marginBottom: 14
            }}
          >
            <Pencil size={13} /> Modifier cet événement (corriger une erreur)
          </button>
        )}

        {selectedEventId && (
          <div style={{ marginBottom: 14 }}>
            <button
              onClick={handleDelete}
              disabled={deleting}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                background: confirmingDelete ? colors.red : "none",
                border: `1px solid ${colors.red}`,
                color: confirmingDelete ? "#fff" : colors.red,
                borderRadius: 12,
                padding: 10,
                fontSize: 12.5,
                fontWeight: 700,
                cursor: "pointer"
              }}
            >
              <Trash2 size={13} />
              {deleting ? "Suppression…" : confirmingDelete ? "Confirmer la suppression définitive" : "Supprimer cet événement"}
            </button>
            {confirmingDelete && !deleting && (
              <button
                onClick={() => setConfirmingDelete(false)}
                style={{
                  width: "100%",
                  background: "none",
                  border: "none",
                  color: colors.muted,
                  fontSize: 11.5,
                  padding: 6,
                  cursor: "pointer"
                }}
              >
                Annuler
              </button>
            )}
            {deleteMsg && <p style={{ fontSize: 11.5, color: colors.muted, marginTop: 4 }}>{deleteMsg}</p>}
          </div>
        )}

        {selectedEventId && (
          <div
            style={{
              background: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: 12,
              padding: 12,
              marginBottom: 14
            }}
          >
            <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
              <Copy size={13} /> Dupliquer cet événement à une nouvelle date
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="datetime-local"
                value={duplicateDate}
                onChange={(e) => setDuplicateDate(e.target.value)}
                style={{
                  flex: 1,
                  background: colors.bg,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 10,
                  padding: "8px 10px",
                  fontSize: 12.5,
                  color: colors.ink,
                  boxSizing: "border-box"
                }}
              />
              <button
                onClick={handleDuplicate}
                disabled={duplicating}
                style={{
                  background: colors.blue,
                  border: "none",
                  color: "#fff",
                  borderRadius: 10,
                  padding: "0 14px",
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: "pointer",
                  whiteSpace: "nowrap"
                }}
              >
                {duplicating ? "…" : "Dupliquer"}
              </button>
            </div>
            {duplicateMsg && <p style={{ fontSize: 11.5, color: colors.muted, marginTop: 8 }}>{duplicateMsg}</p>}
          </div>
        )}

        {guestsError && <p style={{ color: colors.red, fontSize: 12, marginBottom: 10 }}>{guestsError}</p>}
        {loadingGuests && <p style={{ color: colors.muted, fontSize: 13 }}>Chargement…</p>}

        {guestState && members && (
          <div>
            <p style={{ fontSize: 11.5, color: colors.muted, marginBottom: 10 }}>
              Coche « Inviter » pour ajouter quelqu'un à la liste des invités (utile pour un événement privé), ou « Bloquer » pour lui interdire cet événement précis.
            </p>
            {members.map((m) => {
              const isInvited = guestState.invited.includes(m.id);
              const isBlocked = guestState.blocked.includes(m.id);
              return (
                <div
                  key={m.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: colors.surface,
                    border: `1px solid ${colors.border}`,
                    borderRadius: 12,
                    padding: "10px 12px",
                    marginBottom: 8,
                    gap: 8
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {m.name || m.email}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button
                      onClick={() => toggleGuestAction("set-invite", m.id, isInvited)}
                      disabled={guestToggling === m.id + "set-invite"}
                      style={{
                        background: isInvited ? "rgba(107,124,79,0.15)" : "none",
                        border: `1px solid ${isInvited ? colors.olive : colors.border}`,
                        color: isInvited ? colors.olive : colors.muted,
                        borderRadius: 20,
                        padding: "5px 10px",
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: "pointer",
                        whiteSpace: "nowrap"
                      }}
                    >
                      <UserCheck size={11} style={{ verticalAlign: "middle", marginRight: 4 }} />
                      {isInvited ? "Invité" : "Inviter"}
                    </button>
                    <button
                      onClick={() => toggleGuestAction("set-block", m.id, isBlocked)}
                      disabled={guestToggling === m.id + "set-block"}
                      style={{
                        background: isBlocked ? "rgba(214,67,42,0.12)" : "none",
                        border: `1px solid ${isBlocked ? colors.red : colors.border}`,
                        color: isBlocked ? colors.red : colors.muted,
                        borderRadius: 20,
                        padding: "5px 10px",
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: "pointer",
                        whiteSpace: "nowrap"
                      }}
                    >
                      <Ban size={11} style={{ verticalAlign: "middle", marginRight: 4 }} />
                      {isBlocked ? "Bloqué" : "Bloquer"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontFamily: fonts.display, fontSize: 16, margin: "0 0 10px", display: "flex", alignItems: "center", gap: 6 }}>
          <BarChart3 size={16} color={colors.orange} /> Traçabilité par lieu
        </h2>

        {venueStats === null ? (
          <button
            onClick={loadVenueStats}
            disabled={loadingVenueStats}
            style={{
              width: "100%",
              background: "none",
              border: `1px solid ${colors.border}`,
              color: colors.ink,
              borderRadius: 12,
              padding: 12,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            {loadingVenueStats ? "Chargement…" : "Afficher la traçabilité par lieu"}
          </button>
        ) : venueStats.length === 0 ? (
          <p style={{ fontSize: 12.5, color: colors.muted }}>Aucun lieu enregistré pour l'instant.</p>
        ) : (
          venueStats.map((v) => (
            <div
              key={v.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: 12,
                padding: "10px 12px",
                marginBottom: 8
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600 }}>{v.name}</div>
              <div style={{ fontSize: 11.5, color: colors.muted, textAlign: "right" }}>
                {v.eventsCount} événement{v.eventsCount > 1 ? "s" : ""} · {v.registrationsCount} inscription{v.registrationsCount > 1 ? "s" : ""}
              </div>
            </div>
          ))
        )}
        {venueStatsError && <p style={{ color: colors.red, fontSize: 12, marginTop: 8 }}>{venueStatsError}</p>}
      </div>

      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontFamily: fonts.display, fontSize: 16, margin: "0 0 10px", display: "flex", alignItems: "center", gap: 6 }}>
          <Users size={16} color={colors.orange} /> Membres
        </h2>

        {members === null ? (
          <button
            onClick={loadMembers}
            disabled={loadingMembers}
            style={{
              width: "100%",
              background: "none",
              border: `1px solid ${colors.border}`,
              color: colors.ink,
              borderRadius: 12,
              padding: 12,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            {loadingMembers ? "Chargement…" : "Afficher les comptes inscrits"}
          </button>
        ) : (
          members.map((m) => (
            <div
              key={m.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: 12,
                padding: "10px 12px",
                marginBottom: 8
              }}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{m.name || m.email}</div>
                <div style={{ fontSize: 11, color: colors.muted }}>{m.email}</div>
              </div>
              <button
                onClick={() => toggleMember(m.id, m.is_member)}
                disabled={togglingId === m.id}
                style={{
                  background: m.is_member ? "rgba(240,180,41,0.15)" : "none",
                  border: `1px solid ${m.is_member ? colors.gold : colors.border}`,
                  color: m.is_member ? colors.gold : colors.muted,
                  borderRadius: 20,
                  padding: "5px 12px",
                  fontSize: 11.5,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  whiteSpace: "nowrap"
                }}
              >
                <Star size={11} /> {m.is_member ? "Membre" : "Non-membre"}
              </button>
            </div>
          ))
        )}
        {membersError && <p style={{ color: colors.red, fontSize: 12, marginTop: 8 }}>{membersError}</p>}
      </div>

      <h2 style={{ fontFamily: fonts.display, fontSize: 16, margin: "0 0 10px" }}>Co-organisateurs</h2>
      <p style={{ fontSize: 13, color: colors.muted, marginBottom: 20 }}>
        Valide les demandes pour qu'une personne puisse créer ses propres soirées sous Spritz Connection.
      </p>

      {requests.map((r) => (
        <div key={r.id} style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 14, padding: 14, marginBottom: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{r.name}</div>
          <div style={{ fontSize: 13, color: colors.muted, marginBottom: 12 }}>{r.note}</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setRequests((prev) => prev.filter((x) => x.id !== r.id))}
              style={{ flex: 1, background: colors.olive, border: "none", color: colors.ink, borderRadius: 10, padding: 8, fontWeight: 700, cursor: "pointer" }}
            >
              <Check size={14} style={{ verticalAlign: "middle", marginRight: 6 }} /> Valider
            </button>
            <button
              onClick={() => setRequests((prev) => prev.filter((x) => x.id !== r.id))}
              style={{ flex: 1, background: "none", border: `1px solid ${colors.border}`, color: colors.ink, borderRadius: 10, padding: 8, cursor: "pointer" }}
            >
              <X size={14} style={{ verticalAlign: "middle", marginRight: 6 }} /> Refuser
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
