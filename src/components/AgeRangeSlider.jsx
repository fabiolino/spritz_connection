import React from "react";
import { colors, fonts } from "../lib/theme";

const SLIDER_MIN = 0;
const SLIDER_MAX = 99;

function clamp(n, lo, hi) {
  return Math.min(hi, Math.max(lo, n));
}

function rangeLabel(min, max) {
  if (min === "" && max === "") return "Tous les âges";
  const lo = min === "" ? SLIDER_MIN : Number(min);
  const hi = max === "" ? SLIDER_MAX : Number(max);
  if (lo <= SLIDER_MIN && hi >= SLIDER_MAX) return "Tous les âges";
  if (lo <= SLIDER_MIN) return `Jusqu'à ${hi} ans`;
  if (hi >= SLIDER_MAX) return `${lo} ans et plus`;
  return `${lo} – ${hi} ans`;
}

// Double curseur (min/max) pour la tranche d'âge conseillée.
// Deux <input type="range"> superposés (astuce classique), seul le "thumb"
// de chacun capte le pointeur (pointer-events géré via CSS ci-dessous),
// ce qui permet de bouger indépendamment la borne min et la borne max.
export default function AgeRangeSlider({ valueMin, valueMax, onChange }) {
  const currentMin = valueMin === "" || valueMin === undefined ? SLIDER_MIN : Number(valueMin);
  const currentMax = valueMax === "" || valueMax === undefined ? SLIDER_MAX : Number(valueMax);
  const isFullRange = valueMin === "" && valueMax === "";

  const minPercent = ((currentMin - SLIDER_MIN) / (SLIDER_MAX - SLIDER_MIN)) * 100;
  const maxPercent = ((currentMax - SLIDER_MIN) / (SLIDER_MAX - SLIDER_MIN)) * 100;

  function handleMinChange(e) {
    const next = clamp(Number(e.target.value), SLIDER_MIN, currentMax - 1);
    onChange(String(next), String(currentMax));
  }

  function handleMaxChange(e) {
    const next = clamp(Number(e.target.value), currentMin + 1, SLIDER_MAX);
    onChange(String(currentMin), String(next));
  }

  function handleReset() {
    onChange("", "");
  }

  return (
    <div>
      <style>{`
        .age-range-slider { -webkit-appearance: none; appearance: none; position: absolute; top: 0; left: 0; width: 100%; height: 32px; margin: 0; background: transparent; pointer-events: none; }
        .age-range-slider::-webkit-slider-runnable-track { background: transparent; }
        .age-range-slider::-moz-range-track { background: transparent; }
        .age-range-slider::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none; pointer-events: auto;
          width: 20px; height: 20px; border-radius: 50%;
          background: ${colors.orange}; border: 2px solid #fff;
          box-shadow: 0 1px 4px rgba(0,0,0,0.25); cursor: pointer;
        }
        .age-range-slider::-moz-range-thumb {
          pointer-events: auto; width: 20px; height: 20px; border-radius: 50%;
          background: ${colors.orange}; border: 2px solid #fff;
          box-shadow: 0 1px 4px rgba(0,0,0,0.25); cursor: pointer;
        }
      `}</style>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: colors.ink, fontFamily: fonts.body }}>
          {rangeLabel(valueMin, valueMax)}
        </span>
        {!isFullRange && (
          <button
            type="button"
            onClick={handleReset}
            style={{ background: "none", border: "none", color: colors.muted, fontSize: 11.5, textDecoration: "underline", cursor: "pointer", padding: 0 }}
          >
            Réinitialiser
          </button>
        )}
      </div>

      <div style={{ position: "relative", height: 32, display: "flex", alignItems: "center" }}>
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            height: 4,
            borderRadius: 2,
            background: colors.border
          }}
        />
        <div
          style={{
            position: "absolute",
            height: 4,
            borderRadius: 2,
            background: colors.orange,
            left: `${minPercent}%`,
            width: `${Math.max(0, maxPercent - minPercent)}%`
          }}
        />
        <input
          type="range"
          className="age-range-slider"
          min={SLIDER_MIN}
          max={SLIDER_MAX}
          value={currentMin}
          onChange={handleMinChange}
        />
        <input
          type="range"
          className="age-range-slider"
          min={SLIDER_MIN}
          max={SLIDER_MAX}
          value={currentMax}
          onChange={handleMaxChange}
        />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: colors.muted, marginTop: 2 }}>
        <span>{SLIDER_MIN}</span>
        <span>{SLIDER_MAX}+</span>
      </div>
    </div>
  );
}
