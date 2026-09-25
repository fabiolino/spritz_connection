import React, { useState } from "react";
import { MessageSquare, Link2, Check } from "lucide-react";
import { colors, fonts } from "../lib/theme";
import { inviteMessage, whatsappLink, smsLink } from "../lib/invite";
import { shareContent } from "../lib/share";

function WhatsAppGlyph({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.8-1.4a.5.5 0 0 0 0-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.3.8 3.2.7a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.2-.2-.4-.3Z" />
    </svg>
  );
}

const btn = {
  flex: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  borderRadius: 12,
  padding: "10px 8px",
  fontSize: 13,
  fontWeight: 700,
  textDecoration: "none",
  cursor: "pointer",
  boxSizing: "border-box"
};

// Boutons "Inviter par WhatsApp / SMS / autre" pour un événement
export default function InviteButtons({ event, url, title = "Inviter des amis", subtitle, style }) {
  const [msg, setMsg] = useState("");
  const text = inviteMessage(event, url);

  async function handleOther() {
    const result = await shareContent({ title: event?.title, text, url });
    if (result === "copied") setMsg("Lien copié !");
    if (result === "failed") setMsg("Copie impossible — sélectionne le lien à la main.");
    if (result === "copied" || result === "failed") setTimeout(() => setMsg(""), 2500);
  }

  return (
    <div
      style={{
        background: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: 16,
        padding: 14,
        boxShadow: "0 3px 10px rgba(43,36,25,0.05)",
        ...style
      }}
    >
      <div style={{ fontFamily: fonts.display, fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{title}</div>
      <p style={{ fontSize: 11.5, color: colors.muted, margin: "0 0 10px", lineHeight: 1.4 }}>
        {subtitle || "Même sans l'app : ils arrivent directement sur cet événement et peuvent s'inscrire."}
      </p>
      <div style={{ display: "flex", gap: 8 }}>
        <a href={whatsappLink(text)} target="_blank" rel="noreferrer" style={{ ...btn, background: "#25D366", color: "#fff" }}>
          <WhatsAppGlyph /> WhatsApp
        </a>
        <a href={smsLink(text)} style={{ ...btn, background: colors.blue, color: "#fff" }}>
          <MessageSquare size={15} /> SMS
        </a>
        <button onClick={handleOther} style={{ ...btn, background: "none", border: `1px solid ${colors.border}`, color: colors.ink }}>
          {msg === "Lien copié !" ? <Check size={15} /> : <Link2 size={15} />} Autre
        </button>
      </div>
      {msg && <p style={{ fontSize: 11.5, color: colors.muted, textAlign: "center", margin: "8px 0 0" }}>{msg}</p>}
    </div>
  );
}
