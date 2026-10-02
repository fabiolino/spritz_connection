import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Download, Printer, Share2, Link2, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { colors, fonts } from "../lib/theme";
import { useCategories } from "../lib/CategoriesContext";
import { ADVANCE_PRICE_FOR_ALL } from "../lib/pricing";
import { appUrl } from "../lib/invite";
import { POSTER_FORMATS, drawPoster, loadImage, loadPosterFonts, qrImage } from "../lib/poster";

const PROD_URL = "https://spritz-connection.vercel.app";

function euro(n) {
  const v = Number(n) || 0;
  return v.toLocaleString("fr-FR", { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 }) + " €";
}

function priceText(event) {
  if (event.is_free) return "Gratuit — inscription sur l'app Spritz Connection";
  const member = Number(event.price_member) || 0;
  const nonMember = Number(event.price_nonmember) || 0;
  if (ADVANCE_PRICE_FOR_ALL) {
    return nonMember > member
      ? `${euro(member)} en réservant sur l'app · ${euro(nonMember)} sur place`
      : `${euro(member)} — réservation sur l'app Spritz Connection`;
  }
  return nonMember !== member ? `${euro(member)} membres · ${euro(nonMember)} non-membres` : euro(member);
}

function slug(text) {
  return String(text || "evenement").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
}

// Générateur d'affichette (/event/:id/affichette) pour les organisateurs et les lieux :
// infos de l'événement préremplies et modifiables, mention « En collaboration avec Spritz Connection »,
// QR code vers la page d'installation de l'app. Tout se dessine dans le navigateur.
export default function EventPoster() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getCategory } = useCategories();
  const canvasRef = useRef(null);
  const assets = useRef({});
  const [event, setEvent] = useState(null);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [format, setFormat] = useState("a4");
  const [form, setForm] = useState(null);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: ev } = await supabase.from("events").select("*").eq("id", id).maybeSingle();
      if (!active) return;
      if (!ev) return setError("Événement introuvable.");
      if (ev.visibility === "private") return setError("Cet événement est privé : il n'a pas d'affichette publique.");
      let venue = null;
      if (ev.venue_id) {
        const { data } = await supabase.from("venues").select("name, contact_phone, contact_email").eq("id", ev.venue_id).maybeSingle();
        venue = data;
      }
      const cat = getCategory(ev.category);
      const own = await loadImage(ev.cover_photo_url);
      const [cover, logo, qr] = await Promise.all([
        own ? Promise.resolve(own) : loadImage(cat?.default_cover_url),
        loadImage("/logo.jpg"),
        qrImage(`${PROD_URL}/app?event=${ev.id}`),
        loadPosterFonts()
      ]);
      if (!active) return;
      // Les photos par défaut portent déjà le nom de la catégorie : pas d'étiquette en plus.
      assets.current = { cover, logo, qr, category: cat?.label || "", showCategory: !!own };
      setEvent(ev);
      setForm({
        title: ev.title || "",
        tagline: "",
        place: venue?.name || "",
        address: ev.address || "",
        price: priceText(ev),
        organizer: ev.organizer || "",
        contact: [ev.phone || venue?.contact_phone, venue?.contact_email].filter(Boolean).join(" · ")
      });
      setReady(true);
    })().catch(() => active && setError("Impossible de préparer l'affichette."));
    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    if (!ready || !canvasRef.current || !form) return;
    const t = setTimeout(() => {
      drawPoster(canvasRef.current, format, { ...form, date: event.event_date, ...assets.current });
    }, 120);
    return () => clearTimeout(t);
  }, [ready, form, format, event]);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const fileName = () => `affichette-${slug(form?.title)}-${format}.png`;

  function toBlob() {
    return new Promise((resolve) => canvasRef.current.toBlob(resolve, "image/png"));
  }

  async function handleDownload() {
    setBusy(true);
    const blob = await toBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName();
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    setBusy(false);
  }

  async function handleShare() {
    const blob = await toBlob();
    const file = new File([blob], fileName(), { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: form.title });
      } catch {
        /* partage annulé */
      }
    } else {
      handleDownload();
    }
  }

  function handlePrint() {
    const data = canvasRef.current.toDataURL("image/png");
    const w = window.open("", "_blank");
    if (!w) return setNotice("Autorise l'ouverture des fenêtres pour imprimer, ou télécharge l'image.");
    w.document.write(
      `<!doctype html><title>${form.title.replace(/</g, "")}</title><style>@page{size:A4;margin:0}html,body{margin:0}img{width:100%;display:block}</style><img src="${data}" onload="setTimeout(()=>window.print(),300)">`
    );
    w.document.close();
  }

  async function copyLink() {
    const link = appUrl(`/event/${id}/affichette`);
    try {
      await navigator.clipboard.writeText(link);
      setNotice("Lien copié : envoie-le au lieu ou à l'organisateur pour qu'il crée son affichette.");
    } catch {
      setNotice(link);
    }
  }

  const input = {
    width: "100%",
    boxSizing: "border-box",
    border: `1px solid ${colors.border}`,
    borderRadius: 12,
    padding: "10px 12px",
    fontSize: 14,
    fontFamily: fonts.body,
    background: "#fff",
    color: colors.ink
  };
  const label = { display: "block", fontSize: 12, fontWeight: 700, color: colors.muted, margin: "10px 0 4px" };
  const btn = (bg, fg = "#fff", border = "none") => ({
    flex: 1,
    background: bg,
    color: fg,
    border,
    borderRadius: 14,
    padding: "12px 10px",
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6
  });

  return (
    <div style={{ padding: "0 20px 40px", maxWidth: 720, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "18px 0 6px" }}>
        <button onClick={() => navigate(`/event/${id}`)} style={{ background: "none", border: "none", color: colors.ink, cursor: "pointer" }} aria-label="Retour">
          <ChevronLeft size={22} />
        </button>
        <h1 style={{ fontFamily: fonts.display, fontSize: 22, margin: 0, color: colors.navy }}>Créer une affichette</h1>
      </div>
      <p style={{ fontSize: 13.5, color: colors.muted, lineHeight: 1.5, margin: "0 0 14px" }}>
        Pour les lieux et les organisateurs : une affiche prête à imprimer ou à poster, avec la mention « En collaboration avec Spritz Connection » et un QR code pour télécharger l'app et réserver.
      </p>

      {error && <p style={{ color: colors.red, fontSize: 14 }}>{error}</p>}
      {!error && !ready && (
        <p style={{ color: colors.muted, fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
          <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Préparation de l'affichette…
          <style>{"@keyframes spin { to { transform: rotate(360deg); } }"}</style>
        </p>
      )}

      {ready && form && (
        <>
          {new Date(event.event_date) < new Date() && (
            <p style={{ background: "rgba(255,197,43,0.18)", color: "#9A6B00", borderRadius: 12, padding: "8px 12px", fontSize: 13, fontWeight: 600 }}>
              Attention : cet événement est déjà passé.
            </p>
          )}

          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            {Object.entries(POSTER_FORMATS).map(([key, f]) => (
              <button
                key={key}
                onClick={() => setFormat(key)}
                style={btn(format === key ? colors.navy : "#fff", format === key ? "#fff" : colors.navy, `1.5px solid ${colors.navy}`)}
              >
                {f.label}
              </button>
            ))}
          </div>

          <canvas
            ref={canvasRef}
            style={{ width: "100%", height: "auto", borderRadius: 14, boxShadow: "0 10px 28px rgba(6,43,73,0.18)", display: "block", background: "#fff" }}
          />

          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <button onClick={handleDownload} disabled={busy} style={btn(colors.orange)}>
              <Download size={16} /> Télécharger
            </button>
            <button onClick={handleShare} style={btn(colors.navy)}>
              <Share2 size={16} /> Partager
            </button>
            {format === "a4" && (
              <button onClick={handlePrint} style={btn("#fff", colors.navy, `1.5px solid ${colors.border}`)}>
                <Printer size={16} /> Imprimer
              </button>
            )}
          </div>

          <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 16, padding: 16, marginTop: 18 }}>
            <p style={{ fontFamily: fonts.display, fontSize: 17, fontWeight: 700, color: colors.navy, margin: "0 0 4px" }}>Personnaliser</p>
            <p style={{ fontSize: 12.5, color: colors.muted, margin: 0 }}>L'aperçu se met à jour pendant que tu écris. Ces changements ne modifient pas l'événement dans l'app.</p>

            <label style={label}>Titre</label>
            <input style={input} value={form.title} onChange={update("title")} maxLength={90} />

            <label style={label}>Accroche (facultatif)</label>
            <input style={input} value={form.tagline} onChange={update("tagline")} maxLength={160} placeholder="Ex. : Spritz, musique live et bonne humeur italienne !" />

            <label style={label}>Nom du lieu</label>
            <input style={input} value={form.place} onChange={update("place")} maxLength={80} placeholder="Ex. : Bar Da Mario" />

            <label style={label}>Adresse</label>
            <input style={input} value={form.address} onChange={update("address")} maxLength={140} />

            <label style={label}>Prix</label>
            <input style={input} value={form.price} onChange={update("price")} maxLength={120} />

            <label style={label}>Organisé par</label>
            <input style={input} value={form.organizer} onChange={update("organizer")} maxLength={80} />

            <label style={label}>Coordonnées (téléphone, e-mail, Instagram, site…)</label>
            <input style={input} value={form.contact} onChange={update("contact")} maxLength={140} placeholder="Ex. : 06 12 34 56 78 · @bardamario" />
          </div>

          <button onClick={copyLink} style={{ ...btn("none", colors.navy, `1.5px dashed ${colors.border}`), width: "100%", marginTop: 14 }}>
            <Link2 size={15} /> Copier le lien de cette page (à envoyer au lieu)
          </button>
          {notice && <p style={{ fontSize: 12.5, color: colors.muted, textAlign: "center", marginTop: 8, wordBreak: "break-all" }}>{notice}</p>}
        </>
      )}
    </div>
  );
}
