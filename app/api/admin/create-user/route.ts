import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs"; // ensure this never runs on edge

function generateTempPassword(len = 14) {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$";
  let out = "";
  for (let i = 0; i < len; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body?.email || "").trim().toLowerCase();
    const phone = String(body?.phone || "").trim();

    if (!email) {
      return NextResponse.json(
        { ok: false, error: "Missing email" },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Server misconfigured: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing",
        },
        { status: 500 }
      );
    }

    const sb = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const tempPassword = generateTempPassword();

    const payload: any = {
      email,
      password: tempPassword,
      email_confirm: true, // bypass email verification
      user_metadata: {
        created_from: "application_approval",
      },
    };

    // Attach phone if provided (for future SMS notifications)
    if (phone) {
      payload.phone = phone;
      payload.phone_confirm = true; // bypass phone verification
    }

    const { data, error } = await sb.auth.admin.createUser(payload);

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      user_id: data.user?.id,
      email: data.user?.email,
      phone: data.user?.phone ?? null,
      tempPassword, // returned ONLY so you can test; remove later
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        error: e?.message ? String(e.message) : String(e),
      },
      { status: 500 }
    );
  }
}
