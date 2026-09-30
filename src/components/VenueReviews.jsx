import React, { useState } from "react";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthContext";
import { colors, fonts } from "../lib/theme";
import StarRating from "./StarRating";

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "";
  }
}

// Notations + commentaires sur un lieu partenaire.
// avgRating / reviewCount viennent d'un calcul global fait une fois par la page Venues
// (pour afficher un résumé sans tout charger) ; dès que la liste complète est chargée
// (au premier dépli), la moyenne affichée est recalculée localement pour rester à jour
// immédiatement après l'ajout/la modification d'un avis.
export default function VenueReviews({ venueId, avgRating = 0, reviewCount = 0 }) {
  const { user, profile } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [reviews, setReviews] = useState(null);
  const [loading, setLoading] = useState(false);
  const [draftRating, setDraftRating] = useState(0);
  const [draftComment, setDraftComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const myReview = reviews?.find((r) => r.user_id === user?.id) || null;
  const displayAvg = reviews ? (reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0) : avgRating;
  const displayCount = reviews ? reviews.length : reviewCount;

  async function toggle() {
    if (!expanded && reviews === null) {
      setLoading(true);
      const { data, error: err } = await supabase
        .from("venue_reviews")
        .select("*")
        .eq("venue_id", venueId)
        .order("created_at", { ascending: false });
      if (!err && data) {
        setReviews(data);
        const mine = data.find((r) => r.user_id === user?.id);
        if (mine) {
          setDraftRating(mine.rating);
          setDraftComment(mine.comment || "");
        }
      }
      setLoading(false);
    }
    setExpanded((e) => !e);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!user || !draftRating) return;
    setSaving(true);
    setError("");
    const name = profile?.name || user.email.split("@")[0];
    try {
      const { data, error: err } = await supabase
        .from("venue_reviews")
        .upsert(
          { venue_id: venueId, user_id: user.id, name, rating: draftRating, comment: draftComment.trim() || null },
          { onConflict: "venue_id,user_id" }
        )
        .select()
        .single();
      if (err) throw err;
      setReviews((prev) => {
        const others = (prev || []).filter((r) => r.user_id !== user.id);
        return [data, ...others];
      });
    } catch (err) {
      setError("Impossible d'enregistrer ton avis pour le moment.");
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!myReview) return;
    setSaving(true);
    setError("");
    try {
      await supabase.from("venue_reviews").delete().eq("id", myReview.id);
      setReviews((prev) => prev.filter((r) => r.id !== myReview.id));
      setDraftRating(0);
      setDraftComment("");
    } catch (err) {
      setError("Impossible de supprimer ton avis pour le moment.");
    }
    setSaving(false);
  }

  return (
    <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${colors.border}` }}>
      <button
        type="button"
        onClick={toggle}
        style={{
          width: "100%",
          background: "none",
          border: "none",
          padding: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <StarRating value={displayAvg} size={15} />
          <span style={{ fontSize: 12.5, color: colors.muted, fontFamily: fonts.body }}>
            {displayCount > 0 ? `${displayAvg.toFixed(1)} · ${displayCount} avis` : "Aucun avis pour l'instant"}
          </span>
        </div>
        {expanded ? <ChevronUp size={16} color={colors.muted} /> : <ChevronDown size={16} color={colors.muted} />}
      </button>

      {expanded && (
        <div style={{ marginTop: 12 }}>
          {loading && <p style={{ fontSize: 12.5, color: colors.muted }}>Chargement des avis…</p>}

          {!loading && reviews && reviews.length === 0 && (
            <p style={{ fontSize: 12.5, color: colors.muted, marginBottom: 10 }}>
              Sois le premier à donner ton avis sur ce lieu !
            </p>
          )}

          {!loading &&
            reviews &&
            reviews.map((r) => (
              <div key={r.id} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: `1px solid ${colors.border}` }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 700 }}>
                    {r.name} {r.user_id === user?.id && <span style={{ color: colors.muted, fontWeight: 400 }}>(toi)</span>}
                  </span>
                  <span style={{ fontSize: 11, color: colors.muted }}>{formatDate(r.created_at)}</span>
                </div>
                <StarRating value={r.rating} size={13} />
                {r.comment && <p style={{ fontSize: 12.5, color: colors.ink, margin: "4px 0 0", lineHeight: 1.4 }}>{r.comment}</p>}
              </div>
            ))}

          {user ? (
            <form
              onSubmit={handleSubmit}
              style={{ background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 12 }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                {myReview ? "Modifier mon avis" : "Laisser un avis"}
              </div>
              <StarRating value={draftRating} onChange={setDraftRating} size={22} />
              <textarea
                value={draftComment}
                onChange={(e) => setDraftComment(e.target.value)}
                placeholder="Ton avis sur ce lieu (optionnel)"
                rows={2}
                style={{
                  width: "100%",
                  marginTop: 8,
                  background: colors.surface,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 10,
                  padding: "8px 10px",
                  fontSize: 12.5,
                  color: colors.ink,
                  outline: "none",
                  resize: "vertical",
                  boxSizing: "border-box",
                  fontFamily: fonts.body
                }}
              />
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button
                  type="submit"
                  disabled={saving || !draftRating}
                  style={{
                    flex: 1,
                    background: colors.orange,
                    color: "#fff",
                    border: "none",
                    borderRadius: 10,
                    padding: 9,
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: "pointer"
                  }}
                >
                  {saving ? "Enregistrement…" : myReview ? "Mettre à jour" : "Publier"}
                </button>
                {myReview && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={saving}
                    aria-label="Supprimer mon avis"
                    style={{
                      background: "none",
                      border: `1px solid ${colors.border}`,
                      color: colors.red,
                      borderRadius: 10,
                      padding: "9px 12px",
                      cursor: "pointer"
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              {error && <p style={{ color: colors.red, fontSize: 11.5, marginTop: 6 }}>{error}</p>}
            </form>
          ) : (
            <p style={{ fontSize: 12, color: colors.muted }}>Connecte-toi pour laisser un avis sur ce lieu.</p>
          )}
        </div>
      )}
    </div>
  );
}
