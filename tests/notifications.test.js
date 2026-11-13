import test from "node:test";
import assert from "node:assert/strict";
import { parseNotification } from "../api/_external.js";
import { paymentOf, recapPhaseStarted } from "../api/_notify.js";

test("Meet5 join notification extracts activity, participant and title", () => {
  const parsed = parseNotification({
    subject: "Julie participe également",
    body: "Julie vient également de rejoindre la rencontre Apéro italien à volonté à Paris 9e. Ouvrir https://www.meet5.com/explore/activity/8887075135054107"
  });
  assert.deepEqual(parsed, {
    source: "meet5",
    kind: "join",
    externalId: "8887075135054107",
    name: "Julie",
    title: "Apéro italien à volonté à Paris 9e"
  });
});

test("Meet5 leave notification is classified as a departure", () => {
  const parsed = parseNotification({
    subject: "Julie a quitté l'activité",
    body: "Julie vient de quitter l'activité Apéro italien à volonté à Paris 9e. Consulter https://www.meet5.com/explore/activity/8887075135054107"
  });
  assert.equal(parsed?.kind, "leave");
  assert.equal(parsed?.externalId, "8887075135054107");
  assert.equal(parsed?.name, "Julie");
});

test("Meet5 notification without an activity URL is rejected", () => {
  assert.equal(parseNotification({ subject: "Julie participe également", body: "Aucune référence d'activité" }), null);
});

test("payment summary distinguishes paid, onsite due and free registrations", () => {
  assert.deepEqual(paymentOf({ amount: 18.5, paid: true }), {
    total: 18.5, paid: 18.5, due: 0, label: "Réglé en prévente"
  });
  assert.deepEqual(paymentOf({ amount: 18.5, paid: false }), {
    total: 18.5, paid: 0, due: 18.5, label: "À régler sur place"
  });
  assert.deepEqual(paymentOf({ amount: 0, paid: true }), {
    total: 0, paid: 0, due: 0, label: "Gratuit"
  });
});

test("venue recap phase starts at 14:00 Paris time on the day before", () => {
  assert.equal(recapPhaseStarted("2026-11-14T19:00:00+01:00", new Date("2026-11-13T12:59:00Z")), false);
  assert.equal(recapPhaseStarted("2026-11-14T19:00:00+01:00", new Date("2026-11-13T13:00:00Z")), true);
  assert.equal(recapPhaseStarted("2026-11-14T19:00:00+01:00", new Date("2026-11-14T08:00:00Z")), true);
});
