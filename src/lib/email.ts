import { SITE_URL } from "@/lib/config";
import { getShopInfo, type ShopInfo } from "@/lib/settings";

// Transactional email via Resend's HTTP API (no SDK needed).
// Silently disabled until RESEND_API_KEY is set, so every call site can
// fire-and-forget without caring whether email is configured.
//
// The shop's name, tagline and contact line are read from Settings on every
// send (cached, so it costs nothing) rather than baked in at build time — an
// owner who renames their shop expects the next email to say the new name.

type EmailInput = {
  to: string;
  subject: string;
  heading: string;
  lines: string[];
  // Optional "topics" table shown above the body — e.g. Repair / Device /
  // Status — so the important facts are scannable at a glance.
  details?: { label: string; value: string }[];
  cta?: { label: string; url: string };
};

export function emailConfigured() {
  return !!process.env.RESEND_API_KEY;
}

// Returns whether the email was accepted for delivery. Callers that only
// notify can ignore the result; flows that depend on delivery (OTP) check it.
export async function sendEmail({
  to,
  subject,
  heading,
  lines,
  details,
  cta,
}: EmailInput): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;

  const shop = await getShopInfo();
  const from = process.env.EMAIL_FROM ?? `${shop.name} <onboarding@resend.dev>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        html: renderHtml({ heading, lines, details, cta }, shop),
      }),
    });
    if (!res.ok) {
      console.error("sendEmail failed:", res.status, await res.text());
      return false;
    }
    return true;
  } catch (error) {
    // Email must never break the action that triggered it.
    console.error("sendEmail error:", error);
    return false;
  }
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderHtml(
  {
    heading,
    lines,
    details,
    cta,
  }: Pick<EmailInput, "heading" | "lines" | "details" | "cta">,
  shop: ShopInfo,
) {
  // Serif everywhere to match the printed bill (Newsreader where the client
  // supports web fonts, Georgia otherwise).
  const serif = "'Newsreader', Georgia, 'Times New Roman', serif";

  const paragraphs = lines
    .map(
      (line) =>
        `<p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#374151;font-family:${serif};">${escapeHtml(line)}</p>`,
    )
    .join("");

  // "Topics" table — the key facts, scannable at a glance.
  const detailRows = (details ?? [])
    .filter((d) => d.value?.trim())
    .map(
      (d) => `
        <tr>
          <td style="padding:7px 0;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#9ca3af;font-family:${serif};white-space:nowrap;vertical-align:top;">${escapeHtml(d.label)}</td>
          <td style="padding:7px 0 7px 16px;font-size:14px;color:#111827;font-weight:600;font-family:${serif};">${escapeHtml(d.value)}</td>
        </tr>`,
    )
    .join("");

  const detailsBlock = detailRows
    ? `<table style="width:100%;border-collapse:collapse;margin:0 0 20px;border-top:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;">${detailRows}</table>`
    : "";

  const button = cta
    ? `<a href="${cta.url}" style="display:inline-block;margin-top:6px;padding:11px 24px;background:#111827;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;font-family:${serif};">${escapeHtml(cta.label)}</a>`
    : "";

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Newsreader:ital,wght@0,400;0,600;1,400&display=swap');
    </style>
  </head>
  <body style="margin:0;padding:24px;background:#f3f4f6;font-family:${serif};">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;overflow:hidden;">
      <div style="padding:24px 32px;border-bottom:2px solid #111827;">
        <p style="margin:0;font-size:24px;font-weight:700;color:#111827;font-family:${serif};letter-spacing:-0.5px;">${escapeHtml(shop.name)}</p>
        <p style="margin:2px 0 0;font-size:12px;font-style:italic;color:#6b7280;font-family:${serif};">${escapeHtml(shop.tagline)}</p>
      </div>
      <div style="padding:28px 32px;">
        <h1 style="margin:0 0 18px;font-size:20px;line-height:1.35;color:#111827;font-weight:700;font-family:${serif};">${escapeHtml(heading)}</h1>
        ${detailsBlock}
        ${paragraphs}
        ${button}
      </div>
      <div style="padding:18px 32px;border-top:1px solid #e5e7eb;background:#fafafa;">
        <p style="margin:0;font-size:11px;line-height:1.6;color:#9ca3af;font-family:${serif};">${escapeHtml(
          [shop.name, shop.address, shop.phone, shop.email]
            .filter(Boolean)
            .join(" · "),
        )}<br/>
        <a href="${SITE_URL}" style="color:#111827;text-decoration:none;">${SITE_URL.replace(/^https?:\/\//, "")}</a></p>
      </div>
    </div>
  </body>
</html>`;
}
