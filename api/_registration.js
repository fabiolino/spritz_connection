// Utilitaires partagés pour les inscriptions (pas une fonction serverless : le "_" l'exclut).
// Utilisés par create-sumup-checkout.js (paiement intégré + lien externe) et register-free.js.
//
// Une inscription peut couvrir un groupe (quantity = nombre de personnes) :
//   - un seul billet / un seul code pour tout le groupe, un seul paiement cumulé
//   - le compteur de places avance du nombre de personnes
//   - on peut s'inscrire sans compte : prénom + nom obligatoires (et email pour payer en ligne)

export const MAX_GROUP = 10;

// Programme de parrainage : nombre de filleuls (première participation payée) nécessaires
// pour que le parrain gagne une entrée gratuite. Ajuste juste ce chiffre si besoin.
export const REFERRAL_THRESHOLD = 3;

// Tant que l'association n'est pas créée : quiconque réserve à l'avance paie le « tarif membre » ;
// le « tarif non-membre » correspond au prix sur place le jour J.
// À passer à false (ici ET dans src/lib/pricing.js) une fois l'association créée.
export const ADVANCE_PRICE_FOR_ALL = true;

// Alphabet sans caractères ambigus (pas de 0/O, 1/I/L)
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function randomCode(length = 6) {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

export function roundCents(n) {
  return Math.round(Number(n) * 100) / 100;
}

export function parseQuantity(value) {
  const q = parseInt(value, 10);
  if (!Number.isFinite(q) || q < 1) return 1;
  return Math.min(q, MAX_GROUP);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Coordonnées de la personne qui inscrit (quand elle n'a pas de compte).
// Renvoie { error } si un champ obligatoire manque.
// L'email est obligatoire : c'est par là que la personne reçoit son billet.
export function readGuest(body, { requireEmail = true } = {}) {
  const name = String(body.guestName || "").trim().slice(0, 80);
  const email = String(body.guestEmail || "").trim().toLowerCase().slice(0, 120);
  const phone = String(body.guestPhone || "").trim().slice(0, 30);
  if (!name) return { error: "Indique ton prénom et ton nom pour l'inscription." };
  if (email && !EMAIL_RE.test(email)) return { error: "L'adresse email ne semble pas valide." };
  if (requireEmail && !email) return { error: "Indique ton email : on t'y envoie ton billet." };
  return { name, email: email || null, phone: phone || null };
}

// Prénoms des autres personnes du groupe (facultatifs) — au plus quantity - 1 noms
export function readAttendeeNames(value, quantity) {
  if (!Array.isArray(value) || quantity < 2) return null;
  const names = value
    .map((n) => String(n || "").trim().slice(0, 80))
    .filter(Boolean)
    .slice(0, quantity - 1);
  return names.length > 0 ? names : null;
}

// Prix des entrées pour un groupe.
// Tant que ADVANCE_PRICE_FOR_ALL est vrai, tout le monde paie le tarif « réservation à l'avance ».
// Ensuite : un membre paie le tarif membre pour lui-même, ses accompagnants le tarif non-membre.
export function entryTotal(event, { isMember, quantity, advancePriceForAll }) {
  const member = Number(event.price_member) || 0;
  const nonMember = Number(event.price_nonmember) || 0;
  if (advancePriceForAll) return member * quantity;
  if (isMember) return member + nonMember * (quantity - 1);
  return nonMember * quantity;
}

// Quantités demandées par option. Accepte le nouveau format { optionQuantities: {id: n} }
// et l'ancien { selectedOptionIds: [id, …] } (quantité 1), pour les versions de l'app en cache.
function readWantedOptions(body) {
  const wanted = {};
  if (body.optionQuantities && typeof body.optionQuantities === "object") {
    for (const [id, n] of Object.entries(body.optionQuantities)) {
      const q = parseInt(n, 10);
      if (Number.isFinite(q) && q > 0) wanted[id] = Math.min(q, 100);
    }
  } else if (Array.isArray(body.selectedOptionIds)) {
    body.selectedOptionIds.forEach((id) => (wanted[id] = 1));
  }
  return wanted;
}

// --- Événements « à formules » (voir isFormulaEvent dans src/lib/pricing.js) ---
// Pas de billet d'entrée séparé : chaque ligne de event_options est une formule complète
// (price = prix de prévente, onsite_price = prix sur place). Le nombre de personnes est le
// total des quantités choisies.
export function isFormulaEvent(event, allOptions) {
  if (!event || event.is_free) return false;
  const noEntry = (Number(event.price_member) || 0) === 0 && (Number(event.price_nonmember) || 0) === 0;
  return noEntry && Array.isArray(allOptions) && allOptions.length > 0;
}

// Toutes les lignes d'un événement
export async function loadEventOptions(supabaseAdmin, eventId) {
  const { data } = await supabaseAdmin
    .from("event_options")
    .select("id, label, price, onsite_price")
    .eq("event_id", eventId);
  return data || [];
}

// Lignes choisies (avec quantité), prises dans la liste complète de l'événement
export function pickOptions(allOptions, body) {
  const wanted = readWantedOptions(body);
  return allOptions
    .filter((o) => wanted[o.id])
    .map((o) => ({ id: o.id, label: o.label, price: o.price, quantity: wanted[o.id] }));
}

// Comptes SumUp : chaque lieu peut encaisser sur son propre compte.
//   - sans compte (account vide) : compte de Spritz Connection (SUMUP_API_KEY / SUMUP_MERCHANT_CODE)
//   - compte « latteria » : variables SUMUP_API_KEY_LATTERIA et SUMUP_MERCHANT_CODE_LATTERIA
// Si le compte d'un lieu est demandé mais pas configuré, on renvoie null : jamais de repli
// sur le compte de Spritz Connection, pour que l'argent n'arrive pas sur le mauvais compte.
export function sumupCredentials(account) {
  const name = String(account || "").trim();
  if (!name) {
    const apiKey = process.env.SUMUP_API_KEY;
    const merchantCode = process.env.SUMUP_MERCHANT_CODE;
    return apiKey && merchantCode ? { apiKey, merchantCode, account: null } : null;
  }
  const suffix = name.toUpperCase().replace(/[^A-Z0-9]/g, "_");
  const apiKey = process.env["SUMUP_API_KEY_" + suffix];
  const merchantCode = process.env["SUMUP_MERCHANT_CODE_" + suffix];
  return apiKey && merchantCode ? { apiKey, merchantCode, account: name } : null;
}

// Options choisies, avec leur quantité (lecture directe en base)
export async function loadChosenOptions(supabaseAdmin, eventId, body) {
  const wanted = readWantedOptions(body);
  const ids = Object.keys(wanted);
  if (ids.length === 0) return [];
  const { data } = await supabaseAdmin
    .from("event_options")
    .select("id, label, price")
    .eq("event_id", eventId)
    .in("id", ids);
  return (data || []).map((o) => ({ ...o, quantity: wanted[o.id] }));
}

export function optionsTotal(options) {
  return options.reduce((sum, o) => sum + (Number(o.price) || 0) * o.quantity, 0);
}

// Places restantes : renvoie un message d'erreur si le groupe ne rentre pas
export function seatsError(event, quantity) {
  if (!event.seats) return null;
  const left = Math.max(0, event.seats - (event.taken || 0));
  if (left <= 0) return "Désolé, l'événement est complet.";
  if (quantity > left) return `Il ne reste que ${left} place${left > 1 ? "s" : ""} pour cet événement.`;
  return null;
}

// Crée l'inscription avec un code de billet unique (réessaie en cas de doublon de code)
export async function insertRegistration(supabaseAdmin, row) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await supabaseAdmin
      .from("registrations")
      .insert({ ...row, ticket_code: randomCode() })
      .select()
      .single();
    if (!error) return data;
    if (error.code !== "23505") throw error;
  }
  throw new Error("Impossible de générer un code de billet unique");
}

export async function insertOptions(supabaseAdmin, registrationId, options) {
  if (options.length === 0) return;
  const { error } = await supabaseAdmin.from("registration_options").insert(
    options.map((o) => ({
      registration_id: registrationId,
      label: o.label,
      price: Number(o.price) || 0,
      quantity: o.quantity
    }))
  );
  if (error) console.error("Erreur insertion registration_options:", error);
}

// Ajoute (ou retire) des places au compteur, de façon atomique
export async function addTaken(supabaseAdmin, eventId, delta) {
  if (!eventId || !delta) return;
  const { error } = await supabaseAdmin.rpc("add_taken", { p_event_id: eventId, p_delta: delta });
  if (error) console.error("Erreur compteur de places:", error);
}

// --- Programme de parrainage ---

// Nombre d'entrées gratuites déjà gagnées mais pas encore utilisées par cet utilisateur
export async function availableReferralCredits(supabaseAdmin, userId) {
  if (!userId) return 0;
  const { count } = await supabaseAdmin
    .from("referrals")
    .select("id", { count: "exact", head: true })
    .eq("referrer_id", userId)
    .eq("status", "rewarded");
  const { data: profile } = await supabaseAdmin.from("profiles").select("referral_credits_used").eq("id", userId).maybeSingle();
  const rewardedCount = count || 0;
  const used = profile?.referral_credits_used || 0;
  return Math.max(0, Math.floor(rewardedCount / REFERRAL_THRESHOLD) - used);
}

// À appeler une fois qu'une inscription vient de passer à "payée" (jamais avant, jamais deux
// fois pour la même inscription) : marque le parrainage du filleul comme récompensé s'il
// s'agit bien de sa première participation payée, et consomme le crédit s'il en a utilisé un.
export async function settleReferralOnPaid(supabaseAdmin, reg) {
  if (!reg || !reg.user_id) return;
  await supabaseAdmin
    .from("referrals")
    .update({ status: "rewarded", rewarded_at: new Date().toISOString() })
    .eq("referred_id", reg.user_id)
    .eq("status", "pending");
  if (reg.used_referral_credit) {
    const { error } = await supabaseAdmin.rpc("increment_referral_credits_used", { p_user_id: reg.user_id });
    if (error) console.error("Erreur consommation crédit parrainage:", error);
  }
}

// --- Spritz Crew : qui a ramené cette inscription ---
// Le code ?ref= du lien personnel d'un membre est renvoyé par l'app avec chaque inscription.
// On l'attribue à ce membre (avec ou sans compte côté inscrit), sauf s'il s'inscrit lui-même.
export async function resolveReferrer(supabaseAdmin, refCode, userId) {
  const code = String(refCode || "").trim().slice(0, 12);
  if (!code) return null;
  const { data } = await supabaseAdmin.from("profiles").select("id").eq("referral_code", code).maybeSingle();
  if (!data || (userId && data.id === userId)) return null;
  return data.id;
}
