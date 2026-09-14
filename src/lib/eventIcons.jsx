// Icônes illustrées sur mesure pour les catégories d'événements —
// badges circulaires dans l'esprit du logo Spritz Connection
// (cercle crème, confettis, accents orange/bleu/rouge).

import { colors } from "./theme";

function Badge({ children, size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <circle cx="20" cy="20" r="19" fill={colors.bg} stroke={colors.orange} strokeWidth="1.4" />
      {children}
    </svg>
  );
}

// Petits confettis réutilisés sur chaque badge, comme sur le logo
function Confetti() {
  return (
    <>
      <circle cx="8" cy="10" r="1.1" fill={colors.gold} />
      <circle cx="32" cy="12" r="1" fill={colors.red} />
      <circle cx="31" cy="29" r="1.1" fill={colors.blue} />
    </>
  );
}

export function ConcertIcon({ size }) {
  return (
    <Badge size={size}>
      <Confetti />
      <path d="M17 27V15l10-2v10" stroke={colors.blue} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="15" cy="27" r="2.6" fill={colors.orange} />
      <circle cx="25" cy="23" r="2.6" fill={colors.orange} />
    </Badge>
  );
}

export function KaraokeIcon({ size }) {
  return (
    <Badge size={size}>
      <Confetti />
      <rect x="17" y="9" width="6" height="11" rx="3" fill={colors.red} />
      <path d="M13 18a7 7 0 0 0 14 0" stroke={colors.blue} strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <line x1="20" y1="25" x2="20" y2="30" stroke={colors.blue} strokeWidth="1.8" strokeLinecap="round" />
      <line x1="15" y1="30" x2="25" y2="30" stroke={colors.blue} strokeWidth="1.8" strokeLinecap="round" />
    </Badge>
  );
}

export function AperoIcon({ size }) {
  return (
    <Badge size={size}>
      <Confetti />
      <path d="M13 10h14l-6 8v8" stroke={colors.red} strokeWidth="1.8" strokeLinejoin="round" fill="none" />
      <path d="M14.5 12h11" stroke={colors.red} strokeWidth="1.4" />
      <path d="M15 26h10" stroke={colors.blue} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M15.5 11.5c2 2.6 7 2.6 9 0" stroke={colors.orange} strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </Badge>
  );
}

export function DinerIcon({ size }) {
  return (
    <Badge size={size}>
      <Confetti />
      {/* fourchette */}
      <path d="M14 9v8m3-8v8m-3-4h3m-1.5 4v11" stroke={colors.blue} strokeWidth="1.6" strokeLinecap="round" fill="none" />
      {/* couteau */}
      <path d="M26 9c-2 0-3 2-3 5s1 4 3 4v11" stroke={colors.red} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Badge>
  );
}

export function TheatreIcon({ size }) {
  return (
    <Badge size={size}>
      <Confetti />
      <ellipse cx="20" cy="20" rx="9" ry="10" fill={colors.blue} opacity="0.12" />
      <circle cx="16" cy="18" r="1.4" fill={colors.blue} />
      <circle cx="24" cy="18" r="1.4" fill={colors.blue} />
      <path d="M15 24c2 2 8 2 10 0" stroke={colors.red} strokeWidth="1.8" strokeLinecap="round" fill="none" />
    </Badge>
  );
}

export function DanseIcon({ size }) {
  return (
    <Badge size={size}>
      <Confetti />
      <circle cx="20" cy="12" r="2.6" fill={colors.orange} />
      <path
        d="M20 15v8m0 0-5 6m5-6 6 4m-6-10-4-3m4 3 5-2"
        stroke={colors.blue}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Badge>
  );
}

export function AutreIcon({ size }) {
  return (
    <Badge size={size}>
      <Confetti />
      <path
        d="M20 11l1.8 5.4L27 18l-5.2 1.6L20 25l-1.8-5.4L13 18l5.2-1.6L20 11z"
        fill={colors.gold}
      />
    </Badge>
  );
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

// Rendu générique : icône illustrée si on en a une, sinon l'emoji fourni par la catégorie,
// sinon l'icône "Autre" par défaut. Utilisé partout dans l'app à la place d'un <Icon /> direct.
export function CategoryIcon({ category, size = 20 }) {
  if (!category) return <AutreIcon size={size} />;
  const Comp = ICON_COMPONENTS[category.icon_key];
  if (Comp) return <Comp size={size} />;
  if (category.emoji) {
    return (
      <span style={{ fontSize: size * 0.75, lineHeight: 1, display: "inline-block" }}>{category.emoji}</span>
    );
  }
  return <AutreIcon size={size} />;
}
