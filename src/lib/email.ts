import { SHOP, SITE_URL } from "@/lib/config";

// Transactional email via Resend's HTTP API (no SDK needed).
// Silently disabled until RESEND_API_KEY is set, so every call site can
// fire-and-forget without caring whether email is configured.

type EmailInput = {
  to: string;
  subject: string;
  heading: string;
  lines: string[];
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
  cta,
}: EmailInput): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;

  const from = process.env.EMAIL_FROM ?? `${SHOP.name} <onboarding@resend.dev>`;

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
        html: renderHtml({ heading, lines, cta }),
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

function renderHtml({
  heading,
  lines,
  cta,
}: Pick<EmailInput, "heading" | "lines" | "cta">) {
  const paragraphs = lines
    .map(
      (line) =>
        `<p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#404040;">${escapeHtml(line)}</p>`,
    )
    .join("");

  const button = cta
    ? `<a href="${cta.url}" style="display:inline-block;margin-top:8px;padding:10px 22px;border-radius:10px;background:#2563eb;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;">${escapeHtml(cta.label)}</a>`
    : "";

  return `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f5f5f5;font-family:Helvetica,Arial,sans-serif;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e5e5e5;border-radius:16px;overflow:hidden;">
      <div style="background:#2563eb;padding:20px 28px;">
        <p style="margin:0;font-size:18px;font-weight:700;color:#ffffff;">${escapeHtml(SHOP.name)}</p>
        <p style="margin:2px 0 0;font-size:11px;color:#dbeafe;">Fix. Track. Trust.</p>
      </div>
      <div style="padding:28px;">
        <h1 style="margin:0 0 16px;font-size:18px;color:#171717;">${escapeHtml(heading)}</h1>
        ${paragraphs}
        ${button}
      </div>
      <div style="padding:16px 28px;border-top:1px solid #e5e5e5;">
        <p style="margin:0;font-size:11px;color:#a3a3a3;">${escapeHtml(SHOP.name)} · ${escapeHtml(SHOP.city)} · ${escapeHtml(SHOP.phone)}<br/>
        <a href="${SITE_URL}" style="color:#2563eb;text-decoration:none;">${SITE_URL.replace(/^https?:\/\//, "")}</a></p>
      </div>
    </div>
  </body>
</html>`;
}
