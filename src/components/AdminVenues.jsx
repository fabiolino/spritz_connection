import React, { useState } from "react";
import { Building2, Plus, Pencil, Trash2, MapPin, AlertTriangle, MessageSquare } from "lucide-react";
import { colors, fonts } from "../lib/theme";
import StarRating from "./StarRating";

const EMPTY = {
  id: null,
  name: "",
  address: "",
  description: "",
  capacity: "",
  contact_name: "",
  contact_phone: "",
  contact_email: "",
  payment_info: ""
};

const labelStyle = { fontSize: 12, color: colors.muted, marginBottom: 5, display: "block" };
const inputStyle = {
  width: "100%",
  background: colors.bg,
  border: `1px solid ${colors.border}`,
  borderRadius: 10,
  padding: "9px 11px",
  color: colors.ink,
  fontSize: 13.5,
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "inherit"
};
const smallBtn = {
  background: "none",
  border: `1px solid ${colors.border}`,
  borderRadius: 9,
  padding: "6px 9px",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: 4
};

// Espace Admin : ajouter, modifier et supprimer les lieux partenaires
export default function AdminVenues({ adminSecret }) {
  const [venues, setVenues] = useState(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(null); // null = formulaire fermé
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [reviews, setReviews] = useState(null); // null = section fermée, [] = ouverte et chargée
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [confirmDeleteReviewId, setConfirmDeleteReviewId] = useState(null);
  const [reviewsError, setReviewsError] = useState("");

  async function call(body) {
    const res = await fetch("/api/manage-guests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminSecret, ...body })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Erreur serveur");
    return data;
  }

  async function load() {
    if (!adminSecret) {
      setError("Renseigne le mot de passe administrateur d'abord");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await call({ action: "venues-list" });
      setVenues(data.venues);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  function openForm(venue) {
    setNotice("");
    setError("");
    setConfirmDeleteId(null);
    setForm(
      venue
        ? Object.fromEntries(Object.keys(EMPTY).map((k) => [k, venue[k] ?? (k === "id" ? null : "")]))
        : { ...EMPTY }
    );
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const data = await call({ action: "venue-save", venue: form });
      setVenues((prev) => {
        const others = (prev || []).filter((v) => v.id !== data.venue.id);
        return [...others, data.venue].sort((a, b) => a.name.localeCompare(b.name, "fr"));
      });
      setNotice(
        data.geocoded
          ? `« ${data.venue.name} » est enregistré.`
          : `« ${data.venue.name} » est enregistré, mais l'adresse n'a pas été trouvée sur la carte : vérifie-la (numéro, rue, code postal).`
      );
      setForm(null);
    } catch (err) {
      setError(err.message);
    }
    setSaving(false);
  }

  async function handleDelete(venue) {
    setError("");
    try {
      await call({ action: "venue-delete", venueId: venue.id });
      setVenues((prev) => prev.filter((v) => v.id !== venue.id));
      setNotice(`« ${venue.name} » a été supprimé.`);
      setConfirmDeleteId(null);
    } catch (err) {
      setError(err.message);
    }
  }

  async function loadReviews() {
    if (!adminSecret) {
      setReviewsError("Renseigne le mot de passe administrateur d'abord");
      return;
    }
    setReviewsLoading(true);
    setReviewsError("");
    try {
      const data = await call({ action: "venue-reviews-list" });
      setReviews(data.reviews);
    } catch (err) {
      setReviewsError(err.message);
    }
    setReviewsLoading(false);
  }

  async function handleDeleteReview(review) {
    setReviewsError("");
    try {
      await call({ action: "venue-review-delete", reviewId: review.id });
      setReviews((prev) => prev.filter((r) => r.id !== review.id));
      setConfirmDeleteReviewId(null);
    } catch (err) {
      setReviewsError(err.message);
    }
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  function formatReviewDate(iso) {
    try {
      return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
    } catch {
      return "";
    }
  }

  return (
    <div style={{ marginBottom: 28 }}>
      <h2 style={{ fontFamily: fonts.display, fontSize: 16, margin: "0 0 10px", display: "flex", alignItems: "center", gap: 6 }}>
        <Building2 size={16} color={colors.orange} /> Lieux partenaires
      </h2>

      {venues === null ? (
        <button
          onClick={load}
          disabled={loading}
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
          {loading ? "Chargement…" : "Gérer les lieux (ajouter, modifier, supprimer)"}
        </button>
      ) : (
        <>
          {!form && (
            <button
              onClick={() => openForm(null)}
              style={{
                width: "100%",
                background: colors.orange,
                color: "#fff",
                border: "none",
                borderRadius: 12,
                padding: 11,
                fontSize: 13.5,
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                marginBottom: 12
              }}
            >
              <Plus size={15} /> Ajouter un lieu
            </button>
          )}

          {form && (
            <form
              onSubmit={handleSave}
              style={{
                background: colors.surface,
                border: `1.5px solid ${colors.orange}`,
                borderRadius: 14,
                padding: 14,
                marginBottom: 14,
                display: "flex",
                flexDirection: "column",
                gap: 10
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 14 }}>{form.id ? "Modifier le lieu" : "Nouveau lieu"}</div>
              <div>
                <label style={labelStyle}>Nom du lieu *</label>
                <input required value={form.name} onChange={set("name")} placeholder="La Latteria" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Adresse complète *</label>
                <input required value={form.address} onChange={set("address")} placeholder="12 rue …, 75011 Paris" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Description</label>
                <textarea
                  value={form.description}
                  onChange={set("description")}
                  rows={3}
                  placeholder="Ambiance, espaces disponibles, équipements…"
                  style={{ ...inputStyle, resize: "vertical" }}
                />
              </div>
              <div>
                <label style={labelStyle}>Capacité (personnes)</label>
                <input type="number" min="0" inputMode="numeric" value={form.capacity} onChange={set("capacity")} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Nom du contact</label>
                <input value={form.contact_name} onChange={set("contact_name")} style={inputStyle} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Téléphone</label>
                  <input type="tel" value={form.contact_phone} onChange={set("contact_phone")} style={inputStyle} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Email</label>
                  <input type="email" value={form.contact_email} onChange={set("contact_email")} style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Infos de paiement / pratiques</label>
                <textarea
                  value={form.payment_info}
                  onChange={set("payment_info")}
                  rows={2}
                  placeholder="Ex. : paiement via le lien SumUp du lieu"
                  style={{ ...inputStyle, resize: "vertical" }}
                />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setForm(null)}
                  style={{ ...smallBtn, flex: 1, justifyContent: "center", padding: 10, color: colors.muted }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    flex: 2,
                    background: colors.orange,
                    color: "#fff",
                    border: "none",
                    borderRadius: 9,
                    padding: 10,
                    fontSize: 13.5,
                    fontWeight: 700,
                    cursor: "pointer"
                  }}
                >
                  {saving ? "Enregistrement…" : "Enregistrer"}
                </button>
              </div>
            </form>
          )}

          {notice && <p style={{ fontSize: 12.5, color: colors.olive, margin: "0 0 10px" }}>{notice}</p>}

          {venues.length === 0 && !form && <p style={{ fontSize: 12.5, color: colors.muted }}>Aucun lieu enregistré pour l'instant.</p>}

          {venues.map((v) => (
            <div
              key={v.id}
              style={{
                background: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: 12,
                padding: "10px 12px",
                marginBottom: 8
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700 }}>{v.name}</div>
                  <div style={{ fontSize: 11.5, color: colors.muted, display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                    {v.latitude == null ? <AlertTriangle size={11} color={colors.red} /> : <MapPin size={11} />}
                    {v.address}
                    {v.capacity ? ` · ${v.capacity} pers.` : ""}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button onClick={() => openForm(v)} style={{ ...smallBtn, color: colors.blue }} aria-label="Modifier">
                    <Pencil size={12} />
                  </button>
                  <button onClick={() => setConfirmDeleteId(v.id)} style={{ ...smallBtn, color: colors.red }} aria-label="Supprimer">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
              {confirmDeleteId === v.id && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${colors.border}` }}>
                  <p style={{ fontSize: 12, margin: "0 0 8px" }}>
                    Supprimer « {v.name} » ? Les événements liés restent en ligne, sans lien vers ce lieu.
                  </p>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => setConfirmDeleteId(null)} style={{ ...smallBtn, flex: 1, justifyContent: "center" }}>
                      Annuler
                    </button>
                    <button
                      onClick={() => handleDelete(v)}
                      style={{ ...smallBtn, flex: 1, justifyContent: "center", background: colors.red, color: "#fff", border: "none" }}
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {venues.some((v) => v.latitude == null) && (
            <p style={{ fontSize: 11.5, color: colors.muted, margin: "4px 0 0", display: "flex", alignItems: "center", gap: 4 }}>
              <AlertTriangle size={11} color={colors.red} /> Adresse non trouvée sur la carte : modifie-la pour la corriger.
            </p>
          )}
        </>
      )}

      {error && <p style={{ color: colors.red, fontSize: 12, marginTop: 8 }}>{error}</p>}

      <div style={{ marginTop: 24, paddingTop: 20, borderTop: `1px solid ${colors.border}` }}>
        <h2 style={{ fontFamily: fonts.display, fontSize: 16, margin: "0 0 10px", display: "flex", alignItems: "center", gap: 6 }}>
          <MessageSquare size={16} color={colors.orange} /> Avis sur les lieux
        </h2>

        {reviews === null ? (
          <button
            onClick={loadReviews}
            disabled={reviewsLoading}
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
            {reviewsLoading ? "Chargement…" : "Modérer les avis (voir, supprimer)"}
          </button>
        ) : (
          <>
            {reviews.length === 0 && <p style={{ fontSize: 12.5, color: colors.muted }}>Aucun avis pour l'instant.</p>}

            {reviews.map((r) => (
              <div
                key={r.id}
                style={{
                  background: colors.surface,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 12,
                  padding: "10px 12px",
                  marginBottom: 8
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700 }}>{r.venueName}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, margin: "3px 0" }}>
                      <StarRating value={r.rating} size={12} />
                      <span style={{ fontSize: 11, color: colors.muted }}>
                        {r.name} · {formatReviewDate(r.createdAt)}
                      </span>
                    </div>
                    {r.comment && <p style={{ fontSize: 12.5, color: colors.ink, margin: "4px 0 0", lineHeight: 1.4 }}>{r.comment}</p>}
                  </div>
                  <button
                    onClick={() => setConfirmDeleteReviewId(r.id)}
                    style={{ ...smallBtn, color: colors.red, flexShrink: 0 }}
                    aria-label="Supprimer cet avis"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                {confirmDeleteReviewId === r.id && (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${colors.border}` }}>
                    <p style={{ fontSize: 12, margin: "0 0 8px" }}>Supprimer cet avis définitivement ?</p>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => setConfirmDeleteReviewId(null)} style={{ ...smallBtn, flex: 1, justifyContent: "center" }}>
                        Annuler
                      </button>
                      <button
                        onClick={() => handleDeleteReview(r)}
                        style={{ ...smallBtn, flex: 1, justifyContent: "center", background: colors.red, color: "#fff", border: "none" }}
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </>
        )}

        {reviewsError && <p style={{ color: colors.red, fontSize: 12, marginTop: 8 }}>{reviewsError}</p>}
      </div>
    </div>
  );
}
