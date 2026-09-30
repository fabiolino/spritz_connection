import React from "react";
import { Star } from "lucide-react";
import { colors } from "../lib/theme";

// Affichage d'étoiles (lecture seule) ou sélecteur interactif (onChange fourni).
// value peut être décimal en lecture seule (ex: 4.3) — arrondi à l'étoile la plus proche
// pour le remplissage visuel ; onChange reçoit toujours un entier de 1 à 5.
export default function StarRating({ value = 0, onChange, size = 18 }) {
  const readOnly = !onChange;
  const rounded = Math.round(value);

  return (
    <div style={{ display: "inline-flex", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= rounded;
        return (
          <button
            key={n}
            type="button"
            disabled={readOnly}
            onClick={() => onChange && onChange(n)}
            aria-label={`${n} étoile${n > 1 ? "s" : ""}`}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              lineHeight: 0,
              cursor: readOnly ? "default" : "pointer"
            }}
          >
            <Star size={size} color={colors.gold} fill={filled ? colors.gold : "none"} strokeWidth={1.5} />
          </button>
        );
      })}
    </div>
  );
}
