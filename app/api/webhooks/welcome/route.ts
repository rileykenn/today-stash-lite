import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

/**
 * Supabase Database Webhook -> Next.js route
 * Trigger: INSERT on public.profiles
 *
 * We do idempotency using `welcome_email_sent_at` column on profiles
 * (recommended) so we never double-send.
 */

function serverClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing");
  return createClient(url, key, { auth: { persistSession: false } });
}

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buildWelcomeEmailHtml(args: { name?: string | null }) {
  const name = (args.name || "").trim();
  const hi = name ? `Hey ${escapeHtml(name)},` : "Hey there,";

  return `
  <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;line-height:1.5;color:#111827;">
    <h2>Welcome to Today’s Stash 🎉</h2>
    <p>${hi}</p>
    <p>
      Your account is ready. You can sign in anytime and start using the app.
    </p>

    <div style="margin:16px 0;padding:16px;border:1px solid #e5e7eb;border-radius:12px;background:#fafafa;">
      <p style="margin:0 0 10px;"><strong>Where to go next:</strong></p>
      <ul style="margin:0;padding-left:18px;">
        <li>Browse deals: <a href="https://todaysstash.com.au/consumer">todaysstash.com.au/consumer</a></li>
        <li>Need help? <a href="https://todaysstash.com.au/contactsupport">todaysstash.com.au/contactsupport</a></li>
      </ul>
    </div>

    <p>
      If you ever need support, email
      <strong>Adrian@todaysstash.com.au</strong> or <strong>riley@todaysstash.com.au</strong> (technical support).
    </p>

    <p>Cheers,<br/><strong>Today’s Stash Team</strong></p>
    <hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb;" />
    <p style="font-size:12px;color:#6b7280;">This is an automated welcome email.</p>
  </div>
  `;
}

type SupabaseWebhookPayload = {
  type?: string; // "INSERT"
  table?: string; // "profiles"
  schema?: string; // "public"
  record?: {
    user_id?: string;
    email?: string | null;
    full_name?: string | null;
    name?: string | null;
    welcome_email_sent_at?: string | null;
  };
};

export async function POST(req: Request) {
  try {
    // 1) Verify webhook secret (so random people can't spam your email sender)
    const secret = process.env.WELCOME_WEBHOOK_SECRET;
    if (!secret) throw new Error("WELCOME_WEBHOOK_SECRET missing");

    const got = req.headers.get("x-webhook-secret");
    if (got !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2) Parse payload
    const payload = (await req.json()) as SupabaseWebhookPayload;
    const r = payload?.record;

    const userId = (r?.user_id || "").trim();
    const email = (r?.email || "").trim();

    if (!userId || !email) {
      return NextResponse.json({ error: "Missing user_id or email in webhook payload" }, { status: 400 });
    }

    // 3) Idempotency check using DB (recommended)
    const supabase = serverClient();

    const { data: profile, error: profErr } = await supabase
      .from("profiles")
      .select("user_id,email,full_name,welcome_email_sent_at")
      .eq("user_id", userId)
      .single();

    if (profErr || !profile) {
      return NextResponse.json({ error: profErr?.message || "Profile not found" }, { status: 404 });
    }

    if (profile.welcome_email_sent_at) {
      // already sent, do nothing
      return NextResponse.json({ ok: true, skipped: true, reason: "Already sent" });
    }

    // 4) Send email
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) throw new Error("RESEND_API_KEY missing");

    const resend = new Resend(resendKey);

    const name = (profile.full_name || "").trim() || undefined;

    const { error: sendErr } = await resend.emails.send({
      from: "Today’s Stash <noreply@todaysstash.com.au>",
      to: email,
      subject: "Welcome to Today’s Stash 🎉",
      html: buildWelcomeEmailHtml({ name }),
      replyTo: "support@todaysstash.com.au",
    });

    if (sendErr) {
      return NextResponse.json({ error: sendErr.message || "Failed to send email" }, { status: 500 });
    }

    // 5) Mark as sent (prevents duplicates forever)
    const { error: updErr } = await supabase
      .from("profiles")
      .update({ welcome_email_sent_at: new Date().toISOString() })
      .eq("user_id", userId);

    if (updErr) {
      // email is sent, but we failed to mark it—log it
      console.error("Failed to set welcome_email_sent_at:", updErr.message);
      return NextResponse.json({ ok: true, warned: true, warning: "Email sent but could not mark sent_at" });
    }

    return NextResponse.json({ ok: true, sent: true });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
