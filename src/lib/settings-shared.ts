// Settings helpers with no database access, so client components (the
// Settings page previews) can use them too. lib/settings.ts re-exports them.

/** One day's opening hours. Times are "HH:MM", 24-hour. */
export type DayHours = { open: boolean; from: string; to: string };

/** Monday first. */
export const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export const DEFAULT_WEEK_HOURS: DayHours[] = WEEKDAYS.map((_, i) => ({
  open: i < 6,
  from: "09:00",
  to: "19:00",
}));

export const DEFAULT_COMMON_PROBLEMS = [
  "Display cracked",
  "No power",
  "Not charging",
  "Battery drain",
];

// Placeholders: {name} {device} {ticket} {amount} {shop} {link}
export const DEFAULT_MSG_READY =
  "Hi {name}, your {device} ({ticket}) is repaired and ready to collect. Amount to pay: {amount}. Thank you, {shop}";
export const DEFAULT_MSG_LINK =
  "Hi {name}, you can follow your {device} repair ({ticket}) here: {link}";

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export function parseWeekHours(raw: string | undefined | null): DayHours[] {
  if (!raw) return DEFAULT_WEEK_HOURS;
  try {
    const value = JSON.parse(raw);
    if (!Array.isArray(value) || value.length !== 7) return DEFAULT_WEEK_HOURS;
    return value.map((d, i) => ({
      open: Boolean(d?.open),
      from: TIME.test(d?.from) ? d.from : DEFAULT_WEEK_HOURS[i].from,
      to: TIME.test(d?.to) ? d.to : DEFAULT_WEEK_HOURS[i].to,
    }));
  } catch {
    return DEFAULT_WEEK_HOURS;
  }
}

/** "09:00" → "9:00 am" */
export function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const suffix = h < 12 ? "am" : "pm";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

/**
 * The week in one line, e.g. "Mon–Sat 9:00 am – 7:00 pm, Sun closed".
 * Days in a row with the same hours are grouped.
 */
export function weekHoursSummary(week: DayHours[]): string {
  const short = WEEKDAYS.map((d) => d.slice(0, 3));
  const label = (d: DayHours) =>
    d.open ? `${formatTime(d.from)} – ${formatTime(d.to)}` : "closed";
  const parts: string[] = [];
  let start = 0;
  for (let i = 1; i <= 7; i++) {
    if (i === 7 || label(week[i]) !== label(week[start])) {
      const days = i - 1 === start ? short[start] : `${short[start]}–${short[i - 1]}`;
      parts.push(`${days} ${label(week[start])}`);
      start = i;
    }
  }
  return parts.join(", ");
}

/** Whether the shop is open at `now`, in Sri Lanka time. */
export function isOpenNow(week: DayHours[], now = new Date()): boolean {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Colombo",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const day = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(get("weekday"));
  const time = `${get("hour").replace("24", "00")}:${get("minute")}`;
  const today = week[day];
  return !!today?.open && time >= today.from && time < today.to;
}

/** Fill {placeholders} in a customer message. Unknown ones are left alone. */
export function fillMessage(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match);
}

/**
 * Named hues offered in Settings. Restricting the choice to a hue angle is
 * what keeps every theme token coherent: the whole palette rotates together
 * and nothing has to be re-checked for contrast.
 */
export const ACCENT_PRESETS = [
  { label: "Blue", hue: 262 },
  { label: "Indigo", hue: 285 },
  { label: "Violet", hue: 310 },
  { label: "Rose", hue: 10 },
  { label: "Amber", hue: 70 },
  { label: "Green", hue: 150 },
  { label: "Teal", hue: 190 },
  { label: "Cyan", hue: 225 },
] as const;
