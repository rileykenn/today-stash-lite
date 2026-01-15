import { Resend } from "resend";

export async function sendPasswordChangedEmail(email: string) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
        console.error("RESEND_API_KEY missing");
        return;
    }

    const resend = new Resend(apiKey);

    const html = `
    <div style="font-family: sans-serif; color: #111;">
      <h1>Password Changed Successfully</h1>
      <p>Your password for Today's Stash has been changed.</p>
      <p>If you did not make this change, please contact support immediately.</p>
      <p style="margin-top: 20px; color: #666; font-size: 12px;">Today's Stash Team</p>
    </div>
  `;

    await resend.emails.send({
        from: "Today’s Stash <noreply@todaysstash.com.au>",
        to: email,
        subject: "Password Changed Successfully",
        html,
    });
}
