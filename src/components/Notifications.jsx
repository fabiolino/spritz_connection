import React, { useEffect, useState } from "react";
import { Bell, BellOff, X, Share, PlusSquare } from "lucide-react";
import { colors, fonts } from "../lib/theme";
import { useAuth } from "../lib/AuthContext";
import {
  PREF_LABELS,
  pushSupport,
  isSubscribed,
  enablePush,
  disablePush,
  loadPrefs,
  savePrefs,
  promptDismissed,
  dismissPrompt
} from "../lib/push";

const card = {
  background: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: 16,
  padding: 14,
  boxShadow: "0 3px 10px rgba(43,36,25,0.05)"
};

function IosInstallHint() {
  return (
    <p style={{ fontSize: 12.5, color: colors.muted, lineHeight: 1.5, margin: 0 }}>
      Sur iPhone, les notifications ne fonctionnent qu'avec l'app installée : dans Safari, touche{" "}
      <Share size={13} style={{ verticalAlign: "-2px" }} /> <strong>Partager</strong> puis{" "}
      <PlusSquare size={13} style={{ verticalAlign: "-2px" }} /> <strong>Sur l'écran d'accueil</strong>, et ouvre
      Spritz Connection depuis l'icône.
    </p>
  );
}

function errorText(err) {
  if (err?.message === "denied") {
    return "Les notifications sont bloquées pour ce site. Autorise-les dans les réglages du navigateur, puis réessaie.";
  }
  return "Impossible d'activer les notifications pour le moment.";
}

// Proposée juste après une inscription : "Veux-tu être prévenu·e s'il y a du changement ?"
export function NotifyPrompt({ style }) {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const support = pushSupport();

  useEffect(() => {
    let alive = true;
    if (!user || promptDismissed() || support === "unsupported") return;
    if (support === "ok" && Notification.permission === "denied") return;
    isSubscribed().then((sub) => alive && setVisible(!sub));
    return () => {
      alive = false;
    };
  }, [user, support]);

  if (!visible) return null;

  async function handleEnable() {
    setBusy(true);
    setError("");
    try {
      await enablePush(user.id);
      setDone(true);
      setTimeout(() => setVisible(false), 2500);
    } catch (err) {
      setError(errorText(err));
    }
    setBusy(false);
  }

  function handleClose() {
    dismissPrompt();
    setVisible(false);
  }

  return (
    <div style={{ ...card, position: "relative", ...style }}>
      <button
        onClick={handleClose}
        aria-label="Fermer"
        style={{ position: "absolute", top: 10, right: 10, background: "none", border: "none", color: colors.muted, cursor: "pointer" }}
      >
        <X size={16} />
      </button>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: fonts.display, fontWeight: 700, fontSize: 15, marginBottom: 6, paddingRight: 24 }}>
        <Bell size={16} color={colors.orange} /> {done ? "C'est activé !" : "Être prévenu·e s'il y a du changement ?"}
      </div>
      {done ? (
        <p style={{ fontSize: 12.5, color: colors.muted, margin: 0 }}>Tu peux choisir quoi recevoir dans « Mon compte ».</p>
      ) : support === "ios-install" ? (
        <IosInstallHint />
      ) : (
        <>
          <p style={{ fontSize: 12.5, color: colors.muted, margin: "0 0 10px", lineHeight: 1.5 }}>
            Infos de dernière minute de l'organisateur, rappel la veille, nouvelles soirées. Pas de spam, promis.
          </p>
          <button
            onClick={handleEnable}
            disabled={busy}
            style={{
              background: colors.orange,
              color: "#fff",
              border: "none",
              borderRadius: 12,
              padding: "10px 16px",
              fontWeight: 700,
              fontSize: 13.5,
              cursor: "pointer"
            }}
          >
            {busy ? "Activation…" : "Activer les notifications"}
          </button>
          {error && <p style={{ color: colors.red, fontSize: 12, margin: "8px 0 0" }}>{error}</p>}
        </>
      )}
    </div>
  );
}

// Réglages complets, dans "Mon compte"
export function NotificationSettings() {
  const { user } = useAuth();
  const [subscribed, setSubscribed] = useState(false);
  const [prefs, setPrefs] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const support = pushSupport();

  useEffect(() => {
    if (!user) return;
    loadPrefs(user.id).then(setPrefs);
    isSubscribed().then(setSubscribed);
  }, [user]);

  if (!user) return null;

  async function toggleDevice() {
    setBusy(true);
    setError("");
    try {
      if (subscribed) {
        await disablePush();
        setSubscribed(false);
      } else {
        await enablePush(user.id);
        setSubscribed(true);
      }
    } catch (err) {
      setError(errorText(err));
    }
    setBusy(false);
  }

  async function togglePref(key) {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    try {
      await savePrefs(user.id, next);
    } catch {
      setPrefs(prefs);
      setError("Le réglage n'a pas pu être enregistré.");
    }
  }

  return (
    <div style={{ ...card, marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: fonts.display, fontWeight: 700, fontSize: 15 }}>
          {subscribed ? <Bell size={16} color={colors.orange} /> : <BellOff size={16} color={colors.muted} />} Notifications
        </div>
        {support === "ok" && (
          <button
            onClick={toggleDevice}
            disabled={busy}
            style={{
              background: subscribed ? "none" : colors.orange,
              color: subscribed ? colors.muted : "#fff",
              border: subscribed ? `1px solid ${colors.border}` : "none",
              borderRadius: 10,
              padding: "7px 12px",
              fontWeight: 700,
              fontSize: 12.5,
              cursor: "pointer"
            }}
          >
            {busy ? "…" : subscribed ? "Désactiver sur cet appareil" : "Activer sur cet appareil"}
          </button>
        )}
      </div>

      {support === "ios-install" && <IosInstallHint />}
      {support === "unsupported" && (
        <p style={{ fontSize: 12.5, color: colors.muted, margin: 0 }}>
          Ce navigateur ne gère pas les notifications. Ouvre l'app dans Chrome (Android) ou installe-la sur ton écran d'accueil (iPhone).
        </p>
      )}

      {prefs && support === "ok" && (
        <div style={{ opacity: subscribed ? 1 : 0.5 }}>
          {PREF_LABELS.map((p) => (
            <label
              key={p.key}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "9px 0", borderTop: `1px solid ${colors.border}`, cursor: "pointer" }}
            >
              <span>
                <span style={{ display: "block", fontSize: 13.5, fontWeight: 600 }}>{p.label}</span>
                <span style={{ display: "block", fontSize: 11.5, color: colors.muted }}>{p.hint}</span>
              </span>
              <input
                type="checkbox"
                checked={!!prefs[p.key]}
                onChange={() => togglePref(p.key)}
                style={{ width: 20, height: 20, accentColor: colors.orange, flexShrink: 0 }}
              />
            </label>
          ))}
        </div>
      )}
      {error && <p style={{ color: colors.red, fontSize: 12, margin: "8px 0 0" }}>{error}</p>}
    </div>
  );
}
