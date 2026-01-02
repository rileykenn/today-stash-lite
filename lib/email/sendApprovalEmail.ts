// lib/email/sendApprovalEmail.ts
import { Resend } from "resend";

type SendApprovalEmailArgs = {
  to: string; // recipient email
  contactName?: string | null;
  tempPassword?: string | null; // include only when a new user was created
};

function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buildApprovalEmailHtml(args: {
  contactName: string;
  email: string;
  tempPassword?: string | null;
}) {
  const name = escapeHtml(args.contactName || "there");
  const email = escapeHtml(args.email);
  const temp = args.tempPassword ? escapeHtml(args.tempPassword) : null;

  const loginBlock = temp
    ? `
      <div style="margin:16px 0;padding:16px;border:1px solid #e5e7eb;border-radius:12px;background:#fafafa;">
        <div style="font-weight:700;margin-bottom:8px;">Login details</div>
        <div><b>Email:</b> ${email}</div>
        <div><b>Temporary password:</b> <span style="font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;">${temp}</span></div>
        <div style="margin-top:10px;">
          <a href="https://todaysstash.com.au/sign-in" style="display:inline-block;padding:10px 14px;border-radius:10px;background:#111827;color:#ffffff;text-decoration:none;font-weight:700;">
            Sign in
          </a>
        </div>
        <div style="margin-top:10px;color:#6b7280;font-size:13px;">
          For security reasons, you’ll be asked to set a new password after signing in.
        </div>
      </div>
    `
    : `
      <div style="margin:16px 0;padding:16px;border:1px solid #e5e7eb;border-radius:12px;background:#fafafa;">
        <div style="font-weight:700;margin-bottom:8px;">Sign in</div>
        <div><b>Email:</b> ${email}</div>
        <div style="margin-top:10px;">
          <a href="https://todaysstash.com.au/sign-in" style="display:inline-block;padding:10px 14px;border-radius:10px;background:#111827;color:#ffffff;text-decoration:none;font-weight:700;">
            Sign in
          </a>
        </div>
      </div>
    `;

  return `
  <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;line-height:1.45;color:#111827;">
    <h2 style="margin:0 0 12px;">Your Today’s Stash application has been approved 🎉</h2>

    <p style="margin:0 0 12px;">Hi ${name},</p>

    <p style="margin:0 0 12px;">
      Great news — your business has been approved to join Today’s Stash 🎉
    </p>

    <p style="margin:0 0 12px;">
      We’ve created your merchant account so you can start managing your presence on the platform.
    </p>

    ${loginBlock}

    <div style="margin:18px 0;padding:16px;border:1px solid #e5e7eb;border-radius:12px;">
      <div style="font-weight:700;margin-bottom:8px;">Accessing your Merchant Dashboard</div>
      <div>Once you’re signed in:</div>
      <ol style="margin:8px 0 0 18px;padding:0;">
        <li>Go to the <b>Merchant Dashboard</b></li>
        <li>From there, you can:</li>
      </ol>
      <ul style="margin:8px 0 0 18px;">
        <li>Print your unique QR code</li>
        <li>Create and manage deals</li>
        <li>View your business details</li>
      </ul>
    </div>

    <div style="margin:18px 0;padding:16px;border:1px solid #e5e7eb;border-radius:12px;">
      <div style="font-weight:700;margin-bottom:8px;">Need help or have questions?</div>
      <div style="margin-bottom:10px;">
        For general support or enquiries:
        <a href="https://todaysstash.com.au/contactsupport">todaysstash.com.au/contactsupport</a>
      </div>
      <div>Or contact us directly:</div>
      <ul style="margin:8px 0 0 18px;">
        <li>Adrian — <a href="mailto:adrian@todaysstash.com.au">adrian@todaysstash.com.au</a></li>
        <li>Riley (technical support) — <a href="mailto:riley@todaysstash.com.au">riley@todaysstash.com.au</a></li>
      </ul>
    </div>

    <p style="margin:16px 0 0;">
      We’re excited to have you onboard and look forward to working with you.
    </p>
    <p style="margin:6px 0 0;">
      Welcome to Today’s Stash,<br/>
      <b>The Today’s Stash Team</b>
    </p>

    <hr style="margin:22px 0;border:none;border-top:1px solid #e5e7eb;" />
    <p style="margin:0;color:#6b7280;font-size:12px;">
      Please do not reply to this email. Use the support link above if you need help.
    </p>
  </div>
  `;
}

export async function sendApprovalEmail({
  to,
  contactName,
  tempPassword,
}: SendApprovalEmailArgs) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY missing");

  const resend = new Resend(apiKey);

  const subject = "Your Today’s Stash application has been approved 🎉";

  const html = buildApprovalEmailHtml({
    contactName: contactName || "there",
    email: to,
    tempPassword: tempPassword || null,
  });

  const { data, error } = await resend.emails.send({
    from: "Today’s Stash <noreply@todaysstash.com.au>",
    to,
    subject,
    html,
    replyTo: "adrian@todaysstash.com.au", // optional; you can remove if you truly want no replies
  });

  if (error) {
    throw new Error(error.message || "Failed to send approval email");
  }

  return data;
}
