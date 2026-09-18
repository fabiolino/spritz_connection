// Icônes des catégories d'événements —
// version "grand format" : vraies illustrations façon BD (photos statiques
// dans /public/categories/), utilisées dès 24px et au-delà.
// version "petit format" : glyphe simple à une couleur, pour les badges
// en ligne où l'illustration détaillée deviendrait illisible.

import { colors } from "./theme";

function Confetti() {
  return (
    <>
      <circle cx="8" cy="10" r="1.1" fill={colors.gold} />
      <circle cx="32" cy="12" r="1" fill={colors.red} />
      <circle cx="31" cy="29" r="1.1" fill={colors.blue} />
    </>
  );
}

// --- Glyphes seuls (sans cercle), pour les petits badges en ligne ---

function ConcertGlyph({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M8 18V6l10-2v10" stroke={colors.orange} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="6" cy="18" r="2.4" fill={colors.orange} />
      <circle cx="16" cy="14" r="2.4" fill={colors.orange} />
    </svg>
  );
}

function KaraokeGlyph({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="9" y="2" width="6" height="11" rx="3" fill={colors.orange} />
      <path d="M5 11a7 7 0 0 0 14 0" stroke={colors.orange} strokeWidth="2" strokeLinecap="round" fill="none" />
      <line x1="12" y1="18" x2="12" y2="22" stroke={colors.orange} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function AperoGlyph({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M5 3h14l-6 8v10" stroke={colors.orange} strokeWidth="2" strokeLinejoin="round" fill="none" />
      <path d="M8 19h8" stroke={colors.orange} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function DinerGlyph({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M6 2v8m3-8v8M6 6h3M7.5 6v14" stroke={colors.orange} strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M18 2c-2 0-3 2.5-3 5.5S16 12 18 12v10" stroke={colors.orange} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

function TheatreGlyph({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" fill={colors.orange} opacity="0.15" />
      <circle cx="9" cy="10" r="1.4" fill={colors.orange} />
      <circle cx="15" cy="10" r="1.4" fill={colors.orange} />
      <path d="M8 15c1.5 1.5 6.5 1.5 8 0" stroke={colors.orange} strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  );
}

function DanseGlyph({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="4" r="2.2" fill={colors.orange} />
      <path
        d="M12 7v6m0 0-4 6m4-6 4 5m-4-8-3-2.5m3 2.5 3.5-1.5"
        stroke={colors.orange}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

function AutreGlyph({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 2l2.2 6.6L21 11l-6.8 2.4L12 20l-2.2-6.6L3 11l6.8-2.4L12 2z" fill={colors.orange} />
    </svg>
  );
}

const GLYPHS = {
  concert: ConcertGlyph,
  karaoke: KaraokeGlyph,
  apero: AperoGlyph,
  diner: DinerGlyph,
  theatre: TheatreGlyph,
  danse: DanseGlyph,
  autre: AutreGlyph
};

// --- Versions "grand format" : illustration réelle dans un cercle, pour les grands affichages ---

function PhotoBadge({ src, size }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        overflow: "hidden",
        border: `2px solid ${colors.orange}`,
        flexShrink: 0,
        boxShadow: "0 2px 6px rgba(43,36,25,0.15)"
      }}
    >
      <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
    </div>
  );
}

export function ConcertIcon({ size }) {
  return <PhotoBadge src="/categories/concert.png" size={size} />;
}

export function KaraokeIcon({ size }) {
  return <PhotoBadge src="/categories/karaoke.png" size={size} />;
}

export function AperoIcon({ size }) {
  return <PhotoBadge src="/categories/apero.png" size={size} />;
}

export function DinerIcon({ size }) {
  return <PhotoBadge src="/categories/diner.png" size={size} />;
}

export function TheatreIcon({ size }) {
  return <PhotoBadge src="/categories/theatre.png" size={size} />;
}

export function DanseIcon({ size }) {
  return <PhotoBadge src="/categories/danse.png" size={size} />;
}

export function AutreIcon({ size }) {
  return <PhotoBadge src="/categories/autre.png" size={size} />;
}

export const ICON_COMPONENTS = {
  concert: ConcertIcon,
  karaoke: KaraokeIcon,
  apero: AperoIcon,
  diner: DinerIcon,
  theatre: TheatreIcon,
  danse: DanseIcon,
  autre: AutreIcon
};

// Rendu générique : en dessous de 24px, on affiche le glyphe seul (lisible en petit) ;
// au-dessus, la vraie illustration. Repli sur l'emoji si la catégorie n'a pas
// d'icône dessinée (cas des catégories ajoutées plus tard sans code).
export function CategoryIcon({ category, size = 20 }) {
  if (!category) return <AutreGlyph size={size} />;

  const key = category.icon_key;
  const small = size < 24;

  if (key && GLYPHS[key]) {
    const Glyph = GLYPHS[key];
    const Full = ICON_COMPONENTS[key];
    return small ? <Glyph size={size} /> : <Full size={size} />;
  }
  if (category.emoji) {
    return <span style={{ fontSize: size * 0.85, lineHeight: 1, display: "inline-block" }}>{category.emoji}</span>;
  }
  return small ? <AutreGlyph size={size} /> : <AutreIcon size={size} />;
}
