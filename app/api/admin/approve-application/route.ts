// app/api/admin/approve-application/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendApprovalEmail } from "@/lib/email/sendApprovalEmail";

type Body = {
  applicationId: string;
  townId: string;
  category:
    | "Cafe & Bakery"
    | "Financial"
    | "Fitness"
    | "Hair & Beauty"
    | "Mechanical"
    | "Miscellaneous"
    | "Pet Care"
    | "Photography"
    | "Recreation";
};

function serverClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing");
  return createClient(url, key, { auth: { persistSession: false } });
}

async function findUserIdByEmail(supabase: ReturnType<typeof serverClient>, email: string) {
  // small userbase => simple paging search
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    const hit = data.users.find((u) => (u.email || "").toLowerCase() === email.toLowerCase());
    if (hit) return hit.id;
    if (data.users.length < 200) break;
  }
  return null;
}

function makeTempPassword() {
  // strong but copyable
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  let out = "";
  for (let i = 0; i < 14; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export async function POST(req: Request) {
  try {
    const supabase = serverClient();
    const body = (await req.json()) as Body;

    if (!body?.applicationId || !body?.townId || !body?.category) {
      return NextResponse.json(
        { error: "Missing applicationId, townId, or category" },
        { status: 400 }
      );
    }

    // 1) Load application
    const { data: app, error: appErr } = await supabase
      .from("applications")
      .select("id,business_name,address,email,phone,status,contact_name")
      .eq("id", body.applicationId)
      .single();

    if (appErr || !app) {
      return NextResponse.json(
        { error: appErr?.message || "Application not found" },
        { status: 404 }
      );
    }

    const email = (app.email || "").trim();
    const phone = (app.phone || "").trim();
    const businessName = (app.business_name || "").trim();
    const streetAddress = (app.address || "").trim();
    const contactName = (app as any).contact_name ? String((app as any).contact_name).trim() : "";

    if (!email) return NextResponse.json({ error: "Application missing email" }, { status: 400 });
    if (!businessName) return NextResponse.json({ error: "Application missing business_name" }, { status: 400 });
    if (!streetAddress) return NextResponse.json({ error: "Application missing address" }, { status: 400 });

    // 2) Create/find auth user
    let userId: string | null = await findUserIdByEmail(supabase, email);
    let createdNewUser = false;
    let tempPassword: string | null = null;

    if (!userId) {
      tempPassword = makeTempPassword();
      const { data: created, error: createErr } = await supabase.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        phone: phone || undefined,
        phone_confirm: phone ? true : undefined,
      });

      if (createErr || !created?.user?.id) {
        return NextResponse.json(
          { error: createErr?.message || "Failed to create user" },
          { status: 500 }
        );
      }

      userId = created.user.id;
      createdNewUser = true;
    }

    // 3) Create merchant
    const { data: merchant, error: merchErr } = await supabase
      .from("merchants")
      .insert({
        name: businessName,
        street_address: streetAddress,
        category: body.category,
        town_id: body.townId,
        // merchant_pin auto default in DB
      })
      .select("id")
      .single();

    if (merchErr || !merchant?.id) {
      return NextResponse.json(
        { error: merchErr?.message || "Failed to create merchant" },
        { status: 500 }
      );
    }

    const merchantId = merchant.id as string;

    // 4) Upsert profile link
    const { error: profErr } = await supabase
      .from("profiles")
      .upsert(
        {
          user_id: userId,
          email,
          role: "merchant",
          merchant_id: merchantId,
        },
        { onConflict: "user_id" }
      );

    if (profErr) {
      return NextResponse.json(
        { error: profErr.message || "Failed to update profile" },
        { status: 500 }
      );
    }

    // 5) Update application status
    const { error: updErr } = await supabase
      .from("applications")
      .update({ status: "approved" })
      .eq("id", body.applicationId);

    if (updErr) {
      return NextResponse.json(
        { error: updErr.message || "Failed to update application" },
        { status: 500 }
      );
    }

    // 6) Send approval email (do NOT fail the approval if email fails)
    let emailSent = false;
    let emailError: string | null = null;

    try {
      await sendApprovalEmail({
        to: email,
        contactName: contactName || email,
        tempPassword: createdNewUser ? tempPassword : null,
      });
      emailSent = true;
    } catch (e: any) {
      console.error("Approval email failed:", e?.message || e);
      emailSent = false;
      emailError = e?.message || String(e);
    }

    return NextResponse.json({
      ok: true,
      createdNewUser,
      // TEMP: keep returning tempPassword until you've verified email sending.
      // After you confirm, delete this line + stop showing it in the client UI.
      tempPassword,
      userId,
      merchantId,
      emailSent,
      emailError,
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
