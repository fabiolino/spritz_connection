import { Music, Mic2, Wine, UtensilsCrossed, Drama, PartyPopper, Sparkles } from "lucide-react";

export const CATEGORIES = [
  { id: "concert", label: "Concert", icon: Music },
  { id: "karaoke", label: "Karaoké", icon: Mic2 },
  { id: "apero", label: "Apéro", icon: Wine },
  { id: "diner", label: "Dîner", icon: UtensilsCrossed },
  { id: "theatre", label: "Théâtre", icon: Drama },
  { id: "danse", label: "Danse", icon: PartyPopper },
  { id: "autre", label: "Autre", icon: Sparkles }
];

export function getCategory(id) {
  return CATEGORIES.find((c) => c.id === id) || CATEGORIES[CATEGORIES.length - 1];
}

// Distance à vol d'oiseau entre deux points GPS, en kilomètres (formule de Haversine)
export function distanceKm(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
