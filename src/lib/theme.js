// Palette alignée sur la nouvelle charte graphique Spritz Connection
// (maquette fournie le 30/09 — navy/orange/jaune sur fond crème).

export const colors = {
  bg: "#FFFAF0",         // fond principal — crème
  surface: "#FFFFFF",    // cartes, sur le fond crème
  border: "#EADFC4",     // bordures douces, ton sur ton avec le fond

  ink: "#062B49",        // texte principal — navy, comme le logo
  navy: "#062B49",       // alias explicite du navy (hero, nav, titres)
  cream: "#062B49",      // alias historique conservé pour compat — même rôle que ink

  orange: "#F05A19",     // orange du logo — CTA principaux
  orangeDark: "#C7480F",
  red: "#D6432A",        // rouge du verre à spritz — accents secondaires
  blue: "#062B49",       // aligné sur le navy (ancien bleu du texte du logo)
  gold: "#FFC52B",       // jaune des confettis
  yellow: "#FFC52B",     // alias explicite
  olive: "#6B7C4F",      // vert doux — validations (espace admin)

  muted: "#5C6B7A"       // gris bleuté, texte secondaire sur fond clair
};

export const fonts = {
  display: "'Fraunces', Georgia, serif",
  body: "'Space Grotesk', system-ui, sans-serif"
};

// Visuels de soirée (charte, 21/11/2026) : chaque catégorie a sa couleur de
// bandeau (colonne event_categories.color), et les photos reçoivent le même
// réglage « pêchu » : couleurs plus vives, plus de contraste, un peu de chaleur.
export const PHOTO_FILTER = "saturate(1.28) contrast(1.08) brightness(1.03) sepia(0.06)";

const BAND_FALLBACK = {
  apero: "#F05A19", afterwork: "#062B49", karaoke: "#FFC52B", concert: "#FFC52B",
  diner: "#D6432A", danse: "#6B7C4F"
};

function isLight(hex) {
  const h = (hex || "").replace("#", "");
  if (h.length !== 6) return true;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.55;
}

// Couleur du bandeau et du texte posé dessus, pour une catégorie.
export function categoryBand(cat) {
  const bg = cat?.color || BAND_FALLBACK[cat?.id] || "#FFFAF0";
  const light = isLight(bg);
  return {
    bg,
    fg: light ? colors.navy : "#FFFAF0",
    muted: light ? "rgba(6,43,73,0.75)" : "rgba(255,250,240,0.85)",
    ribbon: bg === "#F05A19" ? colors.navy : bg === "#FFC52B" ? colors.red : bg === "#062B49" ? colors.orange : bg === "#FFFAF0" ? colors.orange : colors.gold
  };
}
