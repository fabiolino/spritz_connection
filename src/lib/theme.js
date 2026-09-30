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
