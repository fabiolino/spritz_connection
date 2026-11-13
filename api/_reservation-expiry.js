export const RESERVATION_HOLD_MINUTES = 15;

export function reservationExpiresAt(now = new Date()) {
  return new Date(now.getTime() + RESERVATION_HOLD_MINUTES * 60 * 1000).toISOString();
}

export function isReservationExpired(expiresAt, now = new Date()) {
  return !!expiresAt && new Date(expiresAt).getTime() <= now.getTime();
}
