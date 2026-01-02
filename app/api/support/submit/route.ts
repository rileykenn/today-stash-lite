import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

type Body = {
  name: string;
  email: string;
  phone?: string | null;
  type?: string | null;
  topic?: string | null;
  message: string;
};

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

function buildSupportAutoReplyHtml(args: {
  name: string;
  email: string;
  message: string;
}) {
  const name = escapeHtml(args.name);
  const msg = escapeHtml(args.message).replaceAll("\n", "<br/>");

  return `
  <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;line-height:1.5;color:#111827;">
    <h2>We got your message ✅</h2>

    <p>Hey ${name},</p>

    <p>
      Thanks for contacting Today’s Stash support — we’ve received your request
      and a member of our team will get back to you shortly.
    </p>

    <div style="margin:16px 0;padding:16px;border:1px solid #e5e7eb;border-radius:12px;background:#fafafa;">
      <strong>Your message:</strong>
      <div style="margin-top:8px;">${msg}</div>
    </div>

    <p>
      If you need to add more details, you can submit another request here:<br/>
      <a href="https://todaysstash.com.au/contactsupport">
        todaysstash.com.au/contactsupport
      </a>
    </p>

    <p>
      Cheers,<br/>
      <strong>Today’s Stash Support</strong>
    </p>

    <hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb;" />
    <p style="font-size:12px;color:#6b7280;">
      This is an automated confirmation email.
    </p>
  </div>
  `;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;

    const name = body.name?.trim();
    const email = body.email?.trim();
    const message = body.message?.trim();

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "Missing name, email, or message" },
        { status: 400 }
      );
    }

    const supabase = serverClient();

    // 1) Save support request
    const { error: insertErr } = await supabase
      .from("support_requests")
      .insert({
        name,
        email,
        phone: body.phone || null,
        type: body.type || "support",
        topic: body.topic || null,
        message,
      });

    if (insertErr) {
      return NextResponse.json(
        { error: insertErr.message || "Failed to save support request" },
        { status: 500 }
      );
    }

    // 2) Send confirmation email (never block success)
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);

      await resend.emails.send({
        from: "Today’s Stash <noreply@todaysstash.com.au>",
        to: email,
        subject: "We received your support request ✅",
        html: buildSupportAutoReplyHtml({ name, email, message }),
        replyTo: "riley@todaysstash.com.au",
      });
    } catch (e) {
      console.error("Support confirmation email failed:", e);
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}
