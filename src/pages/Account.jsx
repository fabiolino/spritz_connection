import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, LogOut, Star, Camera, Ticket } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthContext";
import { colors, fonts } from "../lib/theme";
import { useCategories } from "../lib/CategoriesContext";
import { CategoryIcon } from "../lib/eventIcons";
import { NotificationSettings } from "../components/Notifications.jsx";

const GENDERS = [
  { id: "femme", label: "Femme" },
  { id: "homme", label: "Homme" },
  { id: "autre", label: "Autre" },
  { id: "non_precise", label: "Je ne précise pas" }
];

const STATUSES = [
  { id: "celibataire", label: "Célibataire" },
  { id: "en_couple", label: "En couple" },
  { id: "non_precise", label: "Je ne précise pas" }
];

const labelStyle = { fontSize: 12, color: colors.muted, marginBottom: 6, display: "block" };
const inputStyle = {
  width: "100%",
  background: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: 12,
  padding: "10px 12px",
  color: colors.ink,
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box"
};

function ChipPicker({ options, value, onChange, multi, renderIcon }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {options.map((o) => {
        const id = o.id;
        const label = o.label;
        const active = multi ? value.includes(id) : value === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => {
              if (multi) {
                onChange(active ? value.filter((v) => v !== id) : [...value, id]);
              } else {
                onChange(active ? "" : id);
              }
            }}
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
            {renderIcon && renderIcon(o)} {label}
          </button>
        );
      })}
    </div>
  );
}

export default function Account() {
  const navigate = useNavigate();
  const { user, profile, signOut, refreshProfile } = useAuth();
  const { categories } = useCategories();

  const [name, setName] = useState(profile?.name || "");
  const [age, setAge] = useState(profile?.age || "");
  const [gender, setGender] = useState(profile?.gender || "");
  const [relationshipStatus, setRelationshipStatus] = useState(profile?.relationship_status || "");
  const [tastes, setTastes] = useState(profile?.tastes || []);
  const [photoUrl, setPhotoUrl] = useState(profile?.photo_url || "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!user) {
    navigate("/login");
    return null;
  }

  async function handlePhotoChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (!error) {
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      setPhotoUrl(`${data.publicUrl}?t=${Date.now()}`); // cache-bust pour voir la nouvelle photo tout de suite
    }
    setUploading(false);
  }

  async function handleSave() {
    setSaving(true);
    await supabase
      .from("profiles")
      .update({
        name,
        age: age ? Number(age) : null,
        gender: gender || null,
        relationship_status: relationshipStatus || null,
        tastes,
        photo_url: photoUrl || null
      })
      .eq("id", user.id);
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

      <button
        onClick={() => navigate("/tickets")}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          background: colors.surface,
          border: `1.5px solid ${colors.orange}`,
          color: colors.orange,
          borderRadius: 14,
          padding: 12,
          fontSize: 14,
          fontWeight: 700,
          cursor: "pointer",
          marginBottom: 18
        }}
      >
        <Ticket size={16} /> Mes billets
      </button>

      {/* Photo de profil */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
        <label style={{ position: "relative", cursor: "pointer" }}>
          <div
            style={{
              width: 92,
              height: 92,
              borderRadius: "50%",
              background: photoUrl ? `url(${photoUrl}) center/cover` : colors.surface,
              border: `2px solid ${colors.orange}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            {!photoUrl && <Camera size={26} color={colors.muted} />}
          </div>
          <div
            style={{
              position: "absolute",
              bottom: 0,
              right: 0,
              background: colors.orange,
              borderRadius: "50%",
              width: 28,
              height: 28,
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <Camera size={14} color={colors.ink} />
          </div>
          <input type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: "none" }} />
        </label>
      </div>
      {uploading && <p style={{ textAlign: "center", fontSize: 12, color: colors.muted, marginBottom: 10 }}>Envoi de la photo…</p>}

      <p style={{ fontSize: 13, color: colors.muted, marginBottom: 6, textAlign: "center" }}>{user.email}</p>

      {profile?.is_member && (
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: colors.gold,
              color: "#fff",
              borderRadius: 20,
              padding: "4px 12px",
              fontSize: 12,
              fontWeight: 700,
              boxShadow: "0 3px 10px rgba(240,180,41,0.35)"
            }}
          >
            <Star size={13} /> Membre Spritz Connection
          </div>
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Nom affiché (dans le chat des événements)</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ton prénom" style={inputStyle} />
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Âge</label>
          <input type="number" min="1" max="120" value={age} onChange={(e) => setAge(e.target.value)} style={inputStyle} />
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Genre</label>
        <ChipPicker options={GENDERS} value={gender} onChange={setGender} />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Statut</label>
        <ChipPicker options={STATUSES} value={relationshipStatus} onChange={setRelationshipStatus} />
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>Ce que tu aimes comme sorties</label>
        <ChipPicker options={categories} value={tastes} onChange={setTastes} multi renderIcon={(c) => <CategoryIcon category={c} size={14} />} />
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
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
          marginBottom: 24,
          boxShadow: "0 4px 12px rgba(232,95,38,0.3)"
        }}
      >
        {saving ? "Enregistrement…" : "Enregistrer"}
      </button>

      <NotificationSettings />

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
