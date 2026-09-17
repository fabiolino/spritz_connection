import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Calendar, User, MapPin, Phone, MessageCircle, ChevronLeft, Check, Share2, Users } from "lucide-react";
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
