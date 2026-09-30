import React, { useEffect, useState } from "react";
import { X, Download, Share, PlusSquare } from "lucide-react";
import { colors, fonts } from "../lib/theme";
import { isIos, isStandalone } from "../lib/push";
import { canPromptInstall, promptInstall, onInstallAvailabilityChange } from "../lib/installPrompt";

const DISMISS_KEY = "spritz_install_dismissed";

function dismissed() {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

// Proposée après un billet confirmé : "installe l'app pour la retrouver facilement".
// Sur Android/Chrome, déclenche le vrai bouton d'installation natif (capturé dans
// lib/installPrompt.js) ; sur iPhone (pas de bouton natif possible), donne la marche à suivre.
export function InstallAppPrompt({ style }) {
  const [closed, setClosed] = useState(dismissed);
  const [canInstall, setCanInstall] = useState(canPromptInstall());
  const [installing, setInstalling] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => onInstallAvailabilityChange(() => setCanInstall(canPromptInstall())), []);

  if (closed || done || isStandalone()) return null;
  const ios = isIos();
  if (!ios && !canInstall) return null; // rien de proposable ici (desktop, critères pas remplis…)

  function handleDismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* rien */
    }
    setClosed(true);
  }

  async function handleInstall() {
    setInstalling(true);
    const outcome = await promptInstall();
    setInstalling(false);
    if (outcome === "accepted") setDone(true);
  }

  return (
    <div
      style={{
        background: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: 16,
        padding: 14,
        position: "relative",
        boxShadow: "0 3px 10px rgba(6,43,73,0.05)",
        ...style
      }}
    >
      <button
        onClick={handleDismiss}
        aria-label="Fermer"
        style={{ position: "absolute", top: 10, right: 10, background: "none", border: "none", color: colors.muted, cursor: "pointer" }}
      >
        <X size={16} />
      </button>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontFamily: fonts.display,
          fontWeight: 700,
          fontSize: 15,
          marginBottom: 6,
          paddingRight: 24
        }}
      >
        <Download size={16} color={colors.orange} /> Installe l'app sur ton téléphone
      </div>

      {ios ? (
        <p style={{ fontSize: 12.5, color: colors.muted, lineHeight: 1.5, margin: 0 }}>
          Dans Safari, touche <Share size={13} style={{ verticalAlign: "-2px" }} /> <strong>Partager</strong> puis{" "}
          <PlusSquare size={13} style={{ verticalAlign: "-2px" }} /> <strong>Sur l'écran d'accueil</strong> — tu retrouveras tes
          billets et les rappels en un tap, sans repasser par le navigateur.
        </p>
      ) : (
        <>
          <p style={{ fontSize: 12.5, color: colors.muted, margin: "0 0 10px", lineHeight: 1.5 }}>
            Retrouve tes billets, les rappels et les nouvelles soirées directement depuis ton écran d'accueil.
          </p>
          <button
            onClick={handleInstall}
            disabled={installing}
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
            {installing ? "Installation…" : "Installer l'app"}
          </button>
        </>
      )}
    </div>
  );
}
