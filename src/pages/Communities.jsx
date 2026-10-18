import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Plus, Users, Trash2, LogOut, Eye, EyeOff, X } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthContext";
import { colors, fonts } from "../lib/theme";
import { appUrl, whatsappLink, smsLink } from "../lib/invite";
import { shareContent } from "../lib/share";
import CrewAvatar from "../components/CrewAvatar.jsx";

const card = {
  background: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: 16,
  padding: 14,
  marginBottom: 14,
  boxShadow: "0 3px 10px rgba(6,43,73,0.05)"
};

const smallBtn = {
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  background: "none",
  border: `1px solid ${colors.border}`,
  borderRadius: 10,
  padding: "7px 10px",
  fontSize: 12,
  fontWeight: 700,
  color: colors.ink,
  cursor: "pointer"
};

function inviteText(c) {
  return `Ciao ! 🍹 Je t'invite à rejoindre ma communauté « ${c.name} » sur Spritz Connection : on voit quand l'un de nous réserve une soirée et on y va ensemble. ${appUrl(`/c/${c.join_code}`)}`;
}

function CommunityCard({ c, onChanged }) {
  const [open, setOpen] = useState(false);
  const [members, setMembers] = useState(null);
  const [msg, setMsg] = useState("");
  const text = inviteText(c);

  async function toggleOpen() {
    const next = !open;
    setOpen(next);
    if (next && !members) {
      const { data } = await supabase.rpc("community_members_list", { p_id: c.id });
      setMembers(data || []);
    }
  }

  async function togglePresence() {
    await supabase.rpc("set_share_presence", { p_id: c.id, p_share: !c.share_presence });
    onChanged();
  }

  async function copyOrShare() {
    const r = await shareContent({ title: c.name, text, url: appUrl(`/c/${c.join_code}`) });
    if (r === "copied") setMsg("Lien copié !");
    if (r === "failed") setMsg("Copie impossible.");
    if (r === "copied" || r === "failed") setTimeout(() => setMsg(""), 2500);
  }

  async function leave() {
    const warning = c.is_owner && Number(c.member_count) > 1
      ? "Tu es le créateur : la communauté sera confiée au plus ancien membre. Quitter ?"
      : "Quitter cette communauté ?";
    if (!window.confirm(warning)) return;
    await supabase.rpc("leave_community", { p_id: c.id });
    onChanged();
  }

  async function remove() {
    if (!window.confirm(`Supprimer la communauté « ${c.name} » pour tout le monde ?`)) return;
    await supabase.rpc("delete_community", { p_id: c.id });
    onChanged();
  }

  async function kick(m) {
    if (!window.confirm(`Retirer ${m.name} de la communauté ?`)) return;
    await supabase.rpc("remove_community_member", { p_id: c.id, p_user: m.user_id });
    const { data } = await supabase.rpc("community_members_list", { p_id: c.id });
    setMembers(data || []);
    onChanged();
  }

  return (
    <div style={card}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div>
          <div style={{ fontFamily: fonts.display, fontSize: 17, fontWeight: 700, color: colors.navy }}>{c.name}</div>
          <div style={{ fontSize: 12, color: colors.muted }}>
            {c.member_count} membre{Number(c.member_count) > 1 ? "s" : ""}
            {c.is_owner ? " · tu l'as créée" : ""}
          </div>
        </div>
        <button onClick={toggleOpen} style={smallBtn}>
          <Users size={14} /> {open ? "Masquer" : "Membres"}
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        <a href={whatsappLink(text)} target="_blank" rel="noreferrer" style={{ ...smallBtn, background: "#25D366", color: "#fff", border: "none", textDecoration: "none" }}>
          Inviter sur WhatsApp
        </a>
        <a href={smsLink(text)} style={{ ...smallBtn, textDecoration: "none" }}>SMS</a>
        <button onClick={copyOrShare} style={smallBtn}>Autre</button>
      </div>
      {msg && <p style={{ fontSize: 11.5, color: colors.muted, margin: "8px 0 0" }}>{msg}</p>}

      {open && (
        <div style={{ marginTop: 14, borderTop: `1px solid ${colors.border}`, paddingTop: 12 }}>
          {!members ? (
            <p style={{ fontSize: 12, color: colors.muted, margin: 0 }}>Chargement…</p>
          ) : (
            members.map((m) => (
              <div key={m.user_id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <CrewAvatar name={m.name} photoUrl={m.photo_url} size={30} />
                <span style={{ fontSize: 13.5, flex: 1 }}>
                  {m.name}
                  {m.is_owner && <span style={{ color: colors.orange, fontSize: 11, fontWeight: 700 }}> · créateur</span>}
                </span>
                {c.is_owner && !m.is_owner && (
                  <button onClick={() => kick(m)} aria-label={`Retirer ${m.name}`} style={{ background: "none", border: "none", cursor: "pointer", color: colors.muted }}>
                    <X size={16} />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}

      <div style={{ marginTop: 12, borderTop: `1px solid ${colors.border}`, paddingTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={togglePresence} style={smallBtn}>
          {c.share_presence ? <Eye size={14} /> : <EyeOff size={14} />}
          {c.share_presence ? "Mes réservations sont visibles ici" : "Mes réservations sont masquées ici"}
        </button>
        <button onClick={leave} style={smallBtn}>
          <LogOut size={14} /> Quitter
        </button>
        {c.is_owner && (
          <button onClick={remove} style={{ ...smallBtn, color: "#B3261E" }}>
            <Trash2 size={14} /> Supprimer
          </button>
        )}
      </div>
    </div>
  );
}

export default function Communities() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [list, setList] = useState(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const { data, error: err } = await supabase.rpc("my_communities");
    setList(err ? [] : data || []);
  }

  useEffect(() => {
    if (user) load();
  }, [user]);

  async function create() {
    if (name.trim().length < 2) {
      setError("Donne un nom à ta communauté (2 lettres minimum).");
      return;
    }
    setBusy(true);
    setError("");
    const { error: err } = await supabase.rpc("create_community", { p_name: name.trim() });
    if (err) setError(err.message || "Impossible de créer la communauté.");
    else {
      setName("");
      await load();
    }
    setBusy(false);
  }

  return (
    <div style={{ padding: "0 20px 40px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "18px 0 8px" }}>
        <button onClick={() => navigate("/account")} style={{ background: "none", border: "none", color: colors.ink, cursor: "pointer" }}>
          <ChevronLeft size={22} />
        </button>
        <h1 style={{ fontFamily: fonts.display, fontSize: 20, margin: 0 }}>Mes communautés</h1>
      </div>
      <p style={{ fontSize: 12.5, color: colors.muted, lineHeight: 1.5, margin: "0 0 16px" }}>
        Crée ta petite bande d'amis : vous voyez quand l'un de vous réserve une soirée, vous êtes prévenus, et vous pouvez vous inviter plus facilement.
        Chacun choisit si ses réservations sont visibles.
      </p>

      {!authLoading && !user ? (
        <div style={{ ...card, textAlign: "center" }}>
          <p style={{ fontSize: 13.5, margin: "0 0 12px" }}>Connecte-toi pour créer ou rejoindre une communauté.</p>
          <button
            onClick={() => navigate("/login?next=%2Fcommunities")}
            style={{ background: colors.orange, color: colors.ink, border: "none", borderRadius: 12, padding: "10px 20px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
          >
            Se connecter
          </button>
        </div>
      ) : (
        <>
          <div style={card}>
            <div style={{ fontFamily: fonts.display, fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Créer ma communauté</div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={name}
                maxLength={60}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && create()}
                placeholder="Ex. Les copains du jeudi"
                style={{ flex: 1, background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 12, padding: "10px 12px", fontSize: 14, color: colors.ink, outline: "none" }}
              />
              <button
                onClick={create}
                disabled={busy}
                style={{ background: colors.orange, border: "none", borderRadius: 12, width: 44, cursor: "pointer" }}
                aria-label="Créer"
              >
                <Plus size={18} color={colors.ink} />
              </button>
            </div>
            {error && <p style={{ fontSize: 12.5, color: "#B3261E", margin: "8px 0 0" }}>{error}</p>}
          </div>

          {list && list.length === 0 && (
            <p style={{ fontSize: 13, color: colors.muted, textAlign: "center" }}>Tu n'as pas encore de communauté.</p>
          )}
          {(list || []).map((c) => (
            <CommunityCard key={c.id} c={c} onChanged={load} />
          ))}
        </>
      )}
    </div>
  );
}
