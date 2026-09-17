import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Check, X, CalendarPlus, Clock, Star, Users, UserCheck, Ban } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { colors, fonts } from "../lib/theme";

const DEMO_REQUESTS = [
  { id: 1, name: "Giulia R.", note: "Envie d'organiser une soirée cinéma italien à Belleville." }
];

export default function Admin() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState(DEMO_REQUESTS);
  const [pendingEvents, setPendingEvents] = useState([]);
  const [adminSecret, setAdminSecret] = useState("");
  const [moderating, setModerating] = useState(null);
  const [modError, setModError] = useState("");

  const [members,
