import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, LogOut, Star } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthContext";
import { colors, fonts } from "../lib/theme";

export default function Account() {
  const navigate = useNavigate();
  const { user, profile, signOut, refreshProfile } = useAuth();
  const [name, setName] = useState(profile?.name || "");
  const [saving, setSaving] = useState(false);

  if (!user) {
    navigate("/login");
    return null;
  }

  async function handleSave() {
    setSaving(true);
    await supabase.from("profiles").update({ name }).eq("id", user.id);
    await refreshProfile();
    setSaving(false);
  }

  async function handleLogout() {
    await signOut();
    navigate("/");
  }

  return (
    <div style={{ padding: "0 20px 40px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "18px 0 16px" }}>
        <button onClick={() => navigate("/")} style={{ background: "none", border: "none", color: colors.ink, cursor: "pointer" }}>
          <ChevronLeft size={22} />
        </button>
        <h1 style={{ fontFamily: fonts.display, fontSize: 20, margin: 0 }}>Mon compte</h1>
      </div>

      <p style={{ fontSize: 13, color: colors.muted, marginBottom: 6 }}>{user.email}</p>

      {profile?.is_member && (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "rgba(240,180,41,0.15)",
            color: colors.gold,
            border: `1px solid ${colors.gold}`,
            borderRadius: 20,
            padding: "4px 12px",
            fontSize: 12,
            fontWeight: 700,
            marginBottom: 20
          }}
        >
          <Star size={13} /> Membre Spritz Connection
        </div>
      )}

      <label style={{ fontSize: 12, color: colors.muted, marginBottom: 5, display: "block" }}>
        Nom affiché (dans le chat des événements)
      </label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Ton prénom"
        style={{
          width: "100%",
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: 12,
          padding: "10px 12px",
          color: colors.ink,
          fontSize: 14,
          outline: "none",
          boxSizing: "border-box",
          marginBottom: 14
        }}
      />

      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          width: "100%",
          background: colors.orange,
          color: colors.ink,
          border: "none",
          borderRadius: 14,
          padding: 13,
          fontWeight: 700,
          fontSize: 14,
          cursor: "pointer",
          marginBottom: 24
        }}
      >
        {saving ? "Enregistrement…" : "Enregistrer"}
      </button>

      <button
        onClick={handleLogout}
        style={{
          width: "100%",
          background: "none",
          border: `1px solid ${colors.border}`,
          color: colors.muted,
          borderRadius: 14,
          padding: 12,
          fontSize: 13,
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          cursor: "pointer"
        }}
      >
        <LogOut size={15} /> Se déconnecter
      </button>
    </div>
  );
}
