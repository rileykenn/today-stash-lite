import { Resend } from "resend";

export async function sendPasswordResetEmail(email: string, code: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("RESEND_API_KEY missing");
    return;
  }

  const resend = new Resend(apiKey);

  const html = `
    <div style="font-family: sans-serif; color: #111;">
      <h1>Reset your password</h1>
      <p>Here is your verification code to reset your password for Today's Stash:</p>
      <div style="background: #f4f4f5; padding: 24px; border-radius: 12px; text-align: center; margin: 24px 0;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #10b981;">${code}</span>
      </div>
      <p style="color: #666; font-size: 14px;">This code will expire in 15 minutes.</p>
      <p style="margin-top: 20px; color: #666; font-size: 12px;">If you didn't request this, please ignore this email.</p>
    </div>
  `;

  await resend.emails.send({
    from: "Today’s Stash <noreply@todaysstash.com.au>",
    to: email,
    subject: "Your password reset code",
    html,
  });
}

