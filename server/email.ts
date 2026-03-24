/**
 * Email service — Resend
 * Sends welcome emails, password reset links, and subscription confirmations.
 */
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const FROM = "HealthContent AI <onboarding@resend.dev>";
const APP_NAME = "HealthContent AI";
const APP_URL = process.env.APP_URL || "https://www.perplexity.ai/computer/a/healthcontent-ai-studio-coHelPIcReuLoOBWcG8bnA";

// ─── Helper ───────────────────────────────────────────────────────────────────

async function send(to: string, subject: string, html: string): Promise<void> {
  if (!resend) {
    console.log(`[email] RESEND_API_KEY not set — would send to ${to}: ${subject}`);
    return;
  }
  try {
    await resend.emails.send({ from: FROM, to, subject, html });
    console.log(`[email] Sent "${subject}" to ${to}`);
  } catch (err) {
    console.error(`[email] Failed to send to ${to}:`, err);
  }
}

// ─── Base template ────────────────────────────────────────────────────────────

function baseTemplate(content: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0e0e12;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:40px 20px;">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#1a1a24;border-radius:16px;border:1px solid #2a2a3a;overflow:hidden;">
        <!-- Header -->
        <tr><td style="padding:32px 40px 24px;border-bottom:1px solid #2a2a3a;">
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="background:#6B5CE7;width:32px;height:32px;border-radius:8px;text-align:center;vertical-align:middle;">
                <span style="color:white;font-size:16px;font-weight:bold;">H</span>
              </td>
              <td style="padding-left:10px;color:#ffffff;font-size:15px;font-weight:600;">HealthContent AI</td>
            </tr>
          </table>
        </td></tr>
        <!-- Content -->
        <tr><td style="padding:32px 40px;">${content}</td></tr>
        <!-- Footer -->
        <tr><td style="padding:20px 40px 32px;border-top:1px solid #2a2a3a;">
          <p style="margin:0;color:#555570;font-size:12px;">
            You're receiving this email because you have an account on ${APP_NAME}.<br>
            © 2026 HealthContent AI. All rights reserved.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Welcome email ────────────────────────────────────────────────────────────

export async function sendWelcomeEmail(to: string, practiceName?: string): Promise<void> {
  const name = practiceName || "there";
  const html = baseTemplate(`
    <h1 style="margin:0 0 8px;color:#ffffff;font-size:24px;font-weight:700;">Welcome to HealthContent AI 🎉</h1>
    <p style="margin:0 0 20px;color:#9090a8;font-size:15px;line-height:1.6;">
      Hi ${name}, your account is all set. You're ready to start creating AI-powered social media content for your practice.
    </p>
    <p style="margin:0 0 8px;color:#c0c0d8;font-size:14px;font-weight:600;">Here's what to do next:</p>
    <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
      ${["Complete your practice setup — upload your logo and brand colors", "Generate your first AI post in under 60 seconds", "Explore the Before & After generator and Video Scripts tool"].map((step, i) => `
        <tr>
          <td style="padding:6px 0;vertical-align:top;">
            <span style="display:inline-block;background:#6B5CE7;color:white;border-radius:50%;width:20px;height:20px;text-align:center;line-height:20px;font-size:11px;font-weight:700;margin-right:10px;">${i + 1}</span>
          </td>
          <td style="padding:6px 0;color:#9090a8;font-size:14px;line-height:1.5;">${step}</td>
        </tr>
      `).join("")}
    </table>
    <a href="${APP_URL}/#/app" style="display:inline-block;background:#6B5CE7;color:white;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;font-weight:600;">Open your dashboard →</a>
  `);
  await send(to, `Welcome to ${APP_NAME} — let's create your first post`, html);
}

// ─── Password reset email ─────────────────────────────────────────────────────

export async function sendPasswordResetEmail(to: string, resetToken: string): Promise<void> {
  const resetUrl = `${APP_URL}/#/reset-password?token=${resetToken}`;
  const html = baseTemplate(`
    <h1 style="margin:0 0 8px;color:#ffffff;font-size:24px;font-weight:700;">Reset your password</h1>
    <p style="margin:0 0 24px;color:#9090a8;font-size:15px;line-height:1.6;">
      We received a request to reset the password for your HealthContent AI account. Click the button below to set a new password.
    </p>
    <a href="${resetUrl}" style="display:inline-block;background:#6B5CE7;color:white;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;font-weight:600;">Reset password →</a>
    <p style="margin:24px 0 0;color:#555570;font-size:13px;line-height:1.6;">
      This link expires in <strong style="color:#9090a8;">1 hour</strong>. If you didn't request a reset, you can safely ignore this email.
    </p>
  `);
  await send(to, `Reset your ${APP_NAME} password`, html);
}

// ─── Subscription confirmation ────────────────────────────────────────────────

export async function sendSubscriptionEmail(to: string, planName: string, isUpgrade: boolean): Promise<void> {
  const action = isUpgrade ? "upgraded to" : "subscribed to";
  const html = baseTemplate(`
    <h1 style="margin:0 0 8px;color:#ffffff;font-size:24px;font-weight:700;">
      ${isUpgrade ? "🚀" : "✅"} You're on the ${planName} plan
    </h1>
    <p style="margin:0 0 24px;color:#9090a8;font-size:15px;line-height:1.6;">
      You've successfully ${action} <strong style="color:#6B5CE7;">${planName}</strong>. Your new features are available immediately.
    </p>
    <a href="${APP_URL}/#/app" style="display:inline-block;background:#6B5CE7;color:white;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;font-weight:600;">Go to dashboard →</a>
    <p style="margin:24px 0 0;color:#555570;font-size:13px;">
      Manage your billing anytime from your account settings.
    </p>
  `);
  await send(to, `${isUpgrade ? "Plan upgraded" : "Subscription confirmed"} — ${planName}`, html);
}
