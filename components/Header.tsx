"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { sb } from "@/lib/supabaseBrowser";
import AdminLink from "./AdminLink";
import { UserCircleIcon } from "@heroicons/react/24/solid";
import { AnimatePresence, motion } from "framer-motion";

// 1. Consumer / Main Links (Center Pill)
const consumerLinks = [
  { href: "/consumer", label: "View Deals" },
  { href: "/areas", label: "Areas" },
  { href: "/merchant", label: "For Business" },
];

// 2. Merchant / Partner Links (Separated)
const merchantLinks = [
  { href: "/success-stories", label: "Success Stories" },
  { href: "/merchant-dashboard", label: "Dashboard" },
];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);

  // Close mobile nav on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Auth check
  useEffect(() => {
    const supabase = sb;
    let mounted = true;

    async function loadUser() {
      try {
        const { data } = await supabase.auth.getUser();
        if (!mounted) return;
        setSignedIn(!!data.user);
      } catch {
        if (!mounted) return;
        setSignedIn(false);
      } finally {
        if (mounted) setIsAuthLoading(false);
      }
    }

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(!!session?.user);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const isActive = (href: string) =>
    pathname === href || pathname?.startsWith(href + "/");

  const authLabel = isAuthLoading ? "…" : signedIn ? "Sign out" : "Sign in";

  const handleAuthClick = async () => {
    if (isAuthLoading) return;
    router.push("/signin");
  };

  return (
    <>
      <header
        className="
          fixed top-0 inset-x-0 z-40
          h-[72px]
          border-b border-white/5
          bg-[#0B1210]/60
          backdrop-blur-xl
        "
      >
        <div className="mx-auto max-w-6xl px-4 h-full flex items-center justify-between relative">

          {/* --- LEFT: Logo (& Admin) --- */}
          <div className="flex items-center gap-4 z-20 shrink-0">
            <Link href="/" className="flex items-center group">
              <img
                src="/logo6.png"
                alt="Today's Stash"
                className="h-8 w-auto object-contain transition-transform group-hover:scale-105"
              />
            </Link>

            <div className="hidden lg:block">
              <AdminLink />
            </div>
          </div>

          {/* --- CENTER: "Pill" Navigation (Desktop) --- */}
          <nav className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="
              flex items-center p-1.5 gap-1
              rounded-full
              bg-white/5 border border-white/10
              backdrop-blur-2xl shadow-xl shadow-black/20
            ">
              {consumerLinks.map((link) => {
                const active = isActive(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`
                      relative px-4 py-1.5 rounded-full text-[13px] font-semibold transition-colors z-10
                      ${active ? "text-black" : "text-white/70 hover:text-white"}
                    `}
                  >
                    {active && (
                      <motion.div
                        layoutId="active-pill"
                        className="absolute inset-0 bg-white rounded-full -z-10 shadow-sm"
                        transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                      />
                    )}
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* --- RIGHT: Secondary Actions (Desktop) --- */}
          <div className="hidden md:flex items-center gap-5 z-20 shrink-0">
            {/* Merchant Group */}
            <div className="flex items-center gap-3 pr-4 border-r border-white/10">
              {merchantLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`
                    text-[12px] font-medium transition-colors
                    ${isActive(link.href) ? "text-emerald-400" : "text-white/50 hover:text-white/90"}
                  `}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Auth Button */}
            {signedIn ? (
              <Link
                href="/profile"
                className="flex items-center justify-center text-white/50 hover:text-white transition-colors"
                title="View Profile"
              >
                <UserCircleIcon className="w-8 h-8" />
              </Link>
            ) : (
              <button
                onClick={handleAuthClick}
                disabled={isAuthLoading}
                className="
                  px-4 py-1.5 rounded-full
                  bg-white/5 hover:bg-white/10
                  border border-white/10
                  text-[12px] font-semibold text-white
                  transition-all
                "
              >
                {authLabel}
              </button>
            )}
          </div>

          {/* --- MOBILE: Hamburger Toggle --- */}
          <div className="md:hidden flex items-center gap-3 z-50">
            {/* Small Admin Link for Mobile */}
            <div className="scale-90 opacity-70">
              <AdminLink />
            </div>

            <button
              onClick={() => setOpen(!open)}
              className="p-2 -mr-2 text-white outline-none"
              aria-label="Menu"
            >
              <div className="flex flex-col gap-1.5 w-6">
                <motion.span
                  animate={open ? { rotate: 45, y: 7 } : { rotate: 0, y: 0 }}
                  className="h-0.5 w-full bg-white rounded-full origin-center"
                />
                <motion.span
                  animate={open ? { opacity: 0 } : { opacity: 1 }}
                  className="h-0.5 w-full bg-white rounded-full"
                />
                <motion.span
                  animate={open ? { rotate: -45, y: -7 } : { rotate: 0, y: 0 }}
                  className="h-0.5 w-full bg-white rounded-full origin-center"
                />
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* --- MOBILE: Full Screen Menu --- */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="
              fixed inset-0 z-30 pt-[72px]
              bg-[#0B1210]/95 backdrop-blur-3xl
              flex flex-col
            "
          >
            <div className="flex-1 overflow-y-auto px-6 py-8 space-y-8">

              {/* Section 1: Explore (Consumer) */}
              <div className="space-y-3">
                <p className="text-[11px] uppercase tracking-widest text-white/40 font-semibold pl-1">
                  Explore
                </p>
                <div className="space-y-1">
                  {consumerLinks.map((link, i) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setOpen(false)}
                      className={`
                        block w-full px-4 py-3 rounded-2xl text-lg font-medium transition-colors border
                        ${isActive(link.href)
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                          : "bg-white/5 border-transparent text-white hover:bg-white/10"
                        }
                      `}
                    >
                      {link.label}
                    </Link>
                  ))}
                  {/* Home Link explicitly */}
                  <Link
                    href="/"
                    onClick={() => setOpen(false)}
                    className={`
                        block w-full px-4 py-3 rounded-2xl text-lg font-medium transition-colors border
                        bg-white/5 border-transparent text-white hover:bg-white/10
                      `}
                  >
                    About Today&apos;s Stash
                  </Link>
                </div>
              </div>

              {/* Section 2: Partners & Account */}
              <div className="space-y-3">
                <p className="text-[11px] uppercase tracking-widest text-white/40 font-semibold pl-1">
                  Account & Business
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {merchantLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setOpen(false)}
                      className={`
                        flex items-center justify-center
                        px-3 py-3 rounded-xl text-sm font-medium
                        bg-white/5 border border-white/5 text-white/70
                      `}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>

                <div className="pt-2">
                  {signedIn ? (
                    <Link
                      href="/profile"
                      onClick={() => setOpen(false)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-500 text-white font-semibold"
                    >
                      <UserCircleIcon className="w-5 h-5" />
                      My Profile
                    </Link>
                  ) : (
                    <button
                      onClick={() => {
                        setOpen(false);
                        handleAuthClick();
                      }}
                      className="w-full px-4 py-3 rounded-xl bg-white text-black font-semibold"
                    >
                      Sign In / Sign Up
                    </button>
                  )}
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
