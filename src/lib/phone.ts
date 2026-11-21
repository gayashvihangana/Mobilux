// Links for calling or messaging a customer from the shop's phone.
//
// Numbers are stored as typed at the counter ("077 123 4567", "+94 77…"), so
// they are cleaned here. WhatsApp needs the international form without "+":
// a local Sri Lankan number starting with 0 becomes 94 followed by the rest.

const COUNTRY_CODE = "94";

/** Digits only, with a leading local 0 swapped for the country code. */
export function internationalDigits(phone: string): string | null {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  else if (digits.startsWith("0")) digits = COUNTRY_CODE + digits.slice(1);
  return digits.length >= 9 && digits.length <= 15 ? digits : null;
}

export function telHref(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, "");
  return `tel:${digits}`;
}

/** A wa.me link, optionally with a message typed in ready to send. */
export function whatsappHref(phone: string, message?: string): string | null {
  const digits = internationalDigits(phone);
  if (!digits) return null;
  return message
    ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
    : `https://wa.me/${digits}`;
}
