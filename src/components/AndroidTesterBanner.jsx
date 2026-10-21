import React, { useState } from "react";
import { X } from "lucide-react";
import { colors, fonts } from "../lib/theme";

const KEY = "sc_tester_banner_closed";
const TESTERS_URL = "https://spritzconnection.fr/testeurs/";

function shouldShow() {
  try {
    if (typeof navigator === "undefined" || !/Android/i.test(navigator.userAgent)) return false;
    // Déjà dans l'app installée depuis Google Play : pas besoin de recruter
    if (document.referrer.startsWith("android-app://com.spritzconnection.app")) {
      sessionStorage.setItem("sc_from_play", "1");
      return false;
    }
    if (sessionStorage.getItem("sc_from_play")) return false;
    return localStorage.getItem(KEY) !== "1";
  } catch {
    return /Android/i.test(navigator.userAgent || "");
  }
}

// Sur Android uniquement : invite à devenir testeur pour la publication sur Google Play
export default function AndroidTesterBanner() {
  const [show, setShow] = useState(shouldShow);
  if (!show) return null;
  const close = () => {
    try {
      localStorage.setItem(KEY, "1");
    } catch {}
    setShow(false);
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
      <div style={{ fontFamily: fonts.display, fontSize: 16.5, fontWeight: 700 }}>📲 Aide-nous à arriver sur Google Play</div>
      <div style={{ fontSize: 13, lineHeight: 1.45, opacity: 0.92, margin: "4px 0 10px" }}>
        Il nous manque quelques testeurs Android. 3 clics, 2 minutes, et tu nous rends un énorme service. Grazie !
      </div>
      <a
        href={TESTERS_URL}
        target="_blank"
        rel="noreferrer"
        onClick={close}
        style={{ display: "inline-block", background: colors.orange, color: "#fff", borderRadius: 999, padding: "8px 16px", fontWeight: 700, fontSize: 13.5, textDecoration: "none" }}
      >
        Je deviens testeur
      </a>
    </div>
  );
}
