import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatLKR(amount: number | string) {
  const n = typeof amount === "string" ? Number(amount) : amount;
  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}

export function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Colombo",
  }).format(new Date(date));
}

// Normalise a Sri Lankan phone number to international +94 form for display
// (e.g. "0771234567" → "+94 77 123 4567"). Used on the bill.
export function formatPhoneIntl(phone: string): string {
  const raw = phone.replace(/[\s\-()]/g, "");
  let intl: string;
  if (raw.startsWith("+94")) intl = raw;
  else if (raw.startsWith("0")) intl = "+94" + raw.slice(1);
  else if (raw.startsWith("94")) intl = "+" + raw;
  else if (raw.startsWith("+")) return raw;
  else intl = "+94" + raw;
  const m = intl.match(/^\+94(\d{2})(\d{3})(\d{4})$/);
  return m ? `+94 ${m[1]} ${m[2]} ${m[3]}` : intl;
}

export function formatTime(date: Date | string) {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Colombo",
  }).format(new Date(date));
}

export function formatDateTime(date: Date | string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Colombo",
  }).format(new Date(date));
}

// Serialise structured data for an inline <script type="application/ld+json">.
// JSON.stringify leaves `<` and `&` alone, so a product name or description
// holding `</script>` would close the tag early and let whatever follows it
// execute. Rewriting those characters as JSON unicode escapes keeps the value
// identical to a JSON parser while leaving nothing for the HTML tokeniser to
// act on.
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(
    /[<>&]/g,
    (c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"),
  );
}
