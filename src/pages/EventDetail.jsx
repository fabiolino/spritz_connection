import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Calendar, User, MapPin, Phone, MessageCircle, ChevronLeft, Check, Share2, Users, Camera, Images } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { colors, fonts } from "../lib/theme";
import { useCategories } from "../lib/CategoriesContext";
import { CategoryIcon } from "../lib/eventIcons";
import { useAuth } from "../lib/AuthContext";
import { shareContent } from "../lib/share";

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getCategory } = useCategories();
  const { user } = useAuth();
  const [event, setEvent] = useState(null);
  const [registering, setRegistering] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [error, setError] = useState("");
  const [attendees, setAttendees] = useState([]);
  const [shareMsg, setShareMsg] = useState("");
  const [photos, setPhotos] = useState([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState("");

  useEffect(() => {
    async function load() {
      if (!import.meta.env.VITE_SUPABASE_URL) {
        setEvent({
          id,
          title: "Spritz al Tramonto",
          organizer: "Fabio",
          event_date: "2026-09-12T19:00:00",
          address: "12 Quai de Valmy, 75010 Paris",
          phone: "06 12 34 56 78",
          description: "Apéritif italien classique au bord du canal.",
          price_member: 8,
          price_nonmember: 12,
          is_free: false,
          seats: 40,
          taken: 27
        });
        return;
      }
      const { data } = await supabase.from("events").select("*").eq("id", id).single();
      setEvent(data);

      const res = await fetch("/api/event-attendees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: id })
      });
      if (res.ok) {
        const json = await res.json();
        setAttendees(json.attendees || []);
      }

      const { data: photoRows } = await supabase
        .from("event_photos")
        .select("id, photo_url, user_id")
        .eq("event_id", id)
        .order("created_at", { ascending: true });
      if (photoRows) setPhotos(photoRows);
    }
    load();
  }, [id]);

  if (!event) return null;
  const full = event.taken >= event.seats;
  const cat = getCategory(event.category);

  async function handleFreeRegister() {
    setRegistering(true);
    setError("");
    try {
      const res = await fetch("/api/register-free", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: id, userId: user?.id || null })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erreur lors de l'inscription");
        setRegistering(false);
        return;
      }
      setRegistered(true);
      setEvent((e) => ({ ...e, taken: e.taken + 1 }));
    } catch (err) {
      setError("Impossible de contacter le serveur");
      setRegistering(false);
    }
  }

  async function handleShare() {
    const result = await shareContent({
      title: event.title,
      text: `Rejoins-moi à "${event.title}" sur Spritz Connection !`,
      url: `${window.location.origin}/event/${id}`
    });
    if (result === "copied") setShareMsg("Lien copié !");
    if (result === "failed") setShareMsg("Impossible de partager pour le moment.");
    if (result === "copied" || result === "failed") setTimeout(() => setShareMsg(""), 2500);
  }

  async function handlePhotoUpload(e) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingPhoto(true);
    setPhotoError("");
    try {
      const ext = file.name.split(".").pop();
      const path = `${id}/${user.id}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("event-photos").upload(path, file);
      if (uploadError) throw uploadError;

      const { data: pub } = supabase.storage.from("event-photos").getPublicUrl(path);

      const { error: insertError } = await supabase.from("event_photos").insert({
        event_id: id,
        user_id: user.id,
        photo_url: pub.publicUrl
      });
      if (insertError) throw insertError;

      setPhotos((prev) => [...prev, { id: `${Date.now()}`, photo_url: pub.publicUrl, user_id: user.id }]);
    } catch (err) {
      setPhotoError("Impossible d'ajouter la photo — seules les personnes inscrites et confirmées à cet événement peuvent en ajouter.");
    }
    setUploadingPhoto(false);
    e.target.value = "";
  }

  return (
    <div style={{
