// Affichette d'événement dessinée dans un <canvas> (aucun serveur) :
// photo, date, titre, infos pratiques, coordonnées, bandeau « En collaboration avec
// Spritz Connection » avec le logo, et QR code vers la page d'installation de l'app.
import QRCode from "qrcode";

export const POSTER_FORMATS = {
  a4: { label: "Affiche A4 (impression)", width: 1240, height: 1754, cover: 0.37 },
  insta: { label: "Format réseaux sociaux (4:5)", width: 1080, height: 1350, cover: 0.33 }
};

const NAVY = "#062B49";
const ORANGE = "#F05A19";
const GOLD = "#FFC52B";
const CREAM = "#FFFAF0";
const MUTED = "#5C6B7A";
const DISPLAY = "Fraunces";
const BODY = "'Space Grotesk'";

export function loadImage(src) {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export async function loadPosterFonts() {
  if (!document.fonts?.load) return;
  await Promise.all([
    document.fonts.load(`700 80px ${DISPLAY}`),
    document.fonts.load(`600 40px ${DISPLAY}`),
    document.fonts.load(`700 40px ${BODY}`),
    document.fonts.load(`500 40px ${BODY}`)
  ]).catch(() => {});
}

export async function qrImage(text) {
  const url = await QRCode.toDataURL(text, { margin: 1, width: 600, errorCorrectionLevel: "M", color: { dark: NAVY, light: "#FFFFFF" } });
  return loadImage(url);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawCover(ctx, img, x, y, w, h) {
  const scale = Math.max(w / img.width, h / img.height);
  const sw = w / scale;
  const sh = h / scale;
  ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h);
}

// Coupe un texte en lignes qui tiennent dans maxWidth (au plus maxLines, avec « … »)
function wrap(ctx, text, maxWidth, maxLines) {
  const words = String(text || "").replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width <= maxWidth || !line) {
      line = test;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    let last = kept[maxLines - 1];
    while (last && ctx.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1);
    kept[maxLines - 1] = `${last.trim()}…`;
    return kept;
  }
  return lines;
}

function formatWhen(iso) {
  const d = new Date(iso);
  const day = d.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long" });
  const time = d.toLocaleTimeString("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" }).replace(":", "h");
  return `${day} · ${time}`.toUpperCase();
}

/**
 * Dessine l'affichette. data : { title, date, tagline, place, address, price, organizer, contact,
 * category, showCategory, cover (Image|null), logo (Image|null), qr (Image|null) }.
 */
export function drawPoster(canvas, formatKey, data) {
  const f = POSTER_FORMATS[formatKey] || POSTER_FORMATS.a4;
  const W = f.width;
  const H = f.height;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  const u = W / 1240;
  const pad = 70 * u;

  // Fond
  ctx.fillStyle = CREAM;
  ctx.fillRect(0, 0, W, H);

  // Photo
  const coverH = Math.round(H * f.cover);
  if (data.cover) {
    drawCover(ctx, data.cover, 0, 0, W, coverH);
  } else {
    const g = ctx.createLinearGradient(0, 0, W, coverH);
    g.addColorStop(0, ORANGE);
    g.addColorStop(1, GOLD);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, coverH);
  }
  const shade = ctx.createLinearGradient(0, coverH * 0.55, 0, coverH);
  shade.addColorStop(0, "rgba(6,43,73,0)");
  shade.addColorStop(1, "rgba(6,43,73,0.45)");
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, W, coverH);

  // Catégorie
  if (data.category && data.showCategory) {
    ctx.font = `700 ${30 * u}px ${BODY}`;
    const label = data.category.toUpperCase();
    const tw = ctx.measureText(label).width;
    roundRect(ctx, pad, pad * 0.8, tw + 44 * u, 58 * u, 29 * u);
    ctx.fillStyle = ORANGE;
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.textBaseline = "middle";
    ctx.fillText(label, pad + 22 * u, pad * 0.8 + 30 * u);
  }

  // Date, à cheval sur la photo
  ctx.font = `700 ${40 * u}px ${BODY}`;
  const when = formatWhen(data.date);
  const dw = Math.min(ctx.measureText(when).width + 60 * u, W - 2 * pad);
  const dateY = coverH - 46 * u;
  ctx.save();
  ctx.translate(pad, dateY);
  ctx.rotate(-0.025);
  roundRect(ctx, 0, 0, dw, 92 * u, 20 * u);
  ctx.fillStyle = ORANGE;
  ctx.shadowColor = "rgba(6,43,73,0.25)";
  ctx.shadowBlur = 18 * u;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#fff";
  ctx.textBaseline = "middle";
  ctx.fillText(when, 30 * u, 48 * u, dw - 60 * u);
  ctx.restore();

  // Bandeau du bas
  const bandH = Math.round(H * (formatKey === "insta" ? 0.21 : 0.19));
  const bandY = H - bandH;

  // Contenu (titre, accroche, infos) : on réduit la taille jusqu'à ce que tout tienne
  const top = coverH + 90 * u;
  const bottom = bandY - 70 * u;
  const width = W - 2 * pad;
  const infos = [
    ["Lieu", [data.place, data.address].filter(Boolean).join(" — ")],
    ["Entrée", data.price],
    ["Organisé par", data.organizer],
    ["Contact", data.contact]
  ].filter(([, v]) => v && String(v).trim());

  let layout = null;
  for (let s = 1; s >= 0.55; s -= 0.05) {
    const titleSize = 96 * u * s;
    ctx.font = `700 ${titleSize}px ${DISPLAY}`;
    const titleLines = wrap(ctx, data.title, width, 3);
    const tagSize = 36 * u * s;
    ctx.font = `500 ${tagSize}px ${BODY}`;
    const tagLines = data.tagline ? wrap(ctx, data.tagline, width, 3) : [];
    const labelSize = 25 * u * s;
    const valueSize = 34 * u * s;
    ctx.font = `500 ${valueSize}px ${BODY}`;
    const infoBlocks = infos.map(([label, value]) => ({ label, lines: wrap(ctx, value, width, 2) }));
    const height =
      titleLines.length * titleSize * 1.08 +
      (tagLines.length ? 20 * u * s + tagLines.length * tagSize * 1.35 : 0) +
      36 * u * s +
      infoBlocks.reduce((sum, b) => sum + labelSize * 1.5 + b.lines.length * valueSize * 1.3 + 22 * u * s, 0);
    layout = { titleSize, titleLines, tagSize, tagLines, labelSize, valueSize, infoBlocks, s, height };
    if (top + height <= bottom) break;
  }

  ctx.textBaseline = "alphabetic";
  // Espace libre réparti au-dessus et en dessous du texte
  let y = top + Math.min(90 * u, Math.max(0, (bottom - top - layout.height) / 2));
  ctx.fillStyle = NAVY;
  ctx.font = `700 ${layout.titleSize}px ${DISPLAY}`;
  for (const line of layout.titleLines) {
    y += layout.titleSize * 0.92;
    ctx.fillText(line, pad, y);
    y += layout.titleSize * 0.16;
  }
  // Petit trait orange sous le titre
  ctx.save();
  ctx.translate(pad, y + 14 * u);
  ctx.rotate(-0.06);
  roundRect(ctx, 0, 0, 120 * u, 14 * u, 7 * u);
  ctx.fillStyle = ORANGE;
  ctx.fill();
  ctx.restore();
  y += 36 * u * layout.s;

  if (layout.tagLines.length) {
    y += 20 * u * layout.s;
    ctx.fillStyle = MUTED;
    ctx.font = `500 ${layout.tagSize}px ${BODY}`;
    for (const line of layout.tagLines) {
      y += layout.tagSize * 1.1;
      ctx.fillText(line, pad, y);
      y += layout.tagSize * 0.25;
    }
  }

  for (const block of layout.infoBlocks) {
    y += 22 * u * layout.s;
    y += layout.labelSize * 1.2;
    ctx.fillStyle = ORANGE;
    ctx.font = `700 ${layout.labelSize}px ${BODY}`;
    ctx.fillText(block.label.toUpperCase(), pad, y);
    y += layout.labelSize * 0.3;
    ctx.fillStyle = NAVY;
    ctx.font = `500 ${layout.valueSize}px ${BODY}`;
    for (const line of block.lines) {
      y += layout.valueSize * 1.05;
      ctx.fillText(line, pad, y);
      y += layout.valueSize * 0.25;
    }
  }

  // Bandeau « En collaboration avec Spritz Connection » : bord incliné, dégradé orange,
  // confettis, logo en pastille, QR code en carte penchée avec un sticker « Scanne-moi ».
  const slant = 34 * u;
  const edge = (x) => bandY + slant - (2 * slant * x) / W; // haut du bandeau, incliné vers la droite

  // Liseré doré décalé au-dessus
  ctx.beginPath();
  ctx.moveTo(0, edge(0) - 16 * u);
  ctx.lineTo(W, edge(W) - 16 * u);
  ctx.lineTo(W, edge(W));
  ctx.lineTo(0, edge(0));
  ctx.closePath();
  ctx.fillStyle = GOLD;
  ctx.fill();

  // Fond en dégradé
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, edge(0));
  ctx.lineTo(W, edge(W));
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.closePath();
  const bg = ctx.createLinearGradient(0, bandY, W, H);
  bg.addColorStop(0, ORANGE);
  bg.addColorStop(0.55, "#E4471C");
  bg.addColorStop(1, "#C7361A");
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.clip();

  // Confettis (toujours aux mêmes endroits)
  let seed = 7;
  const rand = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  const confetti = ["rgba(255,197,43,0.9)", "rgba(255,250,240,0.75)", "rgba(6,43,73,0.55)"];
  for (let i = 0; i < 34; i++) {
    // Le long du bord incliné et tout en bas : jamais sur les textes, le logo ou le QR code
    const cx = rand() * W;
    const band = rand();
    const cy = band < 0.7 ? edge(cx) + (6 + rand() * 46) * u : H - (6 + rand() * 22) * u;
    ctx.fillStyle = confetti[i % 3];
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rand() * Math.PI);
    if (i % 2) {
      ctx.beginPath();
      ctx.arc(0, 0, (4 + rand() * 6) * u, 0, Math.PI * 2);
      ctx.fill();
    } else {
      roundRect(ctx, -10 * u, -3 * u, 20 * u, 6 * u, 3 * u);
      ctx.fill();
    }
    ctx.restore();
  }
  // Grand cercle décoratif en transparence
  ctx.beginPath();
  ctx.arc(W * 0.62, H + bandH * 0.15, bandH * 0.9, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.07)";
  ctx.fill();
  ctx.restore();

  // Logo en pastille ronde, légèrement surélevée
  const logoSize = bandH * 0.62;
  const logoCx = pad + logoSize / 2;
  const logoCy = bandY + bandH * 0.52;
  ctx.save();
  ctx.shadowColor = "rgba(6,43,73,0.35)";
  ctx.shadowBlur = 22 * u;
  ctx.shadowOffsetY = 8 * u;
  ctx.beginPath();
  ctx.arc(logoCx, logoCy, logoSize / 2 + 9 * u, 0, Math.PI * 2);
  ctx.fillStyle = "#fff";
  ctx.fill();
  ctx.restore();
  if (data.logo) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(logoCx, logoCy, logoSize / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.translate(logoCx, logoCy);
    ctx.rotate(-0.08);
    const ls = logoSize * 1.12; // recadre l'orange autour du rond du logo
    ctx.drawImage(data.logo, -ls / 2, -ls / 2, ls, ls);
    ctx.restore();
  }

  // QR code : carte blanche penchée
  const qrSize = bandH * 0.66;
  const qrBox = qrSize + 26 * u;
  const qrCx = W - pad - qrBox / 2;
  const qrCy = bandY + bandH * 0.53;
  ctx.save();
  ctx.translate(qrCx, qrCy);
  ctx.rotate(0.05);
  ctx.shadowColor = "rgba(6,43,73,0.35)";
  ctx.shadowBlur = 24 * u;
  ctx.shadowOffsetY = 10 * u;
  roundRect(ctx, -qrBox / 2, -qrBox / 2, qrBox, qrBox, 22 * u);
  ctx.fillStyle = "#fff";
  ctx.fill();
  ctx.shadowColor = "transparent";
  if (data.qr) ctx.drawImage(data.qr, -qrSize / 2, -qrSize / 2, qrSize, qrSize);
  ctx.restore();

  // Sticker « SCANNE-MOI ! » sur le coin de la carte
  ctx.save();
  ctx.font = `700 ${24 * u}px ${BODY}`;
  const sticker = "SCANNE-MOI !";
  const sw = ctx.measureText(sticker).width + 34 * u;
  ctx.translate(qrCx - qrBox / 2 + 18 * u, qrCy - qrBox / 2 - 6 * u);
  ctx.rotate(-0.14);
  ctx.shadowColor = "rgba(6,43,73,0.3)";
  ctx.shadowBlur = 10 * u;
  roundRect(ctx, -sw / 2, -24 * u, sw, 48 * u, 24 * u);
  ctx.fillStyle = GOLD;
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.fillStyle = NAVY;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillText(sticker, 0, 2 * u);
  ctx.restore();

  // Textes
  const textX = pad + logoSize + 46 * u;
  const textW = qrCx - qrBox / 2 - 36 * u - textX;
  const mid = bandY + bandH * 0.52;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.font = `700 ${23 * u}px ${BODY}`;
  const kicker = "EN COLLABORATION AVEC";
  if ("letterSpacing" in ctx) ctx.letterSpacing = `${3 * u}px`;
  ctx.fillText(kicker, textX, mid - 46 * u, textW);
  if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";

  // Nom de marque avec un coup de surligneur doré
  let brandSize = 58 * u;
  ctx.font = `700 ${brandSize}px ${DISPLAY}`;
  while (ctx.measureText("Spritz Connection").width > textW && brandSize > 30 * u) {
    brandSize -= 2 * u;
    ctx.font = `700 ${brandSize}px ${DISPLAY}`;
  }
  const brandW = ctx.measureText("Spritz Connection").width;
  // Trait doré sous le nom (comme un coup de pinceau)
  ctx.save();
  ctx.translate(textX, mid + 24 * u);
  ctx.rotate(-0.02);
  roundRect(ctx, 0, 0, Math.min(brandW * 0.55, 220 * u), 10 * u, 5 * u);
  ctx.fillStyle = GOLD;
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = "#fff";
  ctx.fillText("Spritz Connection", textX, mid + 14 * u);

  // Pastille d'appel à l'action
  ctx.font = `700 ${24 * u}px ${BODY}`;
  const cta = "Télécharge l'app & réserve ta place  →";
  let ctaText = cta;
  while (ctx.measureText(ctaText).width + 40 * u > textW && ctaText.length > 10) ctaText = ctaText.slice(0, -2);
  if (ctaText !== cta) ctaText = "Télécharge l'app  →";
  const ctaW = Math.min(ctx.measureText(ctaText).width + 40 * u, textW);
  roundRect(ctx, textX, mid + 48 * u, ctaW, 52 * u, 26 * u);
  ctx.fillStyle = NAVY;
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.textBaseline = "middle";
  ctx.fillText(ctaText, textX + 20 * u, mid + 75 * u);
  ctx.textBaseline = "alphabetic";

  return canvas;
}
