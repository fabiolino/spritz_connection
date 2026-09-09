import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Check } from "lucide-react";
import { colors, fonts } from "../lib/theme";

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
  const [form, setForm] = useState({
    title: "",
    organizer: "",
    organizer_contact: "",
    description: "",
    event_date: "",
    address: "",
    phone: "",
    seats: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/create-free-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
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
        <h1 style={{ fontFamily: fonts.display, fontSize: 19, margin: 0 }}>Proposer une soirée gratuite</h1>
      </div>

      <p style={{ fontSize: 13, color: colors.muted, marginBottom: 20, lineHeight: 1.5 }}>
        Ton événement sera examiné avant de devenir visible dans l'app — compte quelques heures.
      </p>

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
          {loading ? "Envoi…" : "Proposer cet événement"}
        </button>
      </form>
    </div>
  );
}
