// app/consumer/components/helpers.ts

/* =======================
   URL helpers
   ======================= */

export function isAbsoluteUrl(u: string) {
  return /^https?:\/\//i.test(u);
}

export function resolvePublicUrl(
  maybePath: string | null,
  bucket = "offer-media"
): string | null {
  if (!maybePath) return null;

  const trimmed = String(maybePath).trim();
  if (!trimmed) return null;

  if (isAbsoluteUrl(trimmed)) return trimmed;

  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/+$/, "");
  return `${base}/storage/v1/object/public/${bucket}/${trimmed.replace(
    /^\/+/,
    ""
  )}`;
}

/* =======================
   Data helpers
   ======================= */

export function firstOrNull<T>(
  val: T | T[] | null | undefined
): T | null {
  if (!val) return null;
  return Array.isArray(val) ? val[0] ?? null : val;
}

export function getMerchantName(m: unknown): string {
  const mm = m as Record<string, unknown>;
  return (mm?.name ??
    mm?.display_name ??
    mm?.title ??
    "") as string;
}

export function getMerchantLogo(m: unknown): string | null {
  const mm = m as Record<string, unknown>;
  return (
    (mm?.logo_url as string | null | undefined) ??
    (mm?.photo_url as string | null | undefined) ??
    (mm?.image_url as string | null | undefined) ??
    (mm?.avatar_url as string | null | undefined) ??
    (mm?.logo as string | null | undefined) ??
    (mm?.photo as string | null | undefined) ??
    null
  );
}

export function getMerchantAddress(m: unknown): string | null {
  const mm = m as Record<string, unknown>;
  return (mm?.address_text ??
    mm?.address ??
    mm?.location ??
    null) as string | null;
}

/* =======================
   Formatting helpers
   ======================= */

export function fmtMoney(v: number) {
  const n = Number.isFinite(v) ? v : 0;
  const needsCents = n % 1 !== 0;

  const core = n.toLocaleString(undefined, {
    minimumFractionDigits: needsCents ? 2 : 0,
    maximumFractionDigits: 2,
  });

  return `$${core}`;
}

/* =======================
   Date helpers (Sydney)
   ======================= */

// Convert a Date to the Sydney calendar date at UTC midnight
export function getSydneyDateUTC(d: Date): Date {
  const fmt = new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Sydney",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = fmt.formatToParts(d);
  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const day = Number(parts.find((p) => p.type === "day")?.value);

  return new Date(Date.UTC(year, month - 1, day));
}

export function getSydneyToday(): Date {
  return getSydneyDateUTC(new Date());
}
