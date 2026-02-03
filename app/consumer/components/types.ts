// app/consumer/components/types.ts

export type Coupon = {
  id: string;
  title: string;
  description: string | null;
  terms: string;
  totalValue: number; // dollars
  imageUrl: string | null;
  merchant: {
    id: string;
    name: string;
    logoUrl: string | null;
    bannerUrl: string | null;
    addressText: string | null;
    townId: string;
    category?: string | null; // Added
    isClosed?: boolean;
    nextOpen?: string;
    closesAt?: string | null;
    operating_hours?: any; // Added for hours display
  } | null;

  usedCount: number; // from offers.redeemed_count
  totalLimit: number | null; // from offers.total_limit (null = unlimited)

  areaKey: string; // internal key for area/town, e.g. "greater-jervis-bay-area"
  areaLabel: string; // human label
  townSlug: string; // Used for subscription checks and redirection
  daysLeft?: number | null;

  // New fields
  price: number | null;
  originalPrice: number | null;
  descriptionMerchant: string | null;
  validFrom: string | null;
  validUntil: string | null;
  collectionWindow: string | null;
  todayStart?: string | null;
  todayEnd?: string | null;
  nextAvailableStart?: string | null; // Calculated next valid start time if currently closed
  nextAvailableEnd?: string | null;
  recurring_schedule?: any[] | null;
};

export type Town = {
  id: string;
  name: string;
  slug: string;

  is_free: boolean | null;
};

export type Step = "instructions" | "success";
