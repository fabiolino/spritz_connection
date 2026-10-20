// Script Google Apps Script à coller une fois dans le compte Gmail de l'organisateur.
// Toutes les 5 minutes, il envoie à Spritz Connection les nouveaux emails
// « X participe également » / « X a quitté l'activité » reçus des autres applications.
export function gmailImportScript(importSecret, origin = "https://spritz-connection.vercel.app") {
  return `// Spritz Connection : collecte automatique des réservations faites sur d'autres applications.
// 1) Cliquez sur « Exécuter » (fonction installer) et acceptez les autorisations.
// 2) C'est tout : le script tourne ensuite tout seul toutes les 5 minutes.

const SPRITZ_URL = "${origin}/api/manage-guests";
const SPRITZ_KEY = "${importSecret}";
const QUERY = 'from:noreply@activity.meet5.net (subject:"participe également" OR subject:"quitté l\\'activité") newer_than:30d';

function installer() {
  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger("collecter").timeBased().everyMinutes(5).create();
  collecter();
}

function collecter() {
  var props = PropertiesService.getScriptProperties();
  var seen = JSON.parse(props.getProperty("seen") || "{}");
  var batch = [];
  GmailApp.search(QUERY, 0, 100).forEach(function (thread) {
    thread.getMessages().forEach(function (m) {
      var id = m.getId();
      if (seen[id]) return;
      batch.push({ id: id, subject: m.getSubject(), date: m.getDate().toISOString(), body: m.getPlainBody().slice(0, 6000), html: m.getBody().slice(0, 60000) });
    });
  });
  for (var i = 0; i < batch.length; i += 20) {
    var part = batch.slice(i, i + 20);
    var res = UrlFetchApp.fetch(SPRITZ_URL, {
      method: "post",
      contentType: "application/json",
      muteHttpExceptions: true,
      payload: JSON.stringify({ action: "external-ingest", importSecret: SPRITZ_KEY, messages: part })
    });
    if (res.getResponseCode() !== 200) throw new Error("Spritz Connection : " + res.getContentText());
    part.forEach(function (p) { seen[p.id] = Date.now(); });
  }
  // On oublie les emails de plus de 35 jours pour garder la mémoire légère
  var limit = Date.now() - 35 * 24 * 3600 * 1000;
  Object.keys(seen).forEach(function (k) { if (seen[k] < limit) delete seen[k]; });
  props.setProperty("seen", JSON.stringify(seen));
}
`;
}
