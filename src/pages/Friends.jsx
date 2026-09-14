import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, UserPlus, Check, X, Search } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthContext";
import { colors, fonts } from "../lib/theme";

export default function Friends() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [profiles, setProfiles] = useState([]);
  const [requests, setRequests] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    if (!user) return;
    load();
  }, [user]);

  async function load() {
    setLoading(true);
    const [{ data: allProfiles }, { data: allRequests }] = await Promise.all([
      supabase.from("profiles").select("id, name, email, photo_url, age, tastes").neq("id", user.id),
      supabase.from("friend_requests").select("*").or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
    ]);
    setProfiles(allProfiles || []);
    setRequests(allRequests || []);
    setLoading(false);
  }

  function statusWith(profileId) {
    const req = requests.find(
      (r) => (r.sender_id === user.id && r.receiver_id === profileId) || (r.receiver_id === user.id && r.sender_id === profileId)
    );
    if (!req) return { type: "none" };
    if (req.status === "accepted") return { type: "friends", req };
    if (req.status === "pending" && req.sender_id === user.id) return { type: "sent", req };
    if (req.status === "pending" && req.receiver_id === user.id) return { type: "received", req };
    return { type: "none" };
  }

  async function sendRequest(receiverId) {
    setBusyId(receiverId);
    await supabase.from("friend_requests").insert({ sender_id: user.id, receiver_id: receiverId });
    await load();
    setBusyId(null);
  }

  async function respond(reqId, accept) {
    setBusyId(reqId);
    await supabase.from("friend_requests").update({ status: accept ? "accepted" : "declined" }).eq("id", reqId);
    await load();
    setBusyId(null);
  }

  if (authLoading) return null;
  if (!user) {
    return (
      <div style={{ padding: "0 20px 40px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "18px 0 16px" }}>
          <button onClick={() => navigate("/")} style={{ background: "none", border: "none", color: colors.ink, cursor: "pointer" }}>
            <ChevronLeft size={22} />
          </button>
          <h1 style={{ fontFamily: fonts.display, fontSize: 20, margin: 0 }}>Amis</h1>
        </div>
        <p style={{ fontSize: 13, color: colors.muted, marginBottom: 16 }}>Connecte-toi pour voir et ajouter des amis.</p>
        <button
          onClick={() => navigate("/login")}
          style={{ width: "100%", background: colors.orange, color: colors.ink, border: "none", borderRadius: 14, padding: 14, fontWeight: 700, fontSize: 15, cursor: "pointer" }}
        >
          Se connecter
        </button>
      </div>
    );
  }

  const received = requests.filter((r) => r.receiver_id === user.id && r.status === "pending");
  const friendIds = requests.filter((r) => r.status === "accepted").map((r) => (r.sender_id === user.id ? r.receiver_id : r.sender_id));
  const friends = profiles.filter((p) => friendIds.includes(p.id));
  const discover = profiles.filter((p) => {
    const s = statusWith(p.id).type;
    if (s !== "none") return false;
    if (!search.trim()) return true;
    return (p.name || p.email || "").toLowerCase().includes(search.trim().toLowerCase());
  });

  return (
    <div style={{ padding: "0 20px 40px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "18px 0 16px" }}>
        <button onClick={() => navigate("/")} style={{ background: "none", border: "none", color: colors.ink, cursor: "pointer" }}>
          <ChevronLeft size={22} />
        </button>
        <h1 style={{ fontFamily: fonts.display, fontSize: 20, margin: 0 }}>Amis</h1>
      </div>

      {loading && <p style={{ color: colors.muted, fontSize: 13 }}>Chargement…</p>}

      {!loading && received.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontFamily: fonts.display, fontSize: 15, margin: "0 0 10px" }}>Demandes reçues</h2>
          {received.map((r) => {
            const p = profiles.find((pp) => pp.id === r.sender_id);
            if (!p) return null;
            return (
              <ProfileRow key={r.id} p={p}>
                <button
                  onClick={() => respond(r.id, true)}
                  disabled={busyId === r.id}
                  style={{ background: colors.olive, border: "none", color: colors.ink, borderRadius: 10, padding: "6px 10px", fontWeight: 700, fontSize: 12, cursor: "pointer" }}
                >
                  <Check size={13} style={{ verticalAlign: "middle" }} />
                </button>
                <button
                  onClick={() => respond(r.id, false)}
                  disabled={busyId === r.id}
                  style={{ background: "none", border: `1px solid ${colors.border}`, color: colors.ink, borderRadius: 10, padding: "6px 10px", cursor: "pointer" }}
                >
                  <X size={13} style={{ verticalAlign: "middle" }} />
                </button>
              </ProfileRow>
            );
          })}
        </div>
      )}

      {!loading && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontFamily: fonts.display, fontSize: 15, margin: "0 0 10px" }}>Mes amis {friends.length > 0 && `(${friends.length})`}</h2>
          {friends.length === 0 ? (
            <p style={{ fontSize: 13, color: colors.muted }}>Pas encore d'amis — trouve-en ci-dessous.</p>
          ) : (
            friends.map((p) => <ProfileRow key={p.id} p={p} />)
          )}
        </div>
      )}

      {!loading && (
        <div>
          <h2 style={{ fontFamily: fonts.display, fontSize: 15, margin: "0 0 10px" }}>Trouver des amis</h2>
          <div style={{ position: "relative", marginBottom: 14 }}>
            <Search size={15} color={colors.muted} style={{ position: "absolute", left: 12, top: 11 }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un nom…"
              style={{
                width: "100%",
                background: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: 12,
                padding: "9px 12px 9px 36px",
                color: colors.ink,
                fontSize: 13,
                outline: "none",
                boxSizing: "border-box"
              }}
            />
          </div>
          {discover.map((p) => (
            <ProfileRow key={p.id} p={p}>
              <button
                onClick={() => sendRequest(p.id)}
                disabled={busyId === p.id}
                style={{
                  background: "none",
                  border: `1px solid ${colors.orange}`,
                  color: colors.orange,
                  borderRadius: 10,
                  padding: "6px 10px",
                  fontSize: 11.5,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4
                }}
              >
                <UserPlus size={13} /> Ajouter
              </button>
            </ProfileRow>
          ))}
        </div>
      )}
    </div>
  );
}

function ProfileRow({ p, children }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        background: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: 12,
        padding: "8px 12px",
        marginBottom: 8
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: p.photo_url ? `url(${p.photo_url}) center/cover` : colors.border,
          flexShrink: 0
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {p.name || p.email}
        </div>
        {p.age && <div style={{ fontSize: 11, color: colors.muted }}>{p.age} ans</div>}
      </div>
      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>{children}</div>
    </div>
  );
}
