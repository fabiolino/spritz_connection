import React, { useState } from "react";
import { X } from "lucide-react";
import { colors, fonts } from "../lib/theme";
import { shareContent } from "../lib/share";

const TESTERS_URL = "https://spritzconnection.fr/testeurs/";
const LEGACY_KEY = "sc_tester_banner_closed"; // ancienne règle : fermé = plus jamais
const CLOSED_AT_KEY = "sc_tester_banner_closed_at"; // fermé avec ✕ : revient après 7 jours
const DONE_KEY = "sc_tester_banner_done"; // a cliqué « Je deviens testeur » / a partagé : plus jamais
const REMIND_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

function isAndroid() {
  return typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent || "");
}

function shouldShow() {
  try {
    if (typeof navigator === "undefined") return false;
    if (isAndroid()) {
      // Déjà dans l'app installée depuis Google Play : pas besoin de recruter
      if (document.referrer.startsWith("android-app://com.spritzconnection.app")) {
        sessionStorage.setItem("sc_from_play", "1");
        return false;
      }
      if (sessionStorage.getItem("sc_from_play")) return false;
    }
    if (localStorage.getItem(DONE_KEY) === "1") return false;

    // Ancienne règle : on ne savait pas si la personne avait fermé ou cliqué.
    // On la traite comme « fermé aujourd'hui » → le message revient dans 7 jours.
    if (localStorage.getItem(LEGACY_KEY) === "1") {
      localStorage.removeItem(LEGACY_KEY);
      localStorage.setItem(CLOSED_AT_KEY, String(Date.now()));
      return false;
    }

    const closedAt = Number(localStorage.getItem(CLOSED_AT_KEY) || 0);
    return !closedAt || Date.now() - closedAt > REMIND_AFTER_MS;
  } catch {
    return isAndroid();
  }
}

function remember(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {}
}

// Android : invite à devenir testeur. iPhone / ordinateur : invite à partager le lien à un ami sous Android.
export default function AndroidTesterBanner() {
  const [show, setShow] = useState(shouldShow);
  const [copied, setCopied] = useState(false);
  const android = isAndroid();
  if (!show) return null;

  const close = () => {
    remember(CLOSED_AT_KEY, String(Date.now()));
    setShow(false);
  };
  const done = () => {
    remember(DONE_KEY, "1");
    setShow(false);
  };

  const shareToFriend = async () => {
    const result = await shareContent({
      title: "Spritz Connection sur Google Play",
      text: "Tu as un Android ? Aide Spritz Connection à arriver sur Google Play : 3 clics, 2 minutes. Grazie !",
      url: TESTERS_URL
    });
    if (result === "shared") done();
    else if (result === "copied") {
      setCopied(true);
      setTimeout(done, 2500);
    }
  };

  const btn = {
    display: "inline-block",
    background: colors.orange,
    color: "#fff",
    border: "none",
    borderRadius: 999,
    padding: "8px 16px",
    fontWeight: 700,
    fontSize: 13.5,
    textDecoration: "none",
    cursor: "pointer"
  };

  return (
    <div
      style={{
        position: "relative",
        background: colors.navy,
        color: "#fff",
        borderRadius: 16,
        padding: "14px 40px 14px 16px",
        margin: "14px 0 20px",
        boxShadow: "0 6px 16px rgba(6,43,73,0.18)"
      }}
    >
      <button onClick={close} aria-label="Fermer" style={{ position: "absolute", top: 8, right: 8, background: "none", border: "none", color: "#fff", opacity: 0.7, cursor: "pointer" }}>
        <X size={18} />
      </button>
      {android ? (
        <>
          <div style={{ fontFamily: fonts.display, fontSize: 16.5, fontWeight: 700 }}>📲 Aide-nous à arriver sur Google Play</div>
          <div style={{ fontSize: 13, lineHeight: 1.45, opacity: 0.92, margin: "4px 0 10px" }}>
            Il nous manque quelques testeurs Android. 3 clics, 2 minutes, et tu nous rends un énorme service. Grazie !
          </div>
          <a href={TESTERS_URL} target="_blank" rel="noreferrer" onClick={done} style={btn}>
            Je deviens testeur
          </a>
        </>
      ) : (
        <>
          <div style={{ fontFamily: fonts.display, fontSize: 16.5, fontWeight: 700 }}>📲 Tu as un ami sous Android ?</div>
          <div style={{ fontSize: 13, lineHeight: 1.45, opacity: 0.92, margin: "4px 0 10px" }}>
            Il nous manque quelques testeurs Android pour arriver sur Google Play. Envoie-lui ce lien : 3 clics, 2 minutes. Grazie !
          </div>
          <button onClick={shareToFriend} style={btn}>
            {copied ? "Lien copié ✓" : "Envoyer le lien"}
          </button>
        </>
      )}
    </div>
  );
}
