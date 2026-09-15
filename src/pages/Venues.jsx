import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, MapPin, Users, Phone, Mail, Building2 } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { colors, fonts } from "../lib/theme";

export default function Venues() {
  const navigate = useNavigate();
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!import.meta.env.VITE_SUPABASE_URL) {
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("venues")
        .select("*")
        .order("created_at", { ascending: true });
      if (!error && data) setVenues(data);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div style={{ padding: "0 20px 40px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "18px 0 8px" }}>
        <button onClick={() => navigate("/")} style={{ background: "none", border: "none", color: colors.ink, cursor: "pointer" }}>
          <ChevronLeft size={22} />
        </button>
        <h1 style={{ fontFamily: fonts.display, fontSize: 20, margin: 0 }}>Lieux partenaires</h1>
      </div>

      <p style={{ fontSize: 13, color: colors.muted, margin: "0 0 20px" }}>
        Des lieux ouverts à accueillir tes soirées. Contacte-les directement pour organiser ton événement.
      </p>

      {loading && <p style={{ color: colors.muted, fontSize: 13 }}>Chargement…</p>}

      {!loading && venues.length === 0 && (
        <p style={{ color: colors.muted, fontSize: 13 }}>
          Aucun lieu disponible pour le moment.
        </p>
      )}

      {venues.map((v) => (
        <div
          key={v.id}
          style={{
            background: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: 18,
            overflow: "hidden",
            marginBottom: 14,
            boxShadow: "0 3px 10px rgba(43,36,25,0.06)"
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: 14,
              background: "linear-gradient(160deg, rgba(44,79,140,0.10), rgba(240,180,41,0.10))"
            }}
          >
            <Building2 size={22} color={colors.blue} />
            <h2 style={{ fontFamily: fonts.display, fontSize: 17, margin: 0 }}>{v.name}</h2>
          </div>

          <div style={{ padding: 14 }}>
            {v.description && (
              <p style={{ fontSize: 13, color: colors.ink, margin: "0 0 10px", lineHeight: 1.4 }}>
                {v.description}
              </p>
            )}

            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: colors.muted, marginBottom: 4 }}>
              <MapPin size={13} /> {v.address}
            </div>

            {v.capacity && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: colors.muted, marginBottom: 10 }}>
                <Users size={13} /> Jusqu'à {v.capacity} personnes
              </div>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              {v.contact_phone && (
              <a  
                  href={`tel:${v.contact_phone}`}
                  style={{
                    flex: 1,
                    background: colors.orange,
                    color: "#fff",
                    borderRadius: 12,
                    padding: 10,
                    fontSize: 12.5,
                    fontWeight: 700,
                    textDecoration: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6
                  }}
                >
                  <Phone size={13} /> Appeler
                </a>
              )}
              {v.contact_email && (
                
                  href={`mailto:${v.contact_email}`}
                  style={{
                    flex: 1,
                    background: "none",
                    border: `1px solid ${colors.border}`,
                    color: colors.ink,
                    borderRadius: 12,
                    padding: 10,
                    fontSize: 12.5,
                    fontWeight: 700,
                    textDecoration: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6
                  }}
                >
                  <Mail size={13} /> Écrire
                </a>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
