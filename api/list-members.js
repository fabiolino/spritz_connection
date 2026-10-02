// Déploiement Vercel : POST /api/list-members
// Protégé par ADMIN_SECRET — renvoie la liste des profils (email, nom, statut membre).

import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const { adminSecret } = req.body;
  if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: "Mot de passe administrateur incorrect" });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Statistiques pour la vue « Membres & Spritz Crew » : participations, filleuls, notifications
    const [{ data: regs }, { data: refs }, { data: subs }] = await Promise.all([
      supabaseAdmin.from("registrations").select("user_id, quantity, event_id").not("user_id", "is", null).or("paid.eq.true,external.eq.true"),
      supabaseAdmin.from("referrals").select("referrer_id, status"),
      supabaseAdmin.from("push_subscriptions").select("user_id")
    ]);
    const participations = {};
    (regs || []).forEach((r) => {
      participations[r.user_id] = participations[r.user_id] || new Set();
      if (r.event_id) participations[r.user_id].add(r.event_id);
    });
    const referrals = {};
    (refs || []).forEach((r) => {
      referrals[r.referrer_id] = (referrals[r.referrer_id] || 0) + 1;
    });
    const withPush = new Set((subs || []).map((s) => s.user_id));

    // Spritz Crew : personnes ramenées via le lien perso (hors le membre lui-même)
    const { data: brought } = await supabaseAdmin
      .from("registrations")
      .select("referrer_id, user_id, quantity, paid, external, events(event_date)")
      .not("referrer_id", "is", null);
    const now = Date.now();
    const crew = {};
    (brought || []).forEach((r) => {
      if (!(r.paid || r.external) || r.user_id === r.referrer_id) return;
      const c = (crew[r.referrer_id] = crew[r.referrer_id] || { total: 0, counted: 0 });
      c.total += r.quantity || 1;
      if (r.events?.event_date && new Date(r.events.event_date).getTime() < now) c.counted += r.quantity || 1;
    });

    const profiles = (data || []).map((p) => ({
      ...p,
      events_count: participations[p.id] ? participations[p.id].size : 0,
      referrals_count: referrals[p.id] || 0,
      notifications_on: withPush.has(p.id),
      people_brought: crew[p.id]?.total || 0,
      people_counted: crew[p.id]?.counted || 0,
      vouchers_available: Math.max(0, Math.floor((crew[p.id]?.counted || 0) / 5) - (p.crew_vouchers_used || 0))
    }));
    return res.status(200).json({ profiles });
  } catch (err) {
    console.error("Erreur liste membres:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
}
