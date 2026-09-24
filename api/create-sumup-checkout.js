// Déploiement Vercel : POST /api/create-sumup-checkout
//
// Un seul fichier gère plusieurs actions (pour rester sous la limite de 12 fonctions
// serverless du plan Vercel Hobby) :
//   - (par défaut)  création d'un paiement SumUp pour une inscription ou une adhésion
//   - "ticket"      lecture d'un billet (page /ticket/:id), avec vérification du paiement
//   - "my-tickets"  liste des billets payés de l'utilisateur connecté
//   - "external-reservation"  réservation (avec code) pour un événement réglé par un
//                   lien de paiement externe : sert de justificatif, le paiement est
//                   ensuite validé à la main par l'administrateur
//
// Variables d'environnement nécessaires (Vercel > Settings > Environment Variables) :
//   SUMUP_API_KEY              -> clé API secrète SumUp (me.sumup.com > Developers)
//   SUMUP_MERCHANT_CODE        -> code marchand SumUp
//   PUBLIC_APP_URL             -> URL de l'app déployée
//   VITE_SUPABASE_URL          -> URL du projet Supabase (déjà utilisée côté front)
//   SUPABASE_SERVICE_ROLE_KEY  -> clé secrète Supabase (Project Settings > API Keys >
//                                 onglet "Legacy anon, service_role API keys" > service_role)
//                                 ⚠️ Ne JAMAIS préfixer cette variable par VITE_ — elle doit
//                                 rester strictement côté serveur.
//
// Le montant est TOUJOURS recalculé ici, côté serveur, à partir des prix enregistrés
// (tarif membre / non-membre, options, adhésion) : le montant envoyé par le navigateur
// n'est jamais utilisé, pour qu'un billet « payé » corresponde vraiment au bon prix.

import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const MEMBERSHIP_PRICE = 25; // doit rester aligné avec Join.jsx et Register.jsx

// Tant que l'association n'est pas créée : quiconque réserve à l'avance dans l'app paie
// le « tarif membre » ; le « tarif non-membre » correspond au prix sur place le jour J.
// À passer à false (ici ET dans src/lib/pricing.js) une fois l'association créée.
const ADVANCE_PRICE_FOR_ALL = true;

// Alphabet sans caractères ambigus (pas de 0/O, 1/I/L)
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function randomCode(length = 6) {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

function roundCents(n) {
  return Math.round(Number(n) * 100) / 100;
}

async function getUserFromRequest(req) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return null;
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

// Passe une inscription à « payée » une seule fois (même si le webhook et la page
// billet vérifient en même temps) et compte la place une seule fois.
async function markPaid(registrationId) {
  const { data: updated } = await supabaseAdmin
    .from("registrations")
    .update({ paid: true, paid_at: new Date().toISOString() })
    .eq("id", registrationId)
    .eq("paid", false)
    .select("id, event_id");
  const reg = updated && updated[0];
  if (reg && reg.event_id) {
    const { data: ev } = await supabaseAdmin.from("events").select("taken").eq("id", reg.event_id).single();
    if (ev) {
      await supabaseAdmin.from("events").update({ taken: (ev.taken || 0) + 1 }).eq("id", reg.event_id);
    }
  }
}

async function verifyWithSumup(checkoutId) {
  const verifyRes = await fetch(`https://api.sumup.com/v0.1/checkouts/${checkoutId}`, {
    headers: { Authorization: `Bearer ${process.env.SUMUP_API_KEY}` }
  });
  if (!verifyRes.ok) return null;
  const checkout = await verifyRes.json();
  return checkout.status;
}

// ---------- Billet ----------
async function handleTicket(req, res) {
  const { registrationId } = req.body;
  if (!registrationId) {
    return res.status(400).json({ error: "Billet introuvable" });
  }

  let { data: reg, error } = await supabaseAdmin
    .from("registrations")
    .select("id, event_id, option, amount, paid, ticket_code, sumup_checkout_id, created_at, paid_at, external, guest_name")
    .eq("id", registrationId)
    .maybeSingle();
  if (error || !reg) {
    return res.status(404).json({ error: "Billet introuvable" });
  }

  // Le webhook SumUp peut arriver quelques secondes après le retour sur l'app :
  // on vérifie directement auprès de SumUp si le paiement n'est pas encore confirmé.
  if (!reg.paid && !reg.external && reg.sumup_checkout_id) {
    const status = await verifyWithSumup(reg.sumup_checkout_id);
    if (status === "PAID") {
      await markPaid(reg.id);
      reg = { ...reg, paid: true };
    } else if (status === "FAILED") {
      reg = { ...reg, failed: true };
    }
  }

  const { data: options } = await supabaseAdmin
    .from("registration_options")
    .select("label, price")
    .eq("registration_id", reg.id);

  let event = null;
  if (reg.event_id) {
    const { data: ev } = await supabaseAdmin
      .from("events")
      .select("id, title, event_date, address, sumup_link")
      .eq("id", reg.event_id)
      .maybeSingle();
    event = ev;
  }

  return res.status(200).json({
    ticket: {
      id: reg.id,
      paid: !!reg.paid,
      failed: !!reg.failed,
      code: reg.paid || reg.external ? reg.ticket_code : null,
      external: !!reg.external,
      guestName: reg.guest_name || null,
      createdAt: reg.created_at,
      option: reg.option,
      amount: reg.amount,
      options: options || [],
      event
    }
  });
}

// ---------- Mes billets ----------
async function handleMyTickets(req, res) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ error: "Connecte-toi pour voir tes billets" });
  }
  const { data: regs, error } = await supabaseAdmin
    .from("registrations")
    .select("id, event_id, option, amount, ticket_code, created_at, paid, external")
    .eq("user_id", user.id)
    .or("paid.eq.true,external.eq.true")
    .order("created_at", { ascending: false });
  if (error) throw error;

  const eventIds = [...new Set((regs || []).map((r) => r.event_id).filter(Boolean))];
  let eventsById = {};
  if (eventIds.length > 0) {
    const { data: events } = await supabaseAdmin
      .from("events")
      .select("id, title, event_date")
      .in("id", eventIds);
    (events || []).forEach((e) => (eventsById[e.id] = e));
  }

  return res.status(200).json({
    tickets: (regs || []).map((r) => ({
      id: r.id,
      code: r.ticket_code,
      paid: !!r.paid,
      external: !!r.external,
      option: r.option,
      amount: r.amount,
      event: r.event_id ? eventsById[r.event_id] || null : null
    }))
  });
}

// ---------- Réservation pour un événement à lien de paiement externe ----------
async function handleExternalReservation(req, res) {
  const { eventId, selectedOptionIds, guestName } = req.body;
  if (!eventId) return res.status(400).json({ error: "eventId manquant" });

  const user = await getUserFromRequest(req);
  const name = (guestName || "").trim().slice(0, 80);
  if (!user && !name) {
    return res.status(400).json({ error: "Indique ton prénom et ton nom pour la réservation." });
  }

  const { data: event } = await supabaseAdmin
    .from("events")
    .select("id, price_member, price_nonmember, sumup_link, approved, is_free")
    .eq("id", eventId)
    .maybeSingle();
  if (!event || !event.approved || !event.sumup_link) {
    return res.status(404).json({ error: "Événement introuvable" });
  }

  let isMember = false;
  if (user) {
    const { data: profile } = await supabaseAdmin.from("profiles").select("is_member").eq("id", user.id).maybeSingle();
    isMember = !!profile?.is_member;
  }

  let amount = Number(ADVANCE_PRICE_FOR_ALL || isMember ? event.price_member : event.price_nonmember) || 0;
  let chosenOptions = [];
  if (Array.isArray(selectedOptionIds) && selectedOptionIds.length > 0) {
    const { data: opts } = await supabaseAdmin
      .from("event_options")
      .select("id, label, price")
      .eq("event_id", eventId)
      .in("id", selectedOptionIds);
    chosenOptions = opts || [];
    amount += chosenOptions.reduce((sum, o) => sum + (Number(o.price) || 0), 0);
  }
  amount = roundCents(amount);

  let reg = null;
  for (let attempt = 0; attempt < 5 && !reg; attempt++) {
    const { data, error } = await supabaseAdmin
      .from("registrations")
      .insert({
        event_id: eventId,
        user_id: user ? user.id : null,
        guest_name: name || null,
        option: "billet",
        amount,
        paid: false,
        external: true,
        ticket_code: randomCode()
      })
      .select()
      .single();
    if (!error) reg = data;
    else if (error.code !== "23505") {
      console.error("Erreur réservation externe:", error);
      return res.status(500).json({ error: "Erreur lors de la réservation" });
    }
  }
  if (!reg) return res.status(500).json({ error: "Erreur lors de la réservation" });

  if (chosenOptions.length > 0) {
    await supabaseAdmin.from("registration_options").insert(
      chosenOptions.map((o) => ({ registration_id: reg.id, label: o.label, price: Number(o.price) || 0 }))
    );
  }

  return res.status(200).json({ registrationId: reg.id, amount });
}

// ---------- Création du paiement ----------
async function handleCheckout(req, res) {
  const { eventId, option, selectedOptionIds } = req.body;

  if (!eventId || !option) {
    return res.status(400).json({ error: "Paramètres manquants (eventId, option)" });
  }

  const user = await getUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ error: "Connecte-toi pour payer en ligne" });
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("is_member")
    .eq("id", user.id)
    .maybeSingle();
  const isMember = !!profile?.is_member;

  let amount = 0;
  let chosenOptions = [];
  let description = "Spritz Connection — adhésion";
  const isMembership = eventId === "membership";

  if (isMembership) {
    amount = MEMBERSHIP_PRICE;
  } else {
    const { data: event, error: eventError } = await supabaseAdmin
      .from("events")
      .select("id, title, price_member, price_nonmember, is_free, sumup_link, seats, taken, approved")
      .eq("id", eventId)
      .maybeSingle();
    if (eventError || !event || !event.approved) {
      return res.status(404).json({ error: "Événement introuvable" });
    }
    if (event.sumup_link) {
      return res.status(400).json({ error: "Cet événement se règle via son propre lien de paiement." });
    }
    if (event.seats && event.taken >= event.seats) {
      return res.status(409).json({ error: "Désolé, l'événement est complet." });
    }

    const { data: blocked } = await supabaseAdmin
      .from("event_blocks")
      .select("id")
      .eq("event_id", eventId)
      .eq("blocked_user_id", user.id)
      .maybeSingle();
    if (blocked) {
      return res.status(403).json({ error: "Tu ne peux pas t'inscrire à cet événement." });
    }

    amount = Number(ADVANCE_PRICE_FOR_ALL || isMember ? event.price_member : event.price_nonmember) || 0;

    if (Array.isArray(selectedOptionIds) && selectedOptionIds.length > 0) {
      const { data: opts } = await supabaseAdmin
        .from("event_options")
        .select("id, label, price")
        .eq("event_id", eventId)
        .in("id", selectedOptionIds);
      chosenOptions = opts || [];
      amount += chosenOptions.reduce((sum, o) => sum + (Number(o.price) || 0), 0);
    }

    if (option === "both" && !isMember && !ADVANCE_PRICE_FOR_ALL) {
      amount += MEMBERSHIP_PRICE;
    }
    description = `Spritz Connection — ${event.title}`;
  }

  amount = roundCents(amount);
  if (amount <= 0) {
    return res.status(400).json({ error: "Montant invalide" });
  }

  // 1. On crée l'inscription d'abord (non payée), pour connaître son identifiant
  //    et y renvoyer le participant après le paiement.
  let reg = null;
  for (let attempt = 0; attempt < 5 && !reg; attempt++) {
    const { data, error } = await supabaseAdmin
      .from("registrations")
      .insert({
        event_id: isMembership ? null : eventId,
        user_id: user.id,
        option,
        amount,
        paid: false,
        ticket_code: randomCode()
      })
      .select()
      .single();
    if (!error) reg = data;
    else if (error.code !== "23505") {
      console.error("Erreur insertion registration:", error);
      return res.status(500).json({ error: "Erreur lors de l'inscription" });
    }
  }
  if (!reg) {
    return res.status(500).json({ error: "Erreur lors de l'inscription" });
  }

  if (chosenOptions.length > 0) {
    const optionRows = chosenOptions.map((o) => ({
      registration_id: reg.id,
      label: o.label,
      price: Number(o.price) || 0
    }));
    const { error: optionsError } = await supabaseAdmin.from("registration_options").insert(optionRows);
    if (optionsError) console.error("Erreur insertion registration_options:", optionsError);
  }

  // 2. Création du paiement SumUp
  const response = await fetch("https://api.sumup.com/v0.1/checkouts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.SUMUP_API_KEY}`
    },
    body: JSON.stringify({
      checkout_reference: `${reg.id}`,
      amount,
      currency: "EUR",
      merchant_code: process.env.SUMUP_MERCHANT_CODE,
      description,
      redirect_url: `${process.env.PUBLIC_APP_URL}/ticket/${reg.id}`,
      return_url: `${process.env.PUBLIC_APP_URL}/api/sumup-webhook`,
      hosted_checkout: { enabled: true },
      ...(user.email ? { customer_id: user.email } : {})
    })
  });

  const data = await response.json();

  if (!response.ok || !data.hosted_checkout_url) {
    console.error("Erreur SumUp:", data);
    await supabaseAdmin.from("registration_options").delete().eq("registration_id", reg.id);
    await supabaseAdmin.from("registrations").delete().eq("id", reg.id);
    return res.status(502).json({ error: data.message || "Échec de création du paiement SumUp" });
  }

  await supabaseAdmin.from("registrations").update({ sumup_checkout_id: data.id }).eq("id", reg.id);

  return res.status(200).json({
    url: data.hosted_checkout_url,
    checkoutId: data.id,
    registrationId: reg.id,
    amount
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  try {
    const action = req.body?.action;
    if (action === "ticket") return await handleTicket(req, res);
    if (action === "my-tickets") return await handleMyTickets(req, res);
    if (action === "external-reservation") return await handleExternalReservation(req, res);
    return await handleCheckout(req, res);
  } catch (err) {
    console.error("Erreur serveur:", err);
    return res.status(500).json({ error: "Erreur serveur lors du paiement" });
  }
}
