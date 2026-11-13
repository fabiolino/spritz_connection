import test from "node:test";
import assert from "node:assert/strict";
import { RESERVATION_HOLD_MINUTES, reservationExpiresAt, isReservationExpired } from "../api/_reservation-expiry.js";

test("external reservation hold lasts exactly 15 minutes", () => {
  const now = new Date("2026-11-13T12:00:00.000Z");
  assert.equal(RESERVATION_HOLD_MINUTES, 15);
  assert.equal(reservationExpiresAt(now), "2026-11-13T12:15:00.000Z");
});

test("reservation is active before its expiry and expired at the deadline", () => {
  const expiry = "2026-11-13T12:15:00.000Z";
  assert.equal(isReservationExpired(expiry, new Date("2026-11-13T12:14:59.999Z")), false);
  assert.equal(isReservationExpired(expiry, new Date("2026-11-13T12:15:00.000Z")), true);
});

test("reservations without an expiry are not treated as expired", () => {
  assert.equal(isReservationExpired(null, new Date("2026-11-13T12:15:00.000Z")), false);
});
