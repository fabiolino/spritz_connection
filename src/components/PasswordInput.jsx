import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { colors } from "../lib/theme";

// Champ mot de passe avec un bouton « œil » pour afficher / masquer ce qu'on a tapé
export default function PasswordInput({ style, wrapperStyle, ...props }) {
  const [visible, setVisible] = useState(false);
  return (
    <div style={{ position: "relative", ...wrapperStyle }}>
      <input {...props} type={visible ? "text" : "password"} autoCapitalize="off" autoCorrect="off" spellCheck={false} style={{ ...style, width: "100%", paddingRight: 40, boxSizing: "border-box" }} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
        title={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
        style={{
          position: "absolute",
          right: 6,
          top: "50%",
          transform: "translateY(-50%)",
          background: "none",
          border: "none",
          padding: 6,
          cursor: "pointer",
          color: colors.muted,
          display: "flex",
          alignItems: "center"
        }}
      >
        {visible ? <EyeOff size={17} /> : <Eye size={17} />}
      </button>
    </div>
  );
}
