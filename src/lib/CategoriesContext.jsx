import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

// Utilisé tant que la base n'a pas répondu (ou en mode démo hors-ligne),
// pour que l'app reste utilisable immédiatement.
const FALLBACK_CATEGORIES = [
  { id: "concert", label: "Concert", icon_key: "concert" },
  { id: "karaoke", label: "Karaoké", icon_key: "karaoke" },
  { id: "apero", label: "Apéro", icon_key: "apero" },
  { id: "diner", label: "Dîner", icon_key: "diner" },
  { id: "theatre", label: "Théâtre", icon_key: "theatre" },
  { id: "danse", label: "Danse", icon_key: "danse" },
  { id: "autre", label: "Autre", icon_key: "autre" }
];

const CategoriesContext = createContext({ categories: FALLBACK_CATEGORIES, getCategory: () => FALLBACK_CATEGORIES[6] });

export function CategoriesProvider({ children }) {
  const [categories, setCategories] = useState(FALLBACK_CATEGORIES);

  useEffect(() => {
    if (!import.meta.env.VITE_SUPABASE_URL) return;
    supabase
      .from("event_categories")
      .select("*")
      .order("sort_order", { ascending: true })
      .then(({ data }) => {
        if (data && data.length > 0) setCategories(data);
      });
  }, []);

  function getCategory(id) {
    return categories.find((c) => c.id === id) || categories[categories.length - 1] || FALLBACK_CATEGORIES[6];
  }

  return <CategoriesContext.Provider value={{ categories, getCategory }}>{children}</CategoriesContext.Provider>;
}

export function useCategories() {
  return useContext(CategoriesContext);
}
