import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import QRCode from "qrcode";
import { colors, fonts } from "../lib/theme";

const PROD_URL = "https://spritz-connection.vercel.app";

// /event/<id>/qr-table : chevalets de table à imprimer (4 par feuille A4), avec le QR code
// qui mène à /bienvenue/<soirée>. Ouvert depuis l'admin, bloc « Photos et contacts ».
export default function TableCard() {
  const { id } = useParams();
  const [qr, setQr] = useState("");
  const [title, setTitle] = useState("");
  const url = `${PROD_URL}/bienvenue/${id}`;

  useEffect(() => {
    QRCode.toDataURL(url, { margin: 1, width: 520, errorCorrectionLevel: "M", color: { dark: colors.navy, light: "#FFFFFF" } })
      .then(setQr)
      .catch(() => setQr(""));
    fetch("/api/event-attendees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "contact-info", eventId: id })
    })
      .then((r) => r.json())
      .then((d) => setTitle(d.event?.title || ""))
      .catch(() => {});
  }, [id, url]);

  const one = (k) => (
    <div
      key={k}
      className="sc-table-card"
      style={{
        border: `2px dashed ${colors.border}`,
        borderRadius: 16,
        padding: "18px 16px",
        textAlign: "center",
        background: "#fff",
        breakInside: "avoid"
      }}
    >
      <div style={{ fontSize: 10, letterSpacing: "0.2em", fontWeight: 700, color: colors.orange }}>SPRITZ CONNECTION</div>
      <div style={{ fontFamily: fonts.display, fontSize: 22, fontWeight: 700, color: colors.navy, lineHeight: 1.15, margin: "6px 0 4px" }}>
        Gagne ton entrée 🎁
      </div>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: colors.orange, marginBottom: 6 }}>pour la prochaine soirée</div>
      <div style={{ fontSize: 13, color: colors.ink, lineHeight: 1.4, marginBottom: 10 }}>
        Scanne, laisse ton prénom et ton email :<br />
        <strong>tirage au sort ce soir</strong>, et les photos demain.
      </div>
      {qr ? <img src={qr} alt="QR code" style={{ width: "62%", maxWidth: 220, display: "block", margin: "0 auto" }} /> : <div style={{ height: 180 }} />}
      <div style={{ fontSize: 11.5, color: colors.muted, marginTop: 8 }}>20 secondes, sans appli ni compte{title ? ` · ${title}` : ""}</div>
    </div>
  );

  return (
    <div style={{ padding: 16 }}>
      <style>{`
        @media print {
          @page { size: A4; margin: 10mm; }
          .sc-no-print { display: none !important; }
          body { background: #fff !important; }
          .sc-grid { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>
      <div className="sc-no-print" style={{ marginBottom: 14 }}>
        <p style={{ fontSize: 13.5, lineHeight: 1.5, margin: "0 0 10px" }}>
          4 chevalets par feuille : imprime, découpe et pose-les sur les tables. Le QR code mène à <strong>{url.replace("https://", "")}</strong>.
        </p>
        <button
          onClick={() => window.print()}
          style={{ background: colors.orange, color: "#fff", border: "none", borderRadius: 12, padding: "11px 16px", fontWeight: 700, cursor: "pointer", fontFamily: fonts.body }}
        >
          Imprimer
        </button>
      </div>
      <div className="sc-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))", gap: 12 }}>{[0, 1, 2, 3].map(one)}</div>
    </div>
  );
}
