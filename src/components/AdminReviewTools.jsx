import React, { useState } from "react";
import QRCode from "qrcode";
import { Star, Copy, Printer, MessageCircle } from "lucide-react";
import { colors } from "../lib/theme";

export const GOOGLE_REVIEW_URL = "https://g.page/r/CQoIqirTJtVGEBM/review";

const btn = {
  flex: 1,
  border: `1px solid ${colors.border}`,
  background: colors.surface,
  color: colors.ink,
  borderRadius: 10,
  padding: "9px 8px",
  fontSize: 12.5,
  fontWeight: 700,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 5
};

export function reviewMessage(title) {
  return [
    `Grazie mille à tous pour ${title ? `« ${title} »` : "la soirée"} ! 🍹`,
    "On espère que vous avez passé un super moment.",
    "Si vous avez 30 secondes, votre avis Google nous aide énormément à faire connaître Spritz Connection :",
    GOOGLE_REVIEW_URL,
    "",
    "A presto ! — Fabio"
  ].join("\n");
}

function esc(s) {
  return String(s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
}

// Admin : demander un avis Google aux participants sans email (Meet5, WhatsApp, téléphone…)
export default function AdminReviewTools({ event }) {
  const [notice, setNotice] = useState("");
  const msg = reviewMessage(event?.title);

  async function copy() {
    try {
      await navigator.clipboard.writeText(msg);
      setNotice("Message copié : colle-le dans le groupe Meet5 ou WhatsApp de la soirée.");
    } catch {
      setNotice("Copie impossible : sélectionne le texte à la main.");
    }
  }

  async function printQr() {
    const w = window.open("", "_blank");
    if (!w) {
      setNotice("Autorise les fenêtres pop-up pour imprimer le QR code.");
      return;
    }
    const qr = await QRCode.toDataURL(GOOGLE_REVIEW_URL, { width: 520, margin: 1, color: { dark: "#062B49", light: "#ffffff" } });
    const card = `
      <div class="card">
        <div class="brand">SPRITZ CONNECTION</div>
        <div class="title">Vous avez passé<br>un bon moment ?</div>
        <img src="${qr}" alt="QR code avis Google">
        <div class="cta">⭐ Laissez-nous un avis Google</div>
        <div class="sub">Scannez avec l'appareil photo de votre téléphone — 30 secondes, grazie mille !</div>
      </div>`;
    w.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>QR avis Google — ${esc(event?.title)}</title>
      <style>
        @page { size: A4; margin: 10mm; }
        body { margin: 0; font-family: Helvetica, Arial, sans-serif; color: #062B49; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8mm; }
        .card { border: 2px dashed #F05A19; border-radius: 6mm; padding: 7mm 6mm; text-align: center; break-inside: avoid; height: 128mm; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; justify-content: center; }
        .brand { font-size: 11px; letter-spacing: 3px; font-weight: 700; color: #F05A19; }
        .title { font-size: 22px; font-weight: 800; margin: 3mm 0 4mm; line-height: 1.15; }
        img { width: 55mm; height: 55mm; }
        .cta { font-size: 17px; font-weight: 800; margin-top: 4mm; }
        .sub { font-size: 11.5px; color: #555; margin-top: 2mm; line-height: 1.4; }
      </style></head><body><div class="grid">${card.repeat(4)}</div>
      <script>window.onload = () => setTimeout(() => window.print(), 300);</script></body></html>`);
    w.document.close();
  }

  return (
    <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 12, marginBottom: 14 }}>
      <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
        <Star size={13} color={colors.orange} /> Avis Google
      </div>
      <p style={{ fontSize: 11.5, color: colors.muted, margin: "0 0 8px", lineHeight: 1.45 }}>
        Les inscrits avec email reçoivent la demande d'avis automatiquement le lendemain. Pour les autres : message à coller dans le groupe, et QR code à poser sur les tables.
      </p>
      <div style={{ display: "flex", gap: 6 }}>
        <button onClick={copy} style={btn}>
          <Copy size={13} /> Copier le message
        </button>
        <a href={`https://wa.me/?text=${encodeURIComponent(msg)}`} target="_blank" rel="noreferrer" style={{ ...btn, textDecoration: "none" }}>
          <MessageCircle size={13} /> WhatsApp
        </a>
        <button onClick={printQr} style={btn}>
          <Printer size={13} /> QR à imprimer
        </button>
      </div>
      {notice && <p style={{ fontSize: 12, color: colors.olive, margin: "8px 0 0" }}>{notice}</p>}
    </div>
  );
}
