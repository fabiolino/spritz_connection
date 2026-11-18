import React, { useRef, useState } from "react";
import { Camera } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { authHeaders } from "../lib/sumupClient";
import { colors } from "../lib/theme";

// Dépôt de photos et vidéos par les participants (page /photos/<soirée>).
// Chaque fichier part directement du téléphone vers Supabase Storage grâce à un lien
// d'envoi signé fourni par /api/event-attendees (action "media-upload-url"), puis il est
// ajouté à la galerie (action "media-register").

const BUCKET = "event-photos";
const MAX_BYTES = 50 * 1024 * 1024;
const MAX_VIDEO_SECONDS = 35; // « environ 30 secondes »
const IDENTITY_KEY = "sc_photos_identity";

export function rememberIdentity(email, name) {
  try {
    localStorage.setItem(IDENTITY_KEY, JSON.stringify({ email, name }));
  } catch {
    /* stockage indisponible : on redemandera l'email */
  }
}
function readIdentity() {
  try {
    return JSON.parse(localStorage.getItem(IDENTITY_KEY) || "null");
  } catch {
    return null;
  }
}

async function api(body) {
  const res = await fetch("/api/event-attendees", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Erreur, réessaie dans un instant.");
  return data;
}

// Photo : réduite à 2000 px en JPEG (plus léger, s'affiche partout). Sinon, fichier d'origine.
async function preparePhoto(file) {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    if (blob) return { blob, type: "image/jpeg" };
  } catch {
    /* format non lisible par le navigateur (ex. HEIC hors Safari) : on envoie tel quel */
  }
  return { blob: file, type: file.type || "image/jpeg" };
}

function videoDuration(file) {
  return new Promise((resolve) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => {
      URL.revokeObjectURL(v.src);
      resolve(v.duration || 0);
    };
    v.onerror = () => resolve(0);
    v.src = URL.createObjectURL(file);
  });
}

export default function MediaUploader({ eventId, isLoggedIn, onAdded }) {
  const inputRef = useRef(null);
  const saved = readIdentity();
  const [email, setEmail] = useState(saved?.email || "");
  const [consent, setConsent] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(0);
  const needEmail = !isLoggedIn && !saved?.email;

  function pick() {
    setError("");
    if (!consent) {
      setError("Coche d'abord la case ci-dessous.");
      return;
    }
    if (!isLoggedIn && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Indique l'email que tu as laissé sur cette page.");
      return;
    }
    inputRef.current?.click();
  }

  async function upload(files) {
    const list = Array.from(files || []);
    if (!list.length) return;
    setError("");
    let ok = 0;
    const problems = [];
    for (let i = 0; i < list.length; i++) {
      const file = list[i];
      setProgress(`Envoi ${i + 1}/${list.length}…`);
      try {
        const isVideo = (file.type || "").startsWith("video/");
        let blob = file;
        let type = file.type;
        if (isVideo) {
          if (file.size > MAX_BYTES) throw new Error("vidéo trop lourde (50 Mo max, environ 30 secondes)");
          const d = await videoDuration(file);
          if (d > MAX_VIDEO_SECONDS) throw new Error(`vidéo trop longue (${Math.round(d)} s) : 30 secondes environ au maximum`);
          if (type === "video/x-m4v") type = "video/mp4";
        } else {
          ({ blob, type } = await preparePhoto(file));
          if (blob.size > MAX_BYTES) throw new Error("photo trop lourde");
        }
        const who = isLoggedIn ? {} : { email: email.trim() };
        const { path, token } = await api({ action: "media-upload-url", eventId, consent: true, contentType: type, size: blob.size, ...who });
        const { error: upErr } = await supabase.storage.from(BUCKET).uploadToSignedUrl(path, token, blob, { contentType: type });
        if (upErr) throw new Error("envoi interrompu, réessaie");
        const { photo } = await api({ action: "media-register", eventId, path, ...who });
        onAdded?.(photo);
        ok++;
      } catch (e) {
        problems.push(`${file.name || "fichier"} : ${e.message}`);
      }
    }
    if (!isLoggedIn) rememberIdentity(email.trim(), saved?.name || "");
    setProgress("");
    setDone((n) => n + ok);
    if (problems.length) setError(problems.join("\n"));
    if (inputRef.current) inputRef.current.value = "";
  }

  const busy = !!progress;
  return (
    <div style={{ background: colors.surface, border: `2px solid ${colors.orange}`, borderRadius: 18, padding: 18, marginBottom: 16 }}>
      <div style={{ fontWeight: 800, color: colors.navy, marginBottom: 4, fontSize: 16 }}>📸 Dépose tes photos et vidéos</div>
      <p style={{ fontSize: 13.5, lineHeight: 1.5, margin: "0 0 12px" }}>
        Partage tes souvenirs avec tout le groupe : photos, et vidéos d'environ 30 secondes maximum.
      </p>
      {needEmail && (
        <input
          type="email"
          inputMode="email"
          placeholder="Ton email (celui laissé sur cette page)"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ width: "100%", boxSizing: "border-box", border: `1px solid ${colors.border}`, borderRadius: 12, padding: 12, fontSize: 16, marginBottom: 10, background: colors.bg }}
        />
      )}
      <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, lineHeight: 1.45, cursor: "pointer", marginBottom: 12 }}>
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ marginTop: 3, width: 18, height: 18, flexShrink: 0 }} />
        <span>Les personnes visibles sur mes photos et vidéos sont d'accord pour qu'elles soient partagées.</span>
      </label>
      <button
        type="button"
        onClick={pick}
        disabled={busy}
        style={{
          width: "100%",
          border: "none",
          borderRadius: 14,
          padding: 14,
          fontWeight: 800,
          fontSize: 15,
          background: colors.orange,
          color: "#fff",
          cursor: busy ? "wait" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8
        }}
      >
        <Camera size={18} /> {busy ? progress : "Choisir mes photos / vidéos"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        onChange={(e) => upload(e.target.files)}
        style={{ display: "none" }}
      />
      {done > 0 && !busy && (
        <p style={{ fontSize: 13, color: colors.olive, fontWeight: 700, margin: "10px 0 0" }}>
          Grazie ! {done} fichier{done > 1 ? "s" : ""} ajouté{done > 1 ? "s" : ""} à la galerie 🎉
        </p>
      )}
      {error && <p style={{ fontSize: 12.5, color: colors.red, margin: "10px 0 0", whiteSpace: "pre-line" }}>{error}</p>}
      <p style={{ fontSize: 11.5, color: colors.muted, margin: "10px 0 0", lineHeight: 1.45 }}>
        Une photo te concerne et tu veux qu'on la retire ? Écris à fabio@spritzconnection.fr, c'est fait dans la journée.
      </p>
    </div>
  );
}
