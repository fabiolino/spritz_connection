import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Check, ExternalLink } from "lucide-react";
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

export default function ProposeEvent() {
  const navigate = useNavigate();
  const { categories } = useCategories();
  const [isPaid, setIsPaid] = useState(false);
  const [form, setForm] = useState({
    title: "",
    organizer: "",
    organizer_contact: "",
    description: "",
    event_date: "",
    address: "",
    phone: "",
    seats: "",
    category: "autre",
    price_member: "",
    price_nonmember: "",
    sumupLink: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (isPaid && !form.sumupLink) {
      setError("Le lien de paiement est obligatoire pour un événement payant.");
      return;
    }
    if (isPaid && !form.price_member && !form.price_nonmember) {
      setError("Renseigne au moins un tarif (membre ou non-membre).");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...form,
        price_member: isPaid ? form.price_member : 0,
        price_nonmember: isPaid ? form.price_nonmember : 0,
        sumupLink: isPaid ? form.sumupLink : ""
      };
      const res = await fetch("/api/create-free-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Une erreur est survenue");
        setLoading(false);
        return;
      }
      setSuccess(true);
    } catch (err) {
      setError("Impossible de contacter le serveur");
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div style={{ padding: "60px 20px", textAlign: "center" }}>
        <Check size={40} color={colors.olive} style={{ marginBottom: 12 }} />
        <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Proposition envoyée !</p>
        <p style={{ fontSize: 13, color: colors.muted, marginBottom: 20 }}>
          Ton événement sera visible dans l'app dès qu'il aura été validé par l'équipe Spritz Connection.
        </p>
        <button
          onClick={() => navigate("/")}
          style={{ background: colors.orange, color: colors.ink, border: "none", borderRadius: 12, padding: "10px 20px", fontWeight: 700, cursor: "pointer" }}
        >
          Retour à l'accueil
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: "0 20px 60px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "18px 0 16px" }}>
        <button onClick={() => navigate("/")} style={{ background: "none", border: "none", color: colors.ink, cursor: "pointer" }}>
          <ChevronLeft size={22} />
        </button>
        <h1 style={{ fontFamily: fonts.display, fontSize: 19, margin: 0 }}>Proposer une soirée</h1>
      </div>

      <p style={{ fontSize: 13, color: colors.muted, marginBottom: 20, lineHeight: 1.5 }}>
        Ton événement sera examiné avant de devenir visible dans l'app — compte quelques heures.
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        <button
          type="button"
          onClick={() => setIsPaid(false)}
          style={{
            flex: 1,
            border: `1.5px solid ${!isPaid ? colors.orange : colors.border}`,
            background: !isPaid ? "rgba(242,118,46,0.1)" : colors.surface,
            color: colors.ink,
            borderRadius: 12,
            padding: 10,
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer"
          }}
        >
          Gratuit
        </button>
        <button
          type="button"
          onClick={() => setIsPaid(true)}
          style={{
            flex: 1,
            border: `1.5px solid ${isPaid ? colors.orange : colors.border}`,
            background: isPaid ? "rgba(242,118,46,0.1)" : colors.surface,
            color: colors.ink,
            borderRadius: 12,
            padding: 10,
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer"
          }}
        >
          Payant
        </button>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label style={labelStyle}>Titre de la soirée</label>
          <input required style={inputStyle} value={form.title} onChange={(e) => update("title", e.target.value)} />
        </div>

        <div>
          <label style={labelStyle}>Ton nom</label>
          <input required style={inputStyle} value={form.organizer} onChange={(e) => update("organizer", e.target.value)} />
        </div>

        <div>
          <label style={labelStyle}>Ton email ou téléphone (pour te recontacter)</label>
          <input required style={inputStyle} value={form.organizer_contact} onChange={(e) => update("organizer_contact", e.target.value)} />
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
          <label style={labelStyle}>Description</label>
          <textarea
            style={{ ...inputStyle, minHeight: 70, resize: "vertical" }}
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
          />
        </div>

        <div>
          <label style={labelStyle}>Date et heure</label>
          <input type="datetime-local" required style={inputStyle} value={form.event_date} onChange={(e) => update("event_date", e.target.value)} />
        </div>

        <div>
          <label style={labelStyle}>Adresse</label>
          <input required style={inputStyle} value={form.address} onChange={(e) => update("address", e.target.value)} />
        </div>

        <div>
          <label style={labelStyle}>Téléphone de contact (affiché sur l'événement)</label>
          <input required style={inputStyle} value={form.phone} onChange={(e) => update("phone", e.target.value)} />
        </div>

        <div>
          <label style={labelStyle}>Nombre de places</label>
          <input type="number" min="1" required style={inputStyle} value={form.seats} onChange={(e) => update("seats", e.target.value)} />
        </div>

        {isPaid && (
          <div
            style={{
              background: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: 14,
              padding: 14,
              display: "flex",
              flexDirection: "column",
              gap: 14
            }}
          >
            <p style={{ fontSize: 12, color: colors.muted, margin: 0, lineHeight: 1.5 }}>
              <ExternalLink size={13} style={{ verticalAlign: "middle", marginRight: 4 }} />
              Les règlements passent directement par ton propre lien de paiement — jamais par Spritz Connection.
            </p>

            <div>
              <label style={labelStyle}>Tarif membre (€)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                style={inputStyle}
                value={form.price_member}
                onChange={(e) => update("price_member", e.target.value)}
              />
            </div>

            <div>
              <label style={labelStyle}>Tarif non-membre (€)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                style={inputStyle}
                value={form.price_nonmember}
                onChange={(e) => update("price_nonmember", e.target.value)}
              />
            </div>

            <div>
              <label style={labelStyle}>Lien de paiement (SumUp, Lydia, PayPal…)</label>
              <input
                required={isPaid}
                type="url"
                placeholder="https://…"
                style={inputStyle}
                value={form.sumupLink}
                onChange={(e) => update("sumupLink", e.target.value)}
              />
            </div>
          </div>
        )}

        {error && <p style={{ color: colors.red, fontSize: 13 }}>{error}</p>}

        <button
          type="submit"
          disabled={loading}
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
            marginTop: 4,
            boxShadow: "0 4px 12px rgba(232,95,38,0.3)"
          }}
        >
          {loading ? "Envoi…" : "Proposer cet événement"}
        </button>
      </form>
    </div>
  );
}
