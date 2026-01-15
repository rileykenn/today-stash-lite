import { Resend } from "resend";

export async function sendVerificationEmail(email: string, link: string) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
        console.error("RESEND_API_KEY missing");
        return;
    }

    const resend = new Resend(apiKey);

    const html = `
    <div style="font-family: sans-serif; color: #111;">
      <h1>Verify your email</h1>
      <p>Click the link below to verify your email address for Today's Stash.</p>
      <a href="${link}" style="display: inline-block; background: #10b981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Verify Email</a>
      <p style="margin-top: 20px; color: #666; font-size: 12px;">If you didn't request this, please ignore this email.</p>
    </div>
  `;

    await resend.emails.send({
        from: "Today’s Stash <noreply@todaysstash.com.au>",
        to: email,
        subject: "Verify your email",
        html,
    });
}
