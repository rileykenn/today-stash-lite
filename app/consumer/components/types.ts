// app/consumer/components/types.ts

export type Coupon = {
  id: string;
  title: string;
  terms: string;
  totalValue: number; // dollars
  imageUrl: string | null;
  merchant: {
    name: string;
    logoUrl: string | null;
    addressText: string | null;
  } | null;

  usedCount: number; // from offers.redeemed_count
  totalLimit: number | null; // from offers.total_limit (null = unlimited)

  areaKey: string; // internal key for area/town, e.g. "greater-jervis-bay-area"
  areaLabel: string; // human label

  daysLeft?: number | null;
};

export type Town = {
  id: string;
  name: string;
  slug: string;
  access_code: string | null;
  is_free: boolean | null;
};

export type Step = "instructions" | "success";
