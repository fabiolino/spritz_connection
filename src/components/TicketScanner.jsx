import React, { useEffect, useRef, useState, useCallback } from "react";
import jsQR from "jsqr";
import { X, CheckCircle2, AlertTriangle, XCircle, Keyboard, Camera } from "lucide-react";
import { colors, fonts } from "../lib/theme";

function euro(n) {
  const v = Number(n) || 0;
  return v.toLocaleString("fr-FR", { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 }) + " €";
}

function hour(iso) {
  return iso ? new Date(iso).toLocaleTimeString("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" }) : "";
}

export async function checkin(body) {
  const res = await fetch("/api/event-attendees", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "venue-checkin", ...body })
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok && !json.result) return { result: "error", message: json.error || "Erreur de connexion" };
  return json;
}

const LOOK = {
  ok: { bg: colors.olive, icon: CheckCircle2, title: "Billet valide — bienvenue !" },
  already: { bg: "#C98A00", icon: AlertTriangle, title: "Billet déjà utilisé" },
  undone: { bg: colors.navy, icon: CheckCircle2, title: "Validation annulée" },
  unknown: { bg: colors.red, icon: XCircle, title: "Billet inconnu" },
  "other-venue": { bg: colors.red, icon: XCircle, title: "Pas pour votre établissement" },
  invalid: { bg: colors.red, icon: XCircle, title: "Billet non valable" },
  error: { bg: colors.red, icon: XCircle, title: "Problème de connexion" }
};

// Résultat d'un contrôle : grand écran coloré, lisible d'un coup d'œil à l'accueil
export function CheckinResult({ r, onNext, nextLabel = "Scanner le billet suivant" }) {
  const look = LOOK[r.result] || LOOK.error;
  const Icon = look.icon;
  const p = r.person;
  return (
    <div style={{ background: look.bg, color: "#fff", borderRadius: 20, padding: "22px 18px", textAlign: "center" }}>
      <Icon size={54} />
      <div style={{ fontFamily: fonts.display, fontSize: 24, fontWeight: 700, margin: "8px 0 4px" }}>{look.title}</div>
      {r.result === "already" && <div style={{ fontSize: 15, fontWeight: 700 }}>Déjà scanné à {hour(r.checkedInAt)}</div>}
      {r.message && !p && <div style={{ fontSize: 14, opacity: 0.95 }}>{r.message}</div>}
      {p && (
        <div style={{ background: "rgba(255,255,255,0.16)", borderRadius: 14, padding: "12px 12px", marginTop: 12, textAlign: "left" }}>
          <div style={{ fontSize: 20, fontWeight: 800 }}>{p.name}</div>
          {p.quantity > 1 && (
            <div style={{ fontSize: 16, fontWeight: 800, marginTop: 2 }}>
              👥 {p.quantity} personnes{p.with?.length ? ` — avec ${p.with.join(", ")}` : ""}
            </div>
          )}
          <div style={{ fontSize: 15, marginTop: 6, fontWeight: 700 }}>
            {p.due > 0 ? `💶 À encaisser sur place : ${euro(p.due)}` : `✅ ${p.status}`}
          </div>
          {r.event && <div style={{ fontSize: 12.5, opacity: 0.9, marginTop: 6 }}>{r.event.title} · code {p.code}</div>}
        </div>
      )}
      {r.result !== "ok" && r.result !== "already" && r.result !== "undone" && r.event && !p && (
        <div style={{ fontSize: 13, marginTop: 8, opacity: 0.9 }}>Soirée : {r.event.title}</div>
      )}
      {onNext && (
        <button
          onClick={onNext}
          style={{ marginTop: 16, width: "100%", background: "#fff", color: look.bg, border: "none", borderRadius: 14, padding: 14, fontWeight: 800, fontSize: 16, cursor: "pointer" }}
        >
          {nextLabel}
        </button>
      )}
    </div>
  );
}

// Scanner plein écran : caméra arrière + lecture du QR code des billets
export default function TicketScanner({ token, onClose, onChecked }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const busyRef = useRef(false);
  const lastRef = useRef({ text: "", at: 0 });
  const [camError, setCamError] = useState("");
  const [result, setResult] = useState(null);
  const [manual, setManual] = useState(false);
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);

  const handle = useCallback(
    async (body) => {
      busyRef.current = true;
      setSending(true);
      const r = await checkin({ token, ...body });
      setSending(false);
      setResult(r);
      try {
        navigator.vibrate?.(r.result === "ok" ? 120 : [80, 60, 80, 60, 80]);
      } catch {}
      onChecked?.();
    },
    [token, onChecked]
  );

  // Caméra
  useEffect(() => {
    let raf = null;
    let stopped = false;
    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
        if (stopped) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const v = videoRef.current;
        v.srcObject = stream;
        v.setAttribute("playsinline", "true");
        await v.play();
        tick();
      } catch (err) {
        setCamError(
          "Impossible d'ouvrir la caméra. Autorisez l'accès à la caméra pour ce site (réglages du navigateur), ou saisissez le code du billet à la main."
        );
        setManual(true);
      }
    }
    let last = 0;
    function tick(ts = 0) {
      if (stopped) return;
      raf = requestAnimationFrame(tick);
      if (busyRef.current || ts - last < 180) return;
      last = ts;
      const v = videoRef.current;
      const c = canvasRef.current;
      if (!v || !c || v.readyState < 2 || !v.videoWidth) return;
      const scale = Math.min(1, 640 / Math.max(v.videoWidth, v.videoHeight));
      c.width = Math.round(v.videoWidth * scale);
      c.height = Math.round(v.videoHeight * scale);
      const ctx = c.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(v, 0, 0, c.width, c.height);
      const img = ctx.getImageData(0, 0, c.width, c.height);
      const found = jsQR(img.data, img.width, img.height, { inversionAttempts: "dontInvert" });
      if (found?.data) {
        const now = Date.now();
        if (found.data === lastRef.current.text && now - lastRef.current.at < 3000) return; // même billet encore devant la caméra
        lastRef.current = { text: found.data, at: now };
        handle({ scanned: found.data });
      }
    }
    start();
    return () => {
      stopped = true;
      if (raf) cancelAnimationFrame(raf);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [handle]);

  function next() {
    setResult(null);
    setCode("");
    lastRef.current = { text: lastRef.current.text, at: Date.now() };
    busyRef.current = false;
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "#0B1620", zIndex: 1000, overflowY: "auto", color: "#fff" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px" }}>
        <div style={{ fontFamily: fonts.display, fontSize: 20, fontWeight: 700 }}>Contrôle des billets</div>
        <button onClick={onClose} aria-label="Fermer" style={{ background: "rgba(255,255,255,0.12)", border: "none", color: "#fff", borderRadius: 20, padding: 8, cursor: "pointer" }}>
          <X size={20} />
        </button>
      </div>

      <div style={{ padding: "0 16px 30px", maxWidth: 520, margin: "0 auto" }}>
        <div style={{ position: "relative", borderRadius: 20, overflow: "hidden", background: "#000", aspectRatio: "1 / 1", display: result || camError ? "none" : "block" }}>
          <video ref={videoRef} muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          <div style={{ position: "absolute", inset: "14%", border: `4px solid ${colors.gold}`, borderRadius: 18, boxShadow: "0 0 0 9999px rgba(0,0,0,0.35)" }} />
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 10, textAlign: "center", fontSize: 13.5, fontWeight: 700 }}>
            {sending ? "Vérification…" : "Placez le QR code du billet dans le cadre"}
          </div>
        </div>
        <canvas ref={canvasRef} style={{ display: "none" }} />

        {camError && !result && (
          <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: 14, padding: 14, fontSize: 13.5, lineHeight: 1.5, marginBottom: 12 }}>
            <Camera size={15} style={{ verticalAlign: "-2px", marginRight: 6 }} />
            {camError}
          </div>
        )}

        {result && <CheckinResult r={result} onNext={next} />}

        {!result && (
          <>
            {!manual ? (
              <button
                onClick={() => setManual(true)}
                style={{ marginTop: 14, width: "100%", background: "rgba(255,255,255,0.12)", color: "#fff", border: "none", borderRadius: 14, padding: 12, fontWeight: 700, fontSize: 14, cursor: "pointer" }}
              >
                <Keyboard size={15} style={{ verticalAlign: "-3px", marginRight: 6 }} /> Saisir le code du billet à la main
              </button>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (code.trim()) handle({ code: code.trim() });
                }}
                style={{ marginTop: 14, display: "flex", gap: 8 }}
              >
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="Code (ex. K7P2QX)"
                  autoCapitalize="characters"
                  autoCorrect="off"
                  style={{ flex: 1, fontSize: 18, letterSpacing: 3, fontFamily: "ui-monospace, Menlo, monospace", padding: "12px 14px", borderRadius: 14, border: "none" }}
                />
                <button type="submit" disabled={sending} style={{ background: colors.orange, color: "#fff", border: "none", borderRadius: 14, padding: "0 18px", fontWeight: 800, fontSize: 15, cursor: "pointer" }}>
                  OK
                </button>
              </form>
            )}
            <p style={{ fontSize: 12.5, opacity: 0.75, lineHeight: 1.5, marginTop: 14 }}>
              Un billet ne peut être validé qu'une fois : un deuxième passage affiche « déjà utilisé » avec l'heure du premier. Pour un billet de groupe, un seul scan fait entrer tout le groupe.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
