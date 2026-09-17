import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, User, Shield, Heart, X, LogIn, MapPin, Navigation, Share2, Users2 } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthContext";
import { colors, fonts } from "../lib/theme";
import { distanceKm } from "../lib/categories";
import { useCategories } from "../lib/CategoriesContext";
import { CategoryIcon } from "../lib/eventIcons";
import { shareContent } from "../lib/share";

const DEMO_EVENTS = [
  {
    id: "demo-1",
    title: "Spritz al Tramonto",
    organizer: "Fabio",
    event_date: "2026-09-12T19:00:00",
    address: "12 Quai de Valmy, 75010 Paris",
    seats: 40,
    taken: 27,
    category: "apero",
    latitude: 48.8709,
    longitude: 2.3661
  }
];

const RADII = [5, 10, 20];

export default function Feed() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const { getCategory } = useCategories();
  const [events, setEvents] = useState(DEMO_EVENTS);
  const [loading, setLoading] = useState(true);
  const [showJoinBanner, setShowJoinBanner] = useState(true);
  const [shareMsg, setShareMsg] = useState("");

  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState("");
  const [radius, setRadius] = useState(null); // null = pas de filtre

  useEffect(() => {
    async function load() {
      if (!import.meta.env.VITE_SUPABASE_URL) {
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("approved", true)
        .order("event_date", { ascending: true });
      if (!error && data) setEvents(data);
      setLoading(false);
    }
    load();
  }, []);

  function requestLocation() {
    setLocationError("");
    if (!navigator.geolocation) {
      setLocationError("La géolocalisation n'est pas disponible sur cet appareil.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => setLocationError("Localisation refusée ou indisponible."),
      { enableHighAccuracy: false, timeout: 8000 }
    );
  }

  async function handleShareApp() {
