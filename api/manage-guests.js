// Déploiement Vercel : POST /api/manage-guests
// Protégé par ADMIN_SECRET — gère les invitations et exclusions par événement,
// et la traçabilité par lieu (regroupé ici pour rester sous la limite de fonctions
// serverless du plan Hobby).

import { createClient } from "@supabase/supabase-js";
import { geocodeAddress } from "./_geocode.js";
import { addTaken } from "./_registration.js";

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const { adminSecret, action, eventId, userId, value } = req.body;
  if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: "Mot de passe administrateur incorrect" });
  }

  try {
    if (action === "co-requests-list") {
      const { data, error } = await supabaseAdmin
        .from("co_organizer_requests")
        .select("id, name, note, status, created_at")
        .eq("status", "pending")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return res.status(200).json({ requests: data || [] });
    }

    if (action === "co-request-moderate") {
      const { requestId, decision } = req.body;
      if (!requestId || !["approved", "rejected"].includes(decision)) {
        return res.status(400).json({ error: "Paramètres invalides" });
      }
      const { error } = await supabaseAdmin.from("co_organizer_requests").update({ status: decision }).eq("id", requestId);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    if (action === "tickets") {
      if (!eventId) return res.status(400).json({ error: "eventId manquant" });
      const { data: regs, error: regsError } = await supabaseAdmin
        .from("registrations")
        .select("id, user_id, option, amount, ticket_code, paid, paid_at, created_at, external, guest_name, guest_email, guest_phone, quantity, attendee_names")
        .eq("event_id", eventId)
        .or("paid.eq.true,external.eq.true")
        .order("created_at", { ascending: true });
      if (regsError) throw regsError;
      const regIds = (regs || []).map((r) => r.id);
      const userIds = [...new Set((regs || []).map((r) => r.user_id).filter(Boolean))];
      let optionsByReg = {};
      if (regIds.length > 0) {
        const { data: opts } = await supabaseAdmin
          .from("registration_options")
          .select("registration_id, label, quantity")
          .in("registration_id", regIds);
        (opts || []).forEach((o) => {
          (optionsByReg[o.registration_id] = optionsByReg[o.registration_id] || []).push(
            (o.quantity || 1) > 1 ? `${o.quantity} × ${o.label}` : o.label
          );
        });
      }
      let profilesById = {};
      if (userIds.length > 0) {
        const { data: profs } = await supabaseAdmin.from("profiles").select("id, name, email").in("id", userIds);
        (profs || []).forEach((p) => (profilesById[p.id] = p));
      }
      return res.status(200).json({
        tickets: (regs || []).map((r) => ({
          id: r.id,
          code: r.ticket_code,
          amount: r.amount,
          option: r.option,
          paid: !!r.paid,
          external: !!r.external,
          name: profilesById[r.user_id]?.name || profilesById[r.user_id]?.email || r.guest_name || "—",
          quantity: r.quantity || 1,
          attendeeNames: r.attendee_names || [],
          contact: r.user_id ? profilesById[r.user_id]?.email || null : [r.guest_email, r.guest_phone].filter(Boolean).join(" · ") || null,
          withoutAccount: !r.user_id,
          options: optionsByReg[r.id] || []
        }))
      });
    }

    // Valider (ou annuler) à la main le paiement d'une réservation faite par lien externe
    if (action === "mark-paid") {
      const { registrationId } = req.body;
      if (!registrationId) return res.status(400).json({ error: "registrationId manquant" });
      const paid = !!value;
      const { data: updated, error: updError } = await supabaseAdmin
        .from("registrations")
        .update({ paid, paid_at: paid ? new Date().toISOString() : null })
        .eq("id", registrationId)
        .eq("external", true)
        .eq("paid", !paid)
        .select("id");
      if (updError) throw updError;
      // Les places d'une réservation par lien externe sont déjà comptées à la réservation :
      // ce bouton ne sert plus qu'à noter le paiement, sans toucher au compteur.
      return res.status(200).json({ ok: true, changed: !!(updated && updated[0]) });
    }

    // Annuler une inscription (désistement, doublon…) : libère ses places
    if (action === "cancel-registration") {
      const { registrationId } = req.body;
      if (!registrationId) return res.status(400).json({ error: "registrationId manquant" });
      const { data: reg } = await supabaseAdmin
        .from("registrations")
        .select("id, event_id, quantity, paid, external")
        .eq("id", registrationId)
        .maybeSingle();
      if (!reg) return res.status(404).json({ error: "Inscription introuvable" });
      await supabaseAdmin.from("registration_options").delete().eq("registration_id", reg.id);
      const { error: delError } = await supabaseAdmin.from("registrations").delete().eq("id", reg.id);
      if (delError) throw delError;
      if (reg.event_id && (reg.paid || reg.external)) await addTaken(supabaseAdmin, reg.event_id, -(reg.quantity || 1));
      return res.status(200).json({ ok: true });
    }

    // --- Lieux partenaires : liste, ajout / modification, suppression ---
    if (action === "venues-list") {
      const { data, error } = await supabaseAdmin.from("venues").select("*").order("name", { ascending: true });
      if (error) throw error;
      return res.status(200).json({ venues: data || [] });
    }

    if (action === "venue-save") {
      const v = req.body.venue || {};
      const name = String(v.name || "").trim();
      const address = String(v.address || "").trim();
      if (!name || !address) return res.status(400).json({ error: "Le nom et l'adresse sont obligatoires" });
      const clean = (x) => (x == null ? null : String(x).trim() || null);
      const capacity = parseInt(v.capacity, 10);
      const row = {
        name,
        address,
        description: clean(v.description),
        capacity: Number.isFinite(capacity) && capacity > 0 ? capacity : null,
        contact_name: clean(v.contact_name),
        contact_phone: clean(v.contact_phone),
        contact_email: clean(v.contact_email),
        payment_info: clean(v.payment_info)
      };

      // Géocodage seulement si l'adresse est nouvelle ou a changé
      let previous = null;
      if (v.id) {
        const { data } = await supabaseAdmin.from("venues").select("address, latitude").eq("id", v.id).maybeSingle();
        previous = data;
        if (!previous) return res.status(404).json({ error: "Lieu introuvable" });
      }
      if (!previous || previous.address !== address || previous.latitude == null) {
        Object.assign(row, await geocodeAddress(address));
      }

      const query = v.id
        ? supabaseAdmin.from("venues").update(row).eq("id", v.id)
        : supabaseAdmin.from("venues").insert(row);
      const { data: saved, error } = await query.select("*").single();
      if (error) throw error;
      return res.status(200).json({ venue: saved, geocoded: saved.latitude != null });
    }

    if (action === "venue-delete") {
      const { venueId } = req.body;
      if (!venueId) return res.status(400).json({ error: "venueId manquant" });
      // Les événements liés gardent leur adresse, ils perdent seulement le lien vers ce lieu
      await supabaseAdmin.from("events").update({ venue_id: null }).eq("venue_id", venueId);
      const { error } = await supabaseAdmin.from("venues").delete().eq("id", venueId);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    if (action === "venue-stats") {
      const { data: venues, error: venuesError } = await supabaseAdmin.from("venues").select("id, name");
      if (venuesError) throw venuesError;

      const { data: events, error: eventsError } = await supabaseAdmin
        .from("events")
        .select("id, venue_id")
        .not("venue_id", "is", null);
      if (eventsError) throw eventsError;

      const eventIds = events.map((e) => e.id);
      let registrations = [];
      if (eventIds.length > 0) {
        const { data: regs, error: regsError } = await supabaseAdmin
          .from("registrations")
          .select("event_id, quantity")
          .in("event_id", eventIds);
        if (regsError) throw regsError;
        registrations = regs;
      }

      const stats = venues.map((v) => {
        const venueEventIds = events.filter((e) => e.venue_id === v.id).map((e) => e.id);
        // Compte des personnes (une inscription de groupe compte pour chacun de ses membres)
        const registrationsCount = registrations
          .filter((r) => venueEventIds.includes(r.event_id))
          .reduce((sum, r) => sum + (r.quantity || 1), 0);
        return { id: v.id, name: v.name, eventsCount: venueEventIds.length, registrationsCount };
      });

      return res.status(200).json({ stats });
    }

    if (!eventId) {
      return res.status(400).json({ error: "eventId manquant" });
    }

    // Lien d'invitation à partager (WhatsApp / SMS). Pour un événement privé, le lien
    // contient un jeton secret qui permet à la personne de s'ajouter aux invités.
    if (action === "invite-link") {
      const { data: ev } = await supabaseAdmin.from("events").select("visibility").eq("id", eventId).single();
      if (!ev) return res.status(404).json({ error: "Événement introuvable" });
      if (ev.visibility !== "private") return res.status(200).json({ token: null });
      const { data: existing } = await supabaseAdmin.from("event_invite_tokens").select("token").eq("event_id", eventId).maybeSingle();
      if (existing) return res.status(200).json({ token: existing.token });
      const { data: created, error: tokError } = await supabaseAdmin
        .from("event_invite_tokens")
        .insert({ event_id: eventId })
        .select("token")
        .single();
      if (tokError) throw tokError;
      return res.status(200).json({ token: created.token });
    }

    if (action === "list") {
      const { data: invites } = await supabaseAdmin.from("event_invites").select("invited_user_id").eq("event_id", eventId);
      const { data: blocks } = await supabaseAdmin.from("event_blocks").select("blocked_user_id").eq("event_id", eventId);
      return res.status(200).json({
        invited: (invites || []).map((r) => r.invited_user_id),
        blocked: (blocks || []).map((r) => r.blocked_user_id)
      });
    }

    if (action === "set-invite") {
      if (value) {
        await supabaseAdmin.from("event_invites").upsert({ event_id: eventId, invited_user_id: userId }, { onConflict: "event_id,invited_user_id" });
      } else {
        await supabaseAdmin.from("event_invites").delete().eq("event_id", eventId).eq("invited_user_id", userId);
      }
      return res.status(200).json({ ok: true });
    }

    if (action === "set-block") {
      if (value) {
        await supabaseAdmin.from("event_blocks").upsert({ event_id: eventId, blocked_user_id: userId }, { onConflict: "event_id,blocked_user_id" });
      } else {
        await supabaseAdmin.from("event_blocks").delete().eq("event_id", eventId).eq("blocked_user_id", userId);
      }
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: "Action inconnue" });
  } catch (err) {
    console.error("Erreur manage-guests:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
}
