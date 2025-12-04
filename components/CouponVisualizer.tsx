/* eslint-disable @next/next/no-img-element */

type ExampleDeal = {
  id: string;
  title: string;
  merchantName: string;
  totalValue: number; // savings $
  used: number;
  total: number;
  daysLabel?: string | null;
  imageUrl?: string | null;
};

function fmtMoney(v: number) {
  const n = Number.isFinite(v) ? v : 0;
  const needsCents = n % 1 !== 0;
  const core = n.toLocaleString(undefined, {
    minimumFractionDigits: needsCents ? 2 : 0,
    maximumFractionDigits: 2,
  });
  return `$${core}`;
}

// These are JUST EXAMPLES for the visualiser
const EXAMPLE_DEALS: ExampleDeal[] = [
  {
    id: "1",
    title: "Locals’ lunch: main + drink for $22",
    merchantName: "Sussex Inlet Bistro",
    totalValue: 28, // e.g. save $28 off full value
    used: 18,
    total: 40,
    daysLabel: "3 days left",
    imageUrl: null,
  },
  {
    id: "2",
    title: "Tuesdays: $25 off colour + free brow shape",
    merchantName: "Glow Hair Studio",
    totalValue: 25,
    used: 9,
    total: 20,
    daysLabel: "Today only",
    imageUrl: null,
  },
  {
    id: "3",
    title: "Intro Reformer Pack: 2-for-1 first session",
    merchantName: "Harbour Pilates Studio",
    totalValue: 35,
    used: 4,
    total: 15,
    daysLabel: "7 days left",
    imageUrl: null,
  },
];

type Props = {
  className?: string;
};

export default function CouponVisualizer({ className = "" }: Props) {
  return (
    <div
      className={`
        rounded-3xl border border-white/10 bg-[#0D151E]/80
        p-4 sm:p-5 shadow-[0_20px_60px_rgba(0,0,0,0.65)]
        ${className}
      `}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300/90">
        Example view
      </p>
      <p className="mt-1 text-sm text-white/80">
        This is how your offers appear inside Today’s Stash — clean, simple
        cards that feel premium to locals and easy for staff to understand.
      </p>

      <ul className="mt-4 space-y-4">
        {EXAMPLE_DEALS.map((deal) => (
          <li key={deal.id}>
            <ExampleDealCard deal={deal} />
          </li>
        ))}
      </ul>
    </div>
  );
}

/* --------------------------------
   Example deal card (borrowed look
   from the consumer CouponTicket)
   -------------------------------- */

function ExampleDealCard({ deal }: { deal: ExampleDeal }) {
  const { title, merchantName, totalValue, imageUrl, used, total, daysLabel } =
    deal;

  const safeUsed = Math.max(0, used || 0);
  const safeTotal = Math.max(1, total || 1);
  const left = Math.max(0, safeTotal - safeUsed);
  const usedPct = Math.min(100, (safeUsed / safeTotal) * 100);

  return (
    <article className="relative overflow-hidden rounded-2xl bg-[#13202B] ring-1 ring-white/10 shadow-md min-w-0">
      {/* Ribbon */}
      {Number.isFinite(totalValue) && totalValue > 0 && (
        <div className="absolute left-0 top-0 z-20 pointer-events-none select-none">
          <div className="absolute -left-7 top-4 w-[120px] -rotate-45 rounded-sm bg-gradient-to-b from-[#e79727] to-[#e5cc4f] py-0.5 text-center text-[10px] font-extrabold text-white shadow-[0_2px_6px_rgba(0,0,0,0.5)]">
            SAVE {fmtMoney(totalValue)}
          </div>
        </div>
      )}

      {/* “Redeem” pill just for visual (not clickable) */}
      <div className="absolute bottom-3 right-3 rounded-full px-3 py-1 text-[11px] font-semibold text-white bg-emerald-500/90 shadow-[0_0_8px_rgba(16,185,129,0.3)]">
        Redeem in store
      </div>

      {/* Layout: image + text */}
      <div className="grid grid-cols-[80px_minmax(0,1fr)] gap-3 p-3 min-w-0">
        {/* Image */}
        <div className="w-20 h-20 overflow-hidden rounded-xl bg-white/5">
          {imageUrl ? (
            <img src={imageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center text-[11px] text-white/60 px-2 text-center">
              Venue photo
            </div>
          )}
        </div>

        {/* Text and progress */}
        <div className="min-w-0">
          <h3 className="block w-full min-w-0 text-[16px] font-extrabold leading-snug text-white">
            {title}
          </h3>

          {merchantName && (
            <p className="mt-0.5 block w-full min-w-0 truncate text-[13px] text-white/70">
              {merchantName}
            </p>
          )}

          <div className="mt-2 mr-[140px]">
            <p className="text-[12px] text-white/60">
              Used: {safeUsed} • Left: {left}
              {daysLabel && <> • {daysLabel}</>}
            </p>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${usedPct}%`,
                  backgroundImage:
                    "linear-gradient(to right, #10B981 0%, #84CC16 35%, #F59E0B 60%, #FB923C 80%, #EF4444 100%)",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
