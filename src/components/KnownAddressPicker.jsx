import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { colors, fonts } from "../lib/theme";

// Liste déroulante des lieux déjà utilisés : lieux partenaires (table venues)
// + adresses des soirées passées (table events), dédoublonnées.
// Choisir une entrée remplit automatiquement le champ Adresse (et le lieu
// partenaire quand il est connu). Le champ Adresse reste modifiable à la main.

function normalize(address) {
  return (address || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const selectStyle = {
  width: "100%",
  background: colors.surface,
  border: `1px dashed ${colors.border}`,
  borderRadius: 12,
  padding: "9px 12px",
  color: colors.ink,
  fontSize: 13,
  outline: "none",
  fontFamily: fonts.body,
  boxSizing: "border-box",
  marginBottom: 6
};

export default function KnownAddressPicker({ onPick }) {
  const [places, setPlaces] = useState([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [{ data: venues }, { data: events }] = await Promise.all([
        supabase.from("venues").select("id, name, address"),
        supabase
          .from("events")
          .select("address, venue_id, event_date")
          .eq("approved", true)
          .order("event_date", { ascending: false })
          .limit(1000)
      ]);
      if (cancelled) return;

      const venueById = {};
      (venues || []).forEach((v) => { venueById[v.id] = v; });

      const map = new Map();
      // 1. Lieux partenaires (toujours en tête de liste)
      (venues || []).forEach((v) => {
        if (!v.address) return;
        map.set(normalize(v.address), { address: v.address, venueId: v.id, name: v.name, uses: 0, partner: true });
      });
      // 2. Adresses des soirées déjà organisées
      (events || []).forEach((e) => {
        const key = normalize(e.address);
        if (!key) return;
        const existing = map.get(key);
        if (existing) {
          existing.uses += 1;
          if (!existing.venueId && e.venue_id && venueById[e.venue_id]) {
            existing.venueId = e.venue_id;
            existing.name = venueById[e.venue_id].name;
          }
        } else {
          const v = e.venue_id ? venueById[e.venue_id] : null;
          map.set(key, { address: e.address.trim(), venueId: v ? v.id : null, name: v ? v.name : null, uses: 1, partner: false });
        }
      });

      const list = Array.from(map.values()).sort((a, b) => {
        if (a.partner !== b.partner) return a.partner ? -1 : 1;
        if (b.uses !== a.uses) return b.uses - a.uses;
        return (a.name || a.address).localeCompare(b.name || b.address, "fr");
      });
      setPlaces(list);
    }
    load();
    return () => { cancelled = true; };
  }, []);

  if (places.length === 0) return null;

  return (
    <select
      style={selectStyle}
      value=""
      onChange={(e) => {
        const p = places[Number(e.target.value)];
        if (p) onPick({ address: p.address, venueId: p.venueId || "" });
      }}
    >
      <option value="">📍 Choisir un lieu déjà utilisé…</option>
      {places.map((p, i) => (
        <option key={i} value={i}>
          {p.name ? `${p.name} — ${p.address}` : p.address}
        </option>
      ))}
    </select>
  );
}
