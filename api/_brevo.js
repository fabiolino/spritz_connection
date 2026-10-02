// Liste de contacts Brevo « Spritz Connection » — pas une fonction serverless (le "_" l'exclut).
//
// Chaque email laissé dans l'app (inscription à une soirée, compte) est ajouté automatiquement
// à la liste « Spritz Connection » de Brevo (créée au premier besoin, dans un dossier du même nom).
// Désinscription : lien présent dans chaque email → on retire la personne de CETTE liste
// uniquement (le compte Brevo sert aussi à Italia Autentica : on ne la bloque pas partout),
// et on la note dans newsletter_optouts pour ne jamais la rajouter ensuite.

import crypto from "node:crypto";

const LIST_NAME = "Spritz Connection";
const API = "https://api.brevo.com/v3";

function headers() {
  return { "api-key": process.env.BREVO_API_KEY, "Content-Type": "application/json", Accept: "application/json" };
}

async function brevo(path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(API + path, { ...options, headers: headers(), signal: controller.signal });
    const text = await res.text();
    let body = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = text;
    }
    return { ok: res.ok, status: res.status, body };
  } finally {
    clearTimeout(timer);
  }
}

let cachedListId = null;

// Identifiant de la liste « Spritz Connection » (créée si elle n'existe pas encore)
export async function getSpritzListId(supabaseAdmin) {
  if (cachedListId) return cachedListId;
  if (process.env.BREVO_LIST_ID) return (cachedListId = Number(process.env.BREVO_LIST_ID));

  const { data: saved } = await supabaseAdmin.from("private_config").select("value").eq("key", "brevo_list_id").maybeSingle();
  if (saved?.value) return (cachedListId = Number(saved.value));

  // Cherche une liste existante du même nom
  for (let offset = 0; offset < 500; offset += 50) {
    const r = await brevo(`/contacts/lists?limit=50&offset=${offset}`);
    if (!r.ok) break;
    const found = (r.body?.lists || []).find((l) => l.name === LIST_NAME);
    if (found) {
      cachedListId = found.id;
      break;
    }
    if (!r.body?.lists || r.body.lists.length < 50) break;
  }

  // Sinon : crée un dossier puis la liste
  if (!cachedListId) {
    const folder = await brevo("/contacts/folders", { method: "POST", body: JSON.stringify({ name: LIST_NAME }) });
    const folderId = folder.ok ? folder.body?.id : 1;
    const created = await brevo("/contacts/lists", { method: "POST", body: JSON.stringify({ name: LIST_NAME, folderId }) });
    if (!created.ok) throw new Error(`Création de la liste Brevo impossible (${created.status})`);
    cachedListId = created.body.id;
  }

  await supabaseAdmin.from("private_config").upsert({ key: "brevo_list_id", value: String(cachedListId) });
  return cachedListId;
}

function splitName(full) {
  const parts = String(full || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return {};
  return { PRENOM: parts[0], ...(parts.length > 1 ? { NOM: parts.slice(1).join(" ") } : {}) };
}

// Ajoute (ou met à jour) un contact dans la liste — jamais bloquant, jamais si désinscrit
export async function addToSpritzList(supabaseAdmin, { email, name }) {
  try {
    if (!process.env.BREVO_API_KEY || !email) return false;
    const clean = String(email).trim().toLowerCase();
    const { data: optout } = await supabaseAdmin.from("newsletter_optouts").select("email").eq("email", clean).maybeSingle();
    if (optout) return false;
    const listId = await getSpritzListId(supabaseAdmin);
    const r = await brevo("/contacts", {
      method: "POST",
      body: JSON.stringify({
        email: clean,
        attributes: { ...splitName(name), SOURCE: "Spritz Connection" },
        listIds: [listId],
        updateEnabled: true
      })
    });
    if (!r.ok) console.error("Brevo ajout contact:", r.status, JSON.stringify(r.body).slice(0, 200));
    return r.ok;
  } catch (err) {
    console.error("Brevo ajout contact:", err);
    return false;
  }
}

// Ajoute plusieurs contacts d'un coup (rattrapage des emails déjà présents dans l'app),
// en un seul import Brevo
export async function addManyToSpritzList(supabaseAdmin, contacts) {
  if (!process.env.BREVO_API_KEY) throw new Error("Clé Brevo manquante");
  const { data: optouts } = await supabaseAdmin.from("newsletter_optouts").select("email");
  const blocked = new Set((optouts || []).map((o) => o.email));
  const byEmail = new Map();
  for (const c of contacts) {
    const email = String(c.email || "").trim().toLowerCase();
    if (!email || blocked.has(email) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) continue;
    if (!byEmail.has(email) || (!byEmail.get(email).name && c.name)) byEmail.set(email, { email, name: c.name });
  }
  if (byEmail.size === 0) return { total: 0 };
  const listId = await getSpritzListId(supabaseAdmin);
  const r = await brevo("/contacts/import", {
    method: "POST",
    body: JSON.stringify({
      listIds: [listId],
      updateExistingContacts: true,
      emptyContactsAttributes: false,
      jsonBody: [...byEmail.values()].map((c) => ({
        email: c.email,
        attributes: { ...splitName(c.name), SOURCE: "Spritz Connection" }
      }))
    })
  });
  if (!r.ok) throw new Error(`Import Brevo refusé (${r.status}) ${JSON.stringify(r.body).slice(0, 150)}`);
  return { total: byEmail.size };
}

// --- Désinscription ---

function signature(email) {
  return crypto
    .createHmac("sha256", process.env.ADMIN_SECRET || "spritz")
    .update(String(email).trim().toLowerCase())
    .digest("base64url")
    .slice(0, 22);
}

export function unsubscribeUrl(email) {
  const base = (process.env.PUBLIC_APP_URL || "https://spritz-connection.vercel.app").replace(/\/$/, "");
  const e = String(email).trim().toLowerCase();
  return `${base}/api/event-attendees?unsubscribe=1&e=${encodeURIComponent(e)}&t=${signature(e)}`;
}

export function checkUnsubscribeSignature(email, token) {
  const expected = signature(email);
  return (
    typeof token === "string" &&
    token.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected))
  );
}

export async function unsubscribe(supabaseAdmin, email) {
  const clean = String(email).trim().toLowerCase();
  await supabaseAdmin.from("newsletter_optouts").upsert({ email: clean });
  if (process.env.BREVO_API_KEY) {
    try {
      const listId = await getSpritzListId(supabaseAdmin);
      await brevo(`/contacts/lists/${listId}/contacts/remove`, { method: "POST", body: JSON.stringify({ emails: [clean] }) });
    } catch (err) {
      console.error("Brevo désinscription:", err);
    }
  }
}
