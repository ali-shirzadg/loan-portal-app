const TIME_ZONE = 'Asia/Kuala_Lumpur';

const dateFormatter = new Intl.DateTimeFormat('en-MY', {
  timeZone: TIME_ZONE,
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const dateTimeFormatter = new Intl.DateTimeFormat('en-MY', {
  timeZone: TIME_ZONE,
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
});

/** ISO 8601 (UTC) string to e.g. "20 Oct 2026" in Kuala Lumpur time. */
export function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso));
}

/** ISO 8601 (UTC) string to e.g. "20 Oct 2026, 03:15 pm" in Kuala Lumpur time. */
export function formatDateTime(iso: string): string {
  return dateTimeFormatter.format(new Date(iso));
}
