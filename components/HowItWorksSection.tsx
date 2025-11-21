// components/HowItWorksSection.tsx
"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

const PHONE_DISCOVER_URL =
  "https://ufxmucwtywfavsmorkpr.supabase.co/storage/v1/object/public/Home-page-content/Phones/Discoverlocaloffers.png";

const PHONE_REDEEM_URL =
  "https://ufxmucwtywfavsmorkpr.supabase.co/storage/v1/object/public/Home-page-content/Phones/redeeminstore.png";

const fadeLeft = {
  hidden: { opacity: 0, x: -40 },
  visible: { opacity: 1, x: 0 },
};

const fadeRight = {
  hidden: { opacity: 0, x: 40 },
  visible: { opacity: 1, x: 0 },
};

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0 },
};

export default function HowItWorksSection() {
  return (
    <section className="mt-12 space-y-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold sm:text-2xl">
            How Today’s Stash works
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-white/75">
            We connect people with real, in-store offers from local businesses,
            redeemed with a simple scan of the merchant’s counter QR code.
            Simple for customers, powerful for venues.
          </p>
        </div>

        <Link
          href="/success-stories"
          className="inline-flex items-center justify-center rounded-full border border-white/18 bg-white/5 px-4 py-2 text-xs font-semibold text-white/85 shadow-sm transition hover:border-emerald-400/70 hover:bg-emerald-500/10"
        >
          Read our success stories
          <span className="ml-1 text-sm">↗</span>
        </Link>
      </header>

      <div className="space-y-16">
        {/* STEP 1 - Discover local offers */}
        <motion.article
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="grid items-center gap-8 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]"
        >
          <motion.div variants={fadeLeft} className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
              01 • Discover local offers
            </p>
            <h3 className="text-lg font-semibold">
              Explore the best local deals near you.
            </h3>
            <p className="text-sm leading-relaxed text-white/80">
              Open Today’s Stash in your browser and instantly see what’s
              available around town – from cafés and takeaway to gyms, beauty,
              retail and more. Every offer is created in partnership with local
              businesses, so you’re not chasing fake discounts or old promos.
            </p>
            <ul className="mt-3 space-y-1.5 text-sm text-white/80">
              <li>• Filter by category, distance and type of offer.</li>
              <li>• See how many redemptions are left in real time.</li>
              <li>• Favourite the places you love and watch for new deals.</li>
            </ul>
          </motion.div>

          <motion.div
            variants={fadeRight}
            className="relative flex justify-center md:justify-end"
          >
            <div className="relative w-full max-w-sm">
              {/* soft glows behind phone */}
              <div className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full bg-emerald-500/18 blur-3xl" />
              <div className="pointer-events-none absolute -right-6 bottom-0 h-32 w-32 rounded-full bg-sky-500/14 blur-3xl" />

              {/* phone image with NO solid background */}
              <div className="relative flex items-center justify-center">
                <Image
                  src={PHONE_DISCOVER_URL}
                  alt="Today’s Stash discover local offers screen"
                  width={640}
                  height={640}
                  priority
                  className="h-auto w-full max-w-xs object-contain md:max-w-sm"
                />
              </div>
            </div>
          </motion.div>
        </motion.article>

        {/* STEP 2 - Redeem in-store */}
        <motion.article
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.05 }}
          className="grid items-center gap-8 md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]"
        >
          <motion.div
            variants={fadeLeft}
            className="order-2 space-y-3 md:order-1"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
              02 • Redeem in-store
            </p>
            <h3 className="text-lg font-semibold">
              Scan the business’s QR code at the counter.
            </h3>
            <p className="text-sm leading-relaxed text-white/80">
              When you’re ready to use an offer, tap{" "}
              <span className="font-semibold">“Redeem in Store”</span> and scan
              the merchant’s Today’s Stash QR code on their counter. Your phone
              confirms the offer and store and logs the redemption instantly –
              no staff touching your phone, no codes to type.
            </p>
            <ul className="mt-3 space-y-1.5 text-sm text-white/80">
              <li>• One QR code per business – it works for all of their deals.</li>
              <li>• Redemption completes automatically on your phone.</li>
              <li>• Every redemption is tracked for the merchant in real time.</li>
              <li>• Works from your browser – no app download needed.</li>
            </ul>
          </motion.div>

          <motion.div
            variants={fadeRight}
            className="order-1 relative flex justify-center md:order-2 md:justify-start"
          >
            <div className="relative w-full max-w-sm">
              {/* soft glows behind phone */}
              <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-emerald-500/20 blur-3xl" />
              <div className="pointer-events-none absolute -left-6 bottom-0 h-32 w-32 rounded-full bg-indigo-500/14 blur-3xl" />

              {/* phone image with NO solid background */}
              <div className="relative flex items-center justify-center">
                <Image
                  src={PHONE_REDEEM_URL}
                  alt="Today’s Stash redeem in-store QR code screen"
                  width={640}
                  height={640}
                  className="h-auto w-full max-w-xs object-contain md:max-w-sm"
                />
              </div>
            </div>
          </motion.div>
        </motion.article>

        {/* STEP 3 - Win-win */}
        <motion.article
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.05 }}
          variants={fadeUp}
          className="rounded-3xl border border-white/10 bg:white/5 bg-white/5 px-5 py-6 text-center text-sm leading-relaxed text-white/80 backdrop-blur sm:px-8 sm:py-7"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
            03 • A genuine win-win
          </p>
          <h3 className="mt-2 text-lg font-semibold text-white">
            You save money. Local businesses fill more tables.
          </h3>
          <p className="mt-3 mx-auto max-w-2xl">
            Today’s Stash is designed so everyone wins. You get real savings at
            the places you want to support, while venues use smart offers
            powered by a simple counter QR code to fill quiet times, reward
            regulars and reach new customers — without slashing their brand or
            margins.
          </p>
        </motion.article>
      </div>
    </section>
  );
}
