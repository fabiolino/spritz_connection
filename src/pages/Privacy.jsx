import React, { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { colors, fonts } from "../lib/theme";

const CONTACT = "fabio@spritzconnection.fr";
const UPDATED = "22 octobre 2026";

// Politique de confidentialité (exigée par Google Play) — page publique /confidentialite
const SECTIONS = [
  {
    id: "responsable",
    title: "1. Qui est responsable de tes données ?",
    body: [
      "L'application et le site Spritz Connection sont édités par Fabio Casilli, entrepreneur individuel (SIRET 877 504 050 00015), 41 rue de la Procession, 75015 Paris, France.",
      `Pour toute question sur tes données : ${CONTACT}.`
    ]
  },
  {
    id: "donnees",
    title: "2. Quelles données nous collectons",
    list: [
      "Compte : ton adresse email (connexion par code envoyé par email), ton prénom ou nom.",
      "Profil, si tu choisis de le compléter : photo, âge, genre, situation, centres d'intérêt.",
      "Réservations : soirées choisies, formule, nombre de places, noms des personnes que tu inscris, email et téléphone de contact, code de billet, statut du paiement.",
      "Paiement : il est traité par notre prestataire SumUp. Nous ne voyons ni ne conservons jamais tes données de carte bancaire.",
      "Messages que tu écris dans le chat d'une soirée et notes ou commentaires que tu laisses après une soirée.",
      "Notifications : si tu les acceptes, un identifiant technique d'abonnement aux notifications de ton appareil.",
      "Localisation : seulement si tu la demandes, pour trier les soirées les plus proches. Elle reste sur ton téléphone et n'est jamais envoyée ni enregistrée.",
      "Données techniques : type d'appareil (Android, iPhone, ordinateur) et date de dernière visite."
    ]
  },
  {
    id: "usages",
    title: "3. À quoi elles servent",
    list: [
      "Gérer ton compte, tes réservations, tes billets et l'entrée aux soirées.",
      "T'envoyer les emails liés à tes réservations : confirmation, rappels, changement, liste d'attente, remerciement.",
      "Si tu t'es inscrit·e à la newsletter : t'informer des nouvelles soirées et des nouveautés de l'app (désinscription en un clic dans chaque email).",
      "Transmettre au lieu qui accueille la soirée la liste des participants (prénom, nom, nombre de places) pour préparer l'accueil.",
      "Améliorer nos soirées grâce à tes notes et commentaires."
    ],
    after: "Base légale : l'exécution de ta réservation, ton consentement (newsletter, notifications, localisation) et notre intérêt légitime à améliorer le service."
  },
  {
    id: "partage",
    title: "4. Avec qui nous les partageons",
    body: [
      "Nous ne vendons jamais tes données et nous n'affichons pas de publicité. Elles sont partagées uniquement avec :"
    ],
    list: [
      "Supabase (hébergement de la base de données, serveurs dans l'Union européenne) ;",
      "Vercel (hébergement de l'application) ;",
      "SumUp (paiement en ligne) ;",
      "Brevo (envoi des emails, société française) ;",
      "les lieux partenaires qui accueillent la soirée à laquelle tu es inscrit·e (liste des participants uniquement)."
    ]
  },
  {
    id: "duree",
    title: "5. Combien de temps nous les gardons",
    body: [
      "Ton compte et ton profil sont conservés tant que tu utilises l'app, puis supprimés après 3 ans sans activité. Les informations de réservation et de paiement sont conservées le temps imposé par les obligations comptables (jusqu'à 10 ans). Les données sont transmises de manière chiffrée (HTTPS)."
    ]
  },
  {
    id: "droits",
    title: "6. Tes droits",
    body: [
      `Tu peux à tout moment accéder à tes données, les corriger, les supprimer, t'opposer à leur utilisation ou demander à les récupérer. Il suffit d'écrire à ${CONTACT}. Nous répondons sous 30 jours maximum. Tu peux aussi saisir la CNIL (cnil.fr).`
    ]
  },
  {
    id: "suppression",
    title: "7. Supprimer ton compte",
    body: [
      `Pour supprimer ton compte Spritz Connection et les données associées, envoie un email à ${CONTACT} depuis l'adresse de ton compte, avec pour objet « Suppression de mon compte ». La suppression est faite sous 7 jours : compte, profil, photo, messages et abonnements aux notifications sont effacés. Seules les données de paiement que la loi nous oblige à garder sont conservées, puis supprimées à la fin de cette durée.`
    ]
  },
  {
    id: "mineurs",
    title: "8. Âge minimum",
    body: ["Nos soirées sont réservées aux personnes majeures. L'app ne s'adresse pas aux moins de 18 ans."]
  },
  {
    id: "modifications",
    title: "9. Modifications",
    body: ["Nous pouvons mettre à jour cette politique. La date de dernière mise à jour est indiquée en haut de cette page."]
  }
];

export default function Privacy() {
  const navigate = useNavigate();
  const { hash } = useLocation();
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [hash]);
  const p = { fontSize: 14.5, lineHeight: 1.65, margin: "0 0 10px", color: colors.ink };
  return (
    <div style={{ padding: "0 20px 48px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "18px 0 6px" }}>
        <button onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))} style={{ background: "none", border: "none", color: colors.ink, cursor: "pointer" }} aria-label="Retour">
          <ChevronLeft size={22} />
        </button>
        <h1 style={{ fontFamily: fonts.display, fontSize: 22, margin: 0, color: colors.navy }}>Politique de confidentialité</h1>
      </div>
      <p style={{ ...p, color: colors.muted, fontSize: 13 }}>Dernière mise à jour : {UPDATED}</p>
      <p style={p}>Spritz Connection organise des soirées italiennes à Paris. Cette page explique simplement quelles données nous utilisons quand tu utilises l'app et le site, et pourquoi.</p>
      {SECTIONS.map((s) => (
        <section key={s.id} id={s.id} style={{ marginTop: 22 }}>
          <h2 style={{ fontFamily: fonts.display, fontSize: 17.5, color: colors.navy, margin: "0 0 8px" }}>{s.title}</h2>
          {(s.body || []).map((t, i) => (
            <p key={i} style={p}>{t}</p>
          ))}
          {s.list && (
            <ul style={{ margin: "0 0 10px", paddingLeft: 20 }}>
              {s.list.map((t, i) => (
                <li key={i} style={{ ...p, margin: "0 0 6px" }}>{t}</li>
              ))}
            </ul>
          )}
          {s.after && <p style={p}>{s.after}</p>}
        </section>
      ))}
    </div>
  );
}
