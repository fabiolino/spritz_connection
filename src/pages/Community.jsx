import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthContext";
import { colors, fonts } from "../lib/theme";

export default function Community() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!import.meta.env.VITE_SUPABASE_URL) {
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, photo_url, tastes, is_member")
        .order("name", { ascending: true });
      if (!error && data) setMembers(data);
      setLoading(false);
    }
    load();
  }, []);

  if (!authLoading && !user) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <p style={{ color: colors.muted, fontSize: 14, marginBottom: 16 }}>
          Connecte-toi pour voir la communauté.
        </p>
        <button
          onClick={() => navigate("/login")}
          style={{ background: colors.orange, color: "#fff", border: "none", borderRadius: 12, padding: "10px 20px", fontWeight: 700, cursor: "pointer" }}
        >
          Se connecter
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: "0 20px 40px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "18px 0 12px" }}>
        <button onClick={() => navigate("/")} style={{ background: "none", border: "none", color: colors.ink, cursor: "pointer" }}>
          <ChevronLeft size={22} />
        </button>
        <h1 style={{ fontFamily: fonts.display, fontSize: 20, margin: 0 }}>Communauté</h1>
      </div>
      <p
