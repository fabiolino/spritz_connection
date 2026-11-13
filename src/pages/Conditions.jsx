import React from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { colors, fonts } from "../lib/theme";

const UPDATED = "13 novembre 2026";
const CONTACT = "fabio@spritzconnection.fr";

const SECTIONS = [
  {
    title: "1. Billet et confirmation de réservation",
    paragraphs: [
      "Toute réservation validée donne lieu à la création d'un billet électronique individuel à la réservation, identifié par un code unique. Pour une réservation de plusieurs personnes effectuée en une seule fois, un billet unique couvre l'ensemble des places réservées.",
      "Le billet est affiché sur la page de confirmation de l'application et envoyé à l'adresse email communiquée lors de la réservation. Il appartient au participant de conserver ce billet et de pouvoir le présenter, sur écran ou sous forme imprimée, à l'accueil de la soirée.",
      "Le billet et son code constituent le justificatif de la réservation. Ils font foi pour toute demande de cession à un tiers ou de report. En cas de perte de l'email, le billet reste consultable depuis son lien de confirmation ; une nouvelle tentative d'envoi peut être déclenchée en consultant à nouveau ce billet."
    ]
  },
  {
    title: "2. Réservations temporaires et paiement",
    paragraphs: [
      "Lorsqu'une réservation est effectuée pour une soirée dont le paiement s'effectue via un lien externe SumUp, les places sont bloquées pendant 15 minutes à compter de la création de la réservation. Si le paiement n'est pas confirmé dans ce délai, la réservation expire et les places sont automatiquement remises à disposition. Une réservation expirée ne constitue plus un billet valable et ne peut donner lieu ni à une cession ni à un report.",
      "Pour les paiements traités directement dans l'application, la réservation devient définitive après confirmation du paiement par le prestataire de paiement."
    ]
  },
  {
    title: "3. Billet non remboursable",
    paragraphs: [
      "Toute place vendue est ferme et non remboursable à la demande du participant, notamment en cas d'empêchement, de changement de programme ou d'absence le jour de la soirée. Cette règle s'applique sous réserve des dispositions légales impératives et des conséquences d'une annulation ou d'une modification substantielle imputable à l'organisateur.",
      "Pour les prestations de loisirs fournies à une date ou à une période déterminée, le droit de rétractation ne s'applique pas dans les conditions prévues à l'article L.221-28, 12° du Code de la consommation."
    ]
  },
  {
    title: "4. Cession du billet à un tiers",
    paragraphs: [
      "Le participant peut céder son billet à la personne de son choix, sans remboursement ni échange monétaire par Spritz Connection. La cession s'effectue en transmettant au bénéficiaire le billet électronique et son code de réservation.",
      "Le billet transmis constitue la preuve de la cession et doit être présenté à l'accueil. Le détenteur du billet est responsable de sa transmission au bénéficiaire ; le même billet ne peut naturellement être utilisé qu'une seule fois à l'entrée. Pour une réservation de groupe couverte par un billet unique, le billet couvre l'ensemble des places indiquées."
    ]
  },
  {
    title: "5. Report de participation — une seule fois",
    paragraphs: [
      "Un billet payant dont le paiement est confirmé peut bénéficier d'un report, une seule fois, sur une autre soirée à venir organisée dans le même lieu et proposée au même tarif. Le report est soumis aux places disponibles et à l'existence d'une date éligible dans l'application.",
      "La demande de report doit être effectuée au plus tard 24 heures avant le début de la soirée initialement réservée. Les options ou prestations complémentaires ne peuvent être transférées que si elles sont également proposées lors de la soirée choisie, au même prix.",
      "Une fois le report confirmé, le billet initial est mis à jour pour la nouvelle date. Le code de billet est conservé et le droit au report est consommé : aucun second report ne sera possible. Le billet mis à jour fait foi pour accéder à la nouvelle soirée."
    ]
  },
  {
    title: "6. Présentation et contrôle du billet",
    paragraphs: [
      "À l'entrée, le participant présente le billet électronique ou imprimé afin que son code puisse être contrôlé. Un billet déjà utilisé, expiré, annulé ou remplacé à la suite d'un report ne permet pas une nouvelle admission.",
      "En cas de difficulté concernant un billet, une cession ou un report, le participant peut contacter Spritz Connection à l'adresse indiquée ci-dessous en joignant son billet ou son code de réservation."
    ]
  },
  {
    title: "7. Organisateur et contact",
    paragraphs: [
      "Spritz Connection est édité par Fabio Casilli, entrepreneur individuel, SIRET 877 504 050 00015, 41 rue de la Procession, 75015 Paris, France.",
      `Pour toute question relative à une réservation : ${CONTACT}.`
    ]
  }
];

export default function Conditions() {
  const navigate = useNavigate();
  const p = { fontSize: 14, lineHeight: 1.65, margin: "0 0 10px", color: colors.ink };
  return (
    <div style={{ padding: "0 20px 48px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "18px 0 6px" }}>
        <button onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))} style={{ background: "none", border: "none", color: colors.ink, cursor: "pointer" }} aria-label="Retour">
          <ChevronLeft size={22} />
        </button>
        <h1 style={{ fontFamily: fonts.display, fontSize: 22, margin: 0, color: colors.navy }}>Conditions de réservation</h1>
      </div>
      <p style={{ ...p, color: colors.muted, fontSize: 12.5 }}>Dernière mise à jour : {UPDATED}</p>
      <p style={p}>Les présentes conditions précisent les règles applicables aux réservations et aux billets des soirées Spritz Connection. Elles complètent les informations affichées sur chaque événement.</p>
      {SECTIONS.map((section, i) => (
        <section key={section.title} style={{ marginTop: 22 }}>
          <h2 style={{ fontFamily: fonts.display, fontSize: 17, color: colors.navy, margin: "0 0 8px" }}>{section.title}</h2>
          {section.paragraphs.map((paragraph, j) => <p key={j} style={p}>{paragraph}</p>)}
        </section>
      ))}
      <p style={{ ...p, marginTop: 24, fontSize: 12, color: colors.muted }}>Ces conditions sont à faire valider juridiquement avant leur publication définitive.</p>
    </div>
  );
}
