import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Download, Share, PlusSquare, CheckCircle2, CalendarHeart } from "lucide-react";
import { colors, fonts } from "../lib/theme";
import { isIos, isStandalone } from "../lib/push";
import { canPromptInstall, promptInstall, onInstallAvailabilityChange } from "../lib/installPrompt";

// Page « Installer l'app » (/app) : destination du QR code des affichettes.
// Android/Chrome : bouton d'installation natif. iPhone : la marche à suivre dans Safari.
// ?event=<id> ajoute un lien direct vers l'événement de l'affiche.
export default function InstallApp() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const eventId = params.get("event");
  const [canInstall, setCanInstall] = useState(canPromptInstall());
  const [installing, setInstalling] = useState(false);
  const [done, setDone] = useState(false);
  const ios = isIos();
  const installed = isStandalone();

  useEffect(() => onInstallAvailabilityChange(() => setCanInstall(canPromptInstall())), []);

  async function handleInstall() {
    setInstalling(true);
    const outcome = await promptInstall();
    setInstalling(false);
    if (outcome === "accepted") setDone(true);
  }

  const card = {
    background: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: 18,
    padding: 18,
    boxShadow: "0 6px 18px rgba(232,95,38,0.10)",
    marginBottom: 14
  };
  const primary = {
    width: "100%",
    background: colors.orange,
    color: "#fff",
    border: "none",
    borderRadius: 14,
    padding: 14,
    fontWeight: 700,
    fontSize: 15,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8
  };

  return (
    <div style={{ padding: "28px 20px 40px", maxWidth: 480, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <img src="/logo.jpg" alt="Spritz Connection" style={{ width: 112, height: 112, borderRadius: 28, boxShadow: "0 8px 22px rgba(240,90,25,0.28)" }} />
        <h1 style={{ fontFamily: fonts.display, fontSize: 26, color: colors.navy, margin: "16px 0 6px" }}>Spritz Connection</h1>
        <p style={{ fontSize: 14.5, color: colors.muted, lineHeight: 1.5, margin: 0 }}>
          Les soirées à l'italienne à Paris : apéros, dîners, concerts, karaoké… Réserve ta place en deux clics et retrouve la communauté.
        </p>
      </div>

      <div style={card}>
        {installed || done ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 700, color: colors.olive }}>
            <CheckCircle2 size={20} /> L'app est installée sur ce téléphone.
          </div>
        ) : ios ? (
          <>
            <p style={{ fontWeight: 700, fontSize: 15, margin: "0 0 10px", color: colors.ink }}>Installer l'app sur iPhone</p>
            <ol style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.7, color: colors.ink }}>
              <li>Ouvre cette page dans <strong>Safari</strong>.</li>
              <li>
                Touche <Share size={14} style={{ verticalAlign: -2 }} /> <strong>Partager</strong> en bas de l'écran.
              </li>
              <li>
                Choisis <PlusSquare size={14} style={{ verticalAlign: -2 }} /> <strong>Sur l'écran d'accueil</strong>, puis <strong>Ajouter</strong>.
              </li>
            </ol>
          </>
        ) : canInstall ? (
          <button onClick={handleInstall} disabled={installing} style={primary}>
            <Download size={17} /> {installing ? "Installation…" : "Installer l'app"}
          </button>
        ) : (
          <>
            <p style={{ fontWeight: 700, fontSize: 15, margin: "0 0 10px", color: colors.ink }}>Installer l'app</p>
            <ol style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.7, color: colors.ink }}>
              <li>Ouvre cette page dans <strong>Chrome</strong>.</li>
              <li>Touche le menu <strong>⋮</strong> en haut à droite.</li>
              <li>Choisis <strong>« Installer l'application »</strong> ou <strong>« Ajouter à l'écran d'accueil »</strong>.</li>
            </ol>
          </>
        )}
      </div>

      {eventId && (
        <button onClick={() => navigate(`/event/${eventId}`)} style={{ ...primary, background: colors.navy, marginBottom: 10 }}>
          <CalendarHeart size={17} /> Voir l'événement et réserver
        </button>
      )}
      <button
        onClick={() => navigate("/")}
        style={{ ...primary, background: "none", color: colors.navy, border: `1.5px solid ${colors.border}` }}
      >
        Découvrir tous les événements
      </button>
    </div>
  );
}
