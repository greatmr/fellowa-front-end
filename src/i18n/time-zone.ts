/**
 * The one time zone every date is displayed in (owner decision 2026-10-30).
 * The backend stores `timestamptz`; this only decides how an instant reads,
 * so a server render and the browser always print the same day and hour.
 */
export const TIME_ZONE = 'Asia/Tehran'
