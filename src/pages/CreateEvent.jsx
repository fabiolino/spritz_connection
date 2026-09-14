import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Check, Lock, Globe } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthContext";
import { colors, fonts } from "../lib/theme";
import { useCategories } from "../lib/CategoriesContext";
import { CategoryIcon } from "../lib/eventIcons";

const inputStyle = {
  width: "100%",
  background: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: 12,
  padding: "10px 12px",
  color: colors.ink,
  fontSize: 13.5,
  outline: "none",
  fontFamily: fonts.body,
  boxSizing: "border-box"
};

const labelStyle = { fontSize: 12, color: colors.muted, marginBottom: 5, display: "block" };

export default function CreateEvent() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { categories } = useCategories();
  const [form, setForm] = useState({
    adminSecret: "",
    title: "",
    organizer: "",
    description: "",
    event_date: "",
    address: "",
    phone: "",
    price_member: "",
    price_nonmember: "",
    seats: "",
    category: "autre",
    visibility: "public"
  });
  const [profiles, setProfiles] = useState([]);
  const [invitedIds, setInvitedIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (form.visibility === "private" && user) {
      supabase
        .from("profiles")
        .select("id, name, email")
        .neq("id", user.id)
        .then(({ data }) => setProfiles(data || []));
    }
  }, [form.visibility, user]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function toggleInvite(id) {
    setInvitedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/create-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          organizerId: user?.id || null,
          invitedUserIds: form.visibility === "private" ? invitedIds : []
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Une erreur est survenue");
        setLoading(false);
        return;
      }
      setSuccess(true);
      setTimeout(() => navigate("/"), 1200);
    } catch (err) {
      setError("Impossible de contacter le serveur");
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div style={{ padding: "60px 20px", textAlign: "center" }}>
        <Check size={40} color={colors.olive} style={{ marginBottom: 12 }} />
        <p style={{ fontSize: 15, fontWeight: 700 }}>Événement créé !</p>
        <p style={{ fontSize: 13, color: colors.muted }}>Retour à l'accueil…</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "0 20px 60px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "18px 0 16px" }}>
        <button onClick={() => navigate("/admin")} style={{ background: "none", border: "none", color: colors.ink, cursor: "pointer" }}>
          <ChevronLeft size={22} />
        </button>
        <h1 style={{ fontFamily: fonts.display, fontSize: 19, margin: 0 }}>Créer un événement</h1>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label style={labelStyle}>Mot de passe administrateur</label>
          <input type="password" required style={inputStyle} value={form.adminSecret} onChange={(e) => update("adminSecret", e.target.value)} />
        </div>

        <div>
          <label style={labelStyle}>Titre de la soirée</label>
          <input required style={inputStyle} value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="Spritz al Tramonto" />
        </div>

        <div>
          <label style={labelStyle}>Organisateur</label>
          <input required style={inputStyle} value={form.organizer} onChange={(e) => update("organizer", e.target.value)} placeholder="Fabio" />
        </div>

        <div>
          <label style={labelStyle}>Type d'événement</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {categories.map((c) => {
              const active = form.category === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => update("category", c.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    border: `1.5px solid ${active ? colors.orange : colors.border}`,
                    background: active ? "rgba(242,118,46,0.1)" : colors.surface,
                    color: colors.ink,
                    borderRadius: 20,
                    padding: "7px 12px",
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  <CategoryIcon category={c} size={16} /> {c.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label style={labelStyle}>Visibilité</label>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={() => update("visibility", "public")}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                border: `1.5px solid ${form.visibility === "public" ? colors.orange : colors.border}`,
                background: form.visibility === "public" ? "rgba(242,118,46,0.1)" : colors.surface,
                color: colors.ink,
                borderRadius: 12,
                padding: "9px 12px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              <Globe size={14} /> Public
            </button>
            <button
              type="button"
              onClick={() => update("visibility", "private")}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                border: `1.5px solid ${form.visibility === "private" ? colors.orange : colors.border}`,
                background: form.visibility === "private" ? "rgba(242,118,46,0.1)" : colors.surface,
                color: colors.ink,
                borderRadius: 12,
                padding: "9px 12px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              <Lock size={14} /> Privé (invitation)
            </button>
          </div>
          {form.visibility === "private" && !user && (
            <p style={{ fontSize: 11.5, color: colors.red, marginTop: 6 }}>
              Connecte-toi (bouton en haut de l'accueil) pour pouvoir choisir des invités.
            </p>
          )}
        </div>

        {form.visibility === "private" && user && (
          <div>
            <label style={labelStyle}>Inviter ({invitedIds.length} sélectionné{invitedIds.length > 1 ? "s" : ""})</label>
            <div style={{ maxHeight: 220, overflowY: "auto", border: `1px solid ${colors.border}`, borderRadius: 12, padding: 8 }}>
              {profiles.length === 0 && <p style={{ fontSize: 12, color: colors.muted, padding: 6 }}>Aucun autre compte trouvé pour l'instant.</p>}
              {profiles.map((p) => (
                <label
                  key={p.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "7px 6px",
                    fontSize: 13,
                    cursor: "pointer"
                  }}
                >
                  <input type="checkbox" checked={invitedIds.includes(p.id)} onChange={() => toggleInvite(p.id)} />
                  {p.name || p.email}
                </label>
              ))}
            </div>
          </div>
        )}

        <div>
          <label style={labelStyle}>Description</label>
          <textarea
            style={{ ...inputStyle, minHeight: 70, resize: "vertical" }}
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            placeholder="Apéritif italien classique…"
          />
        </div>

        <div>
          <label style={labelStyle}>Date et heure</label>
          <input
            type="datetime-local"
            required
            style={inputStyle}
            value={form.event_date}
            onChange={(e) => update("event_date", e.target.value)}
          />
        </div>

        <div>
          <label style={labelStyle}>Adresse</label>
          <input required style={inputStyle} value={form.address} onChange={(e) => update("address", e.target.value)} placeholder="12 Quai de Valmy, 75010 Paris" />
        </div>

        <div>
          <label style={labelStyle}>Téléphone de contact</label>
          <input required style={inputStyle} value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="06 12 34 56 78" />
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Tarif membre (€)</label>
            <input type="number" min="0" step="0.5" required style={inputStyle} value={form.price_member} onChange={(e) => update("price_member", e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Tarif non-membre (€)</label>
            <input type="number" min="0" step="0.5" required style={inputStyle} value={form.price_nonmember} onChange={(e) => update("price_nonmember", e.target.value)} />
          </div>
        </div>

        <div>
          <label style={labelStyle}>Nombre de places</label>
          <input type="number" min="1" required style={inputStyle} value={form.seats} onChange={(e) => update("seats", e.target.value)} />
        </div>

        {error && <p style={{ color: colors.red, fontSize: 13 }}>{error}</p>}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            background: colors.orange,
            color: colors.ink,
            border: "none",
            borderRadius: 14,
            padding: 14,
            fontWeight: 700,
            fontSize: 15,
            cursor: "pointer",
            marginTop: 4
          }}
        >
          {loading ? "Création…" : "Créer l'événement"}
        </button>
      </form>
    </div>
  );
}
