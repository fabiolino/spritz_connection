import React, { useMemo, useState } from "react";
import { Star, Smartphone, Bell, Copy, Check, Crown, Trash2, Search } from "lucide-react";
import { colors } from "../lib/theme";

const PLATFORM_LABEL = {
  iphone: "iPhone",
  android: "Android",
  "apk-android": "Android (APK)",
  ordinateur: "Ordinateur"
};

function ago(iso) {
  if (!iso) return null;
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return "aujourd'hui";
  if (days === 1) return "hier";
  if (days < 30) return `il y a ${days} j`;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function Badge({ children, tone = "muted" }) {
  const tones = {
    muted: { bg: colors.bg, fg: colors.muted, bd: colors.border },
    green: { bg: "rgba(107,124,79,0.12)", fg: colors.olive, bd: "rgba(107,124,79,0.35)" },
    orange: { bg: "rgba(240,90,25,0.1)", fg: colors.orange, bd: "rgba(240,90,25,0.35)" },
    gold: { bg: "rgba(255,197,43,0.18)", fg: "#9A6B00", bd: colors.gold }
  };
  const t = tones[tone];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        background: t.bg,
        color: t.fg,
        border: `1px solid ${t.bd}`,
        borderRadius: 20,
        padding: "1px 7px",
        fontSize: 10.5,
        fontWeight: 700,
        whiteSpace: "nowrap"
      }}
    >
      {children}
    </span>
  );
}

function voucherBtn(enabled) {
  return {
    background: enabled ? "rgba(255,197,43,0.18)" : "none",
    border: `1px solid ${enabled ? colors.gold : colors.border}`,
    color: enabled ? "#9A6B00" : colors.border,
    borderRadius: 20,
    padding: "3px 9px",
    fontSize: 11,
    fontWeight: 700,
    cursor: enabled ? "pointer" : "default"
  };
}

const FILTERS = [
  { id: "all", label: "Tous" },
  { id: "installed", label: "App installée" },
  { id: "crew", label: "Spritz Crew" },
  { id: "not-installed", label: "Pas installée" }
];

// Admin : tous les comptes, avec qui a installé l'app, leur activité, et le statut ambassadeur Spritz Crew
export default function AdminMembers({ members, setMembers, adminSecret, onToggleMember, togglingId }) {
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("active");
  const [copied, setCopied] = useState(false);
  const [crewToggling, setCrewToggling] = useState(null);
  const [error, setError] = useState("");
  const [voucherBusy, setVoucherBusy] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState(null);
  const [notice, setNotice] = useState("");

  const stats = useMemo(
    () => ({
      total: members.length,
      installed: members.filter((m) => m.app_installed_at).length,
      notifs: members.filter((m) => m.notifications_on).length,
      crew: members.filter((m) => m.is_ambassador).length
    }),
    [members]
  );

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    let l = members.filter((m) => {
      if (q && !`${m.name || ""} ${m.email || ""}`.toLowerCase().includes(q)) return false;
      if (filter === "installed") return !!m.app_installed_at;
      if (filter === "crew") return !!m.is_ambassador;
      if (filter === "not-installed") return !m.app_installed_at;
      return true;
    });
    const score = (m) => (m.events_count || 0) * 2 + (m.referrals_count || 0) * 3 + (m.app_installed_at ? 1 : 0);
    if (sort === "active") l = [...l].sort((a, b) => score(b) - score(a));
    if (sort === "recent") l = [...l].sort((a, b) => (b.last_seen_at || b.created_at || "").localeCompare(a.last_seen_at || a.created_at || ""));
    if (sort === "name") l = [...l].sort((a, b) => (a.name || a.email || "").localeCompare(b.name || b.email || "", "fr"));
    return l;
  }, [members, filter, sort, search]);

  async function deleteMember(m) {
    const who = m.name || m.email;
    if (!window.confirm(`Supprimer définitivement le compte de ${who} ?\n\nSes inscriptions restent valables (son nom et son email y sont conservés), mais son profil, ses amis et ses réglages sont effacés.`)) return;
    const removeFromList = window.confirm(`Retirer aussi ${m.email} de la liste emails Brevo « Spritz Connection » ?\n\nOK = oui, Annuler = non (il continue à recevoir les annonces des soirées).`);
    setDeleting(m.id);
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/manage-guests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminSecret, action: "delete-member", profileId: m.id, removeFromList })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(data.error || "Suppression impossible");
      else {
        setMembers((prev) => prev.filter((x) => x.id !== m.id));
        setNotice(`Compte de ${who} supprimé${data.keptRegistrations ? ` — ${data.keptRegistrations} inscription(s) conservée(s)` : ""}.`);
      }
    } catch {
      setError("Impossible de contacter le serveur");
    }
    setDeleting(null);
  }

  async function toggleCrew(m) {
    setCrewToggling(m.id);
    setError("");
    try {
      const res = await fetch("/api/set-member-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminSecret, profileId: m.id, isAmbassador: !m.is_ambassador })
      });
      if (res.ok) setMembers((prev) => prev.map((x) => (x.id === m.id ? { ...x, is_ambassador: !m.is_ambassador } : x)));
      else setError("Modification impossible");
    } catch {
      setError("Impossible de contacter le serveur");
    }
    setCrewToggling(null);
  }

  async function applyVoucher(m, count) {
    const label = count === 2 ? "une soirée offerte (2 bons)" : "un Spritz offert (1 bon)";
    if (!window.confirm(`Utiliser ${label} pour ${m.name || m.email} ?`)) return;
    setVoucherBusy(m.id + count);
    setError("");
    try {
      const res = await fetch("/api/manage-guests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminSecret, action: "crew-use-voucher", profileId: m.id, count })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(data.error || "Impossible d'utiliser le bon");
      else setMembers((prev) => prev.map((x) => (x.id === m.id ? { ...x, vouchers_available: data.available } : x)));
    } catch {
      setError("Impossible de contacter le serveur");
    }
    setVoucherBusy(null);
  }

  async function syncBrevo() {
    setSyncing(true);
    setSyncMsg("");
    try {
      const res = await fetch("/api/manage-guests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminSecret, action: "brevo-sync" })
      });
      const data = await res.json().catch(() => ({}));
      setSyncMsg(
        res.ok
          ? `✓ ${data.total} email${data.total > 1 ? "s" : ""} envoyé${data.total > 1 ? "s" : ""} vers la liste Brevo « Spritz Connection » (l'import peut prendre une minute).`
          : data.error || "Synchronisation impossible"
      );
    } catch {
      setSyncMsg("Impossible de contacter le serveur");
    }
    setSyncing(false);
  }

  async function copyEmails() {
    const emails = list.map((m) => m.email).filter(Boolean).join(", ");
    try {
      await navigator.clipboard.writeText(emails);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt("Copie ces emails :", emails);
    }
  }

  const chip = (active) => ({
    border: `1.5px solid ${active ? colors.orange : colors.border}`,
    background: active ? "rgba(240,90,25,0.08)" : colors.surface,
    color: colors.ink,
    borderRadius: 20,
    padding: "5px 11px",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "nowrap"
  });

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginBottom: 12 }}>
        {[
          ["Comptes", stats.total],
          ["App installée", stats.installed],
          ["Notifs actives", stats.notifs],
          ["Spritz Crew", stats.crew]
        ].map(([label, n]) => (
          <div key={label} style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 12, padding: "8px 6px", textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{n}</div>
            <div style={{ fontSize: 10.5, color: colors.muted, lineHeight: 1.2 }}>{label}</div>
          </div>
        ))}
      </div>

      <div style={{ position: "relative", marginBottom: 8 }}>
        <Search size={14} color={colors.muted} style={{ position: "absolute", left: 11, top: 11 }} />
        <input
          placeholder="Rechercher un nom ou un email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%",
            boxSizing: "border-box",
            background: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: 10,
            padding: "8px 10px 8px 32px",
            fontSize: 13,
            color: colors.ink,
            outline: "none"
          }}
        />
      </div>
      {notice && <p style={{ fontSize: 12, color: colors.olive, margin: "0 0 8px" }}>{notice}</p>}

      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4, marginBottom: 8 }}>
        {FILTERS.map((f) => (
          <button key={f.id} onClick={() => setFilter(f.id)} style={chip(filter === f.id)}>
            {f.label}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 10 }}>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 10, padding: "6px 8px", fontSize: 12.5, color: colors.ink }}
        >
          <option value="active">Les plus actifs d'abord</option>
          <option value="recent">Vus récemment</option>
          <option value="name">Par nom</option>
        </select>
        <button
          onClick={copyEmails}
          disabled={list.length === 0}
          style={{ ...chip(false), display: "flex", alignItems: "center", gap: 5, color: colors.blue, borderColor: colors.blue }}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? "Copiés !" : `Copier les ${list.length} emails`}
        </button>
      </div>

      {list.length === 0 && <p style={{ fontSize: 12.5, color: colors.muted }}>Personne dans ce filtre pour l'instant.</p>}

      {list.map((m) => (
        <div
          key={m.id}
          style={{
            background: colors.surface,
            border: `1px solid ${m.is_ambassador ? colors.gold : colors.border}`,
            borderRadius: 12,
            padding: "10px 12px",
            marginBottom: 8
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}>
                {m.is_ambassador && <Crown size={13} color={colors.gold} />}
                {m.name || m.email?.split("@")[0]}
              </div>
              <div style={{ fontSize: 11, color: colors.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.email}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5, alignItems: "flex-end", flexShrink: 0 }}>
              <button
                onClick={() => toggleCrew(m)}
                disabled={crewToggling === m.id}
                style={{
                  background: m.is_ambassador ? "rgba(255,197,43,0.18)" : "none",
                  border: `1px solid ${m.is_ambassador ? colors.gold : colors.border}`,
                  color: m.is_ambassador ? "#9A6B00" : colors.muted,
                  borderRadius: 20,
                  padding: "4px 10px",
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  whiteSpace: "nowrap"
                }}
              >
                <Crown size={11} /> {m.is_ambassador ? "Spritz Crew" : "Proposer Crew"}
              </button>
              <button
                onClick={() => onToggleMember(m.id, m.is_member)}
                disabled={togglingId === m.id}
                style={{
                  background: m.is_member ? "rgba(255,197,43,0.15)" : "none",
                  border: `1px solid ${m.is_member ? colors.gold : colors.border}`,
                  color: m.is_member ? "#9A6B00" : colors.muted,
                  borderRadius: 20,
                  padding: "4px 10px",
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  whiteSpace: "nowrap"
                }}
              >
                <Star size={11} /> {m.is_member ? "Membre" : "Non-membre"}
              </button>
              <button
                onClick={() => deleteMember(m)}
                disabled={deleting === m.id}
                aria-label={`Supprimer ${m.name || m.email}`}
                style={{
                  background: "none",
                  border: `1px solid ${colors.red}`,
                  color: colors.red,
                  borderRadius: 20,
                  padding: "4px 10px",
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  whiteSpace: "nowrap"
                }}
              >
                <Trash2 size={11} /> {deleting === m.id ? "…" : "Supprimer"}
              </button>
            </div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 7 }}>
            {m.app_installed_at ? (
              <Badge tone="green">
                <Smartphone size={10} /> App · {PLATFORM_LABEL[m.app_platform] || "installée"}
              </Badge>
            ) : (
              <Badge>Pas installée</Badge>
            )}
            {m.notifications_on && (
              <Badge tone="green">
                <Bell size={10} /> Notifs
              </Badge>
            )}
            <Badge tone={m.events_count > 0 ? "orange" : "muted"}>
              {m.events_count || 0} soirée{(m.events_count || 0) > 1 ? "s" : ""}
            </Badge>
            {m.referrals_count > 0 && (
              <Badge tone="gold">
                {m.referrals_count} filleul{m.referrals_count > 1 ? "s" : ""}
              </Badge>
            )}
            {m.last_seen_at && <Badge>vu·e {ago(m.last_seen_at)}</Badge>}
            {m.people_brought > 0 && (
              <Badge tone="orange">
                👑 {m.people_brought} ramenée{m.people_brought > 1 ? "s" : ""}
              </Badge>
            )}
          </div>
          {m.is_ambassador && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                marginTop: 8,
                paddingTop: 8,
                borderTop: `1px dashed ${colors.border}`,
                fontSize: 12
              }}
            >
              <span>
                <strong>{m.vouchers_available || 0}</strong> bon{(m.vouchers_available || 0) > 1 ? "s" : ""} dispo
                <span style={{ color: colors.muted }}> · {m.people_counted || 0} venue{(m.people_counted || 0) > 1 ? "s" : ""}</span>
              </span>
              <span style={{ display: "flex", gap: 5 }}>
                <button
                  disabled={!m.vouchers_available || voucherBusy === m.id + 1}
                  onClick={() => applyVoucher(m, 1)}
                  style={voucherBtn(m.vouchers_available >= 1)}
                >
                  🍹 Spritz
                </button>
                <button
                  disabled={(m.vouchers_available || 0) < 2 || voucherBusy === m.id + 2}
                  onClick={() => applyVoucher(m, 2)}
                  style={voucherBtn(m.vouchers_available >= 2)}
                >
                  🎟️ Soirée
                </button>
              </span>
            </div>
          )}
        </div>
      ))}
      {error && <p style={{ color: colors.red, fontSize: 12, marginTop: 8 }}>{error}</p>}
      <button
        onClick={syncBrevo}
        disabled={syncing}
        style={{ ...chip(false), width: "100%", marginTop: 10, padding: 10, color: colors.navy, borderColor: colors.navy }}
      >
        {syncing ? "Synchronisation…" : "↻ Ajouter tous les emails à la liste Brevo « Spritz Connection »"}
      </button>
      {syncMsg && <p style={{ fontSize: 12, color: syncMsg.startsWith("✓") ? colors.olive : colors.red, marginTop: 6 }}>{syncMsg}</p>}
      <p style={{ fontSize: 11, color: colors.muted, marginTop: 8, lineHeight: 1.45 }}>
        « App installée » : détecté depuis le 2 octobre, quand un membre connecté ouvre l'app depuis son écran d'accueil (ou l'APK).
        Les membres qui l'avaient installée avant apparaîtront ici dès leur prochaine ouverture.
      </p>
    </div>
  );
}
