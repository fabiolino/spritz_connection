import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronDown, HelpCircle } from "lucide-react";
import { colors, fonts } from "../lib/theme";

const FAQ = [
  {
    section: "Inscription & paiement",
    items: [
      {
        q: "Comment je m'inscris à un événement ?",
        a: "Ouvre la fiche de l'événement et clique sur le bouton d'inscription. Si l'événement est gratuit, tu confirmes directement. S'il est payant, tu es redirigé vers le paiement (intégré à l'app ou vers le lien de l'organisateur selon l'événement)."
      },
      {
        q: "Où est-ce que je retrouve mon billet ou ma confirmation ?",
        a: "Ta place est confirmée dès que le paiement est validé — retourne sur la fiche de l'événement pour voir que tu es bien inscrit, et retrouve le chat de l'événement pour les infos pratiques."
      },
      {
        q: "Comment annuler ma participation ?",
        a: "Contacte l'organisateur de l'événement via le téléphone affiché sur la fiche — les annulations ne se font pas encore automatiquement dans l'app."
      },
      {
        q: "Je ne trouve pas mon paiement, que faire ?",
        a: "Vérifie d'abord ta boîte mail (confirmation SumUp). Si le souci persiste, contacte l'organisateur avec le numéro affiché sur l'événement."
      }
    ]
  },
  {
    section: "Communauté & membres",
    items: [
      {
        q: "Quelle est la différence entre membre et non-membre ?",
        a: "Les membres bénéficient de tarifs préférentiels sur les événements payants. Tu peux adhérer directement au moment de ton inscription à un événement."
      },
      {
        q: "Comment je rejoins la communauté Spritz Connection ?",
        a: "Crée un compte avec ton email — un lien de connexion (magic link) t'est envoyé, pas besoin de mot de passe. Tu apparais ensuite dans la page Communauté."
      },
      {
        q: "Comment je suis invité à un événement privé ?",
        a: "L'organisateur choisit qui inviter parmi les membres de la communauté. Si tu es invité, l'événement apparaît normalement dans ton feed avec un badge 🔒."
      }
    ]
  },
  {
    section: "Organiser un événement",
    items: [
      {
        q: "Comment je propose un événement ?",
        a: "Depuis la page d'accueil, clique sur « Organiser une soirée » et remplis le formulaire. Tu peux proposer un événement gratuit ou payant (avec ton propre lien de paiement dans ce cas)."
      },
      {
        q: "Combien de temps avant que mon événement soit visible ?",
        a: "Chaque proposition est examinée par l'équipe Spritz Connection avant publication — compte quelques heures."
      },
      {
        q: "Si mon événement est payant, l'argent passe par qui ?",
        a: "Directement par le lien de paiement que tu renseignes toi-même (SumUp, Lydia, PayPal…) — Spritz Connection ne touche jamais tes règlements."
      }
    ]
  },
  {
    section: "Application",
    items: [
      {
        q: "Comment installer l'app sur mon téléphone ?",
        a: "Ouvre le site dans ton navigateur, puis utilise « Ajouter à l'écran d'accueil » (iPhone : bouton Partager > Sur l'écran d'accueil — Android : menu ⋮ > Installer l'application)."
      },
      {
        q: "Je dois me reconnecter tout le temps, c'est normal ?",
        a: "Non — une fois connecté, tu dois rester connecté. Si ça arrive, essaie de fermer complètement puis rouvrir l'app ; si le souci persiste, contacte-nous."
      }
    ]
  }
];

export default function Help() {
  const navigate = useNavigate();
  const [openKey, setOpenKey] = useState(null);

  function toggle(key) {
    setOpenKey((prev) => (prev === key ? null : key));
  }

  return (
    <div style={{ padding: "0 20px 40px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "18px 0 16px" }}>
        <button onClick={() => navigate("/")} style={{ background: "none", border: "none", color: colors.ink, cursor: "pointer" }}>
          <ChevronLeft size={22} />
        </button>
        <h1 style={{ fontFamily: fonts.display, fontSize: 20, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
          <HelpCircle size={20} color={colors.orange} /> Aide &amp; questions fréquentes
        </h1>
      </div>

      {FAQ.map((section) => (
        <div key={section.section} style={{ marginBottom: 22 }}>
          <h2 style={{ fontFamily: fonts.display, fontSize: 15, margin: "0 0 10px" }}>{section.section}</h2>
          {section.items.map((item, i) => {
            const key = `${section.section}-${i}`;
            const open = openKey === key;
            return (
              <div
                key={key}
                style={{
                  background: colors.surface,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 12,
                  marginBottom: 8,
                  overflow: "hidden"
                }}
              >
                <button
                  onClick={() => toggle(key)}
                  style={{
                    width: "100%",
                    background: "none",
                    border: "none",
                    padding: "12px 14px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    cursor: "pointer",
                    textAlign: "left"
                  }}
                >
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: colors.ink }}>{item.q}</span>
                  <ChevronDown
                    size={16}
                    color={colors.muted}
                    style={{ flexShrink: 0, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}
                  />
                </button>
                {open && (
                  <div style={{ padding: "0 14px 14px", fontSize: 13, color: colors.muted, lineHeight: 1.5 }}>{item.a}</div>
                )}
              </div>
            );
          })}
        </div>
      ))}

      <p style={{ fontSize: 12, color: colors.muted, textAlign: "center", marginTop: 20 }}>
        Une autre question ? Contacte l'organisateur de l'événement concerné, ou l'équipe Spritz Connection.
      </p>
    </div>
  );
}
