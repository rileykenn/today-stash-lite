"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { sb } from "@/lib/supabaseBrowser";
import AdminLink from "./AdminLink"; // adjust path if needed

// Main top-level links (no invitations here)
const navLinks = [
  { href: "/", label: "What is Today’s Stash?" },
  { href: "/merchant", label: "For businesses" },
  { href: "/success-stories", label: "Success Stories" },
  { href: "/consumer", label: "View Deals" },
  { href: "/merchant-dashboard", label: "Merchant Dashboard" },
];

// Invitation / promo areas
const invitationLinks = [
  { href: "/invitations/sussex-inlet", label: "Sussex Inlet" },
  { href: "/invitations/melbourne", label: "Melbourne" },
  { href: "/invitations/westfield-doncaster", label: "Westfield Doncaster" },
];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();

  const [open, setOpen] = useState(false); // mobile nav open
  const [areasOpen, setAreasOpen] = useState(false); // desktop dropdown
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);

  // Close mobile nav & dropdown on route change
  useEffect(() => {
    setOpen(false);
    setAreasOpen(false);
  }, [pathname]);

  // Supabase auth state
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

  const isInvitationActive = invitationLinks.some((l) => isActive(l.href));

  const authLabel = isAuthLoading ? "…" : signedIn ? "Sign out" : "Sign in";

  const handleAuthClick = async () => {
    if (isAuthLoading) return;

    const supabase = sb;

    if (!signedIn) {
      router.push("/signin");
      return;
    }

    await supabase.auth.signOut();
    router.refresh();
  };

  return (
    <header
      className="
        sticky top-0 z-40
        border-b border-white/5
        bg-gradient-to-b from-[#0B1210]/80 via-[#0B1210]/60 to-[#0B1210]/30
        backdrop-blur-xl
      "
    >
      <div className="mx-auto max-w-5xl px-4">
        {/* TOP ROW */}
        <div className="flex h-14 items-center">
          {/* LEFT: Admin link */}
          <div className="flex-1">
            <span className="hidden sm:inline text-[11px] text-white/60">
              <AdminLink />
            </span>
          </div>

          {/* LOGO */}
          <div className="flex-1 flex justify-center">
            <Link
              href="/"
              className="text-[20px] font-semibold tracking-wide leading-none"
            >
              <span className="text-white">todays</span>
              <span className="text-emerald-400">stash</span>
            </Link>
          </div>

          {/* RIGHT SIDE */}
          <div className="flex-1 flex justify-end items-center gap-2">
            {/* Sign in / out desktop */}
            <button
              type="button"
              onClick={handleAuthClick}
              disabled={isAuthLoading}
              className={`
                hidden sm:inline-flex
                items-center justify-center
                rounded-full px-3 py-1.5
                text-[11px] font-medium
                bg-white/10 hover:bg-white/20
                text-white transition
                ${isAuthLoading ? "opacity-60 cursor-default" : ""}
              `}
            >
              {authLabel}
            </button>

            {/* Hamburger */}
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="
                inline-flex sm:hidden
                items-center justify-center
                rounded-full p-2.5
                hover:bg-white/10 transition
              "
            >
              <span className="flex flex-col gap-1.5">
                <span className="w-5 h-[1.5px] rounded-full bg-white" />
                <span className="w-5 h-[1.5px] rounded-full bg-white" />
                <span className="w-5 h-[1.5px] rounded-full bg-white" />
              </span>
            </button>
          </div>
        </div>

        {/* DESKTOP NAV */}
        <nav className="hidden sm:flex items-center justify-center gap-3 pb-2">
          {navLinks.map((link) => {
            const active = isActive(link.href);
            const isHome = link.href === "/";
            const isBusiness = link.href === "/merchant";
            const isDashboard = link.href === "/merchant-dashboard";

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`
                  rounded-full px-4 py-1.5 text-[13px] font-medium transition
                  ${
                    active
                      ? "bg-white text-black shadow-sm"
                      : isHome
                      ? "border border-white/40 text-white hover:bg-white/10"
                      : isBusiness
                      ? "border border-emerald-500/60 text-emerald-300 hover:bg-emerald-500/10 hover:text-emerald-200"
                      : isDashboard
                      ? "text-white/80 bg-white/5 hover:bg-white/10"
                      : "text-white/75 hover:text-white hover:bg-white/10"
                  }
                `}
              >
                {link.label}
              </Link>
            );
          })}

          {/* Invitations dropdown (desktop) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setAreasOpen((v) => !v)}
              className={`
                rounded-full px-4 py-1.5 text-[13px] font-medium transition
                inline-flex items-center gap-1.5
                ${
                  isInvitationActive
                    ? "bg-white text-black shadow-sm"
                    : "text-white/75 hover:text-white hover:bg-white/10"
                }
              `}
            >
              Areas we&apos;re promoting
              <span
                className={`text-[10px] transition-transform ${
                  areasOpen ? "rotate-180" : ""
                }`}
              >
                ▼
              </span>
            </button>

            {areasOpen && (
              <div
                className="
                  absolute right-0 mt-2 w-52
                  rounded-2xl border border-white/10
                  bg-[#05090F] shadow-[0_18px_40px_rgba(0,0,0,0.75)]
                  overflow-hidden
                "
              >
                {invitationLinks.map((link) => {
                  const active = isActive(link.href);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`
                        block px-4 py-2.5 text-[13px] transition
                        ${
                          active
                            ? "bg-white text-black"
                            : "text-white/85 hover:bg-white/10"
                        }
                      `}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </nav>
      </div>

      {/* MOBILE NAV */}
      {open && (
        <div
          className="
            sm:hidden border-t border-white/5
            bg-gradient-to-b from-[#0B1210] via-[#07131F] to-[#02050A]
            backdrop-blur-2xl
          "
        >
          <nav className="mx-auto max-w-5xl px-4 py-3 flex flex-col gap-1">
            {navLinks.map((link) => {
              const active = isActive(link.href);
              const isHome = link.href === "/";
              const isBusiness = link.href === "/merchant";
              const isDashboard = link.href === "/merchant-dashboard";

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`
                    w-full rounded-lg px-3 py-2 text-[13px] transition
                    ${
                      active
                        ? "bg-white text-black"
                        : isHome
                        ? "border border-white/40 text-white hover:bg-white/10"
                        : isBusiness
                        ? "border border-emerald-500/60 text-emerald-200 hover:bg-emerald-500/10"
                        : isDashboard
                        ? "text-white/85 bg-white/5 hover:bg-white/10"
                        : "text-white/85 hover:text-white hover:bg-white/10"
                    }
                  `}
                >
                  {link.label}
                </Link>
              );
            })}

            {/* Mobile invitations list */}
            <div className="mt-3">
              <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">
                Areas we&apos;re promoting
              </p>
              {invitationLinks.map((link) => {
                const active = isActive(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`
                      w-full rounded-lg px-3 py-2 text-[13px] transition
                      ${
                        active
                          ? "bg-white text-black"
                          : "text-white/85 hover:text-white hover:bg-white/10"
                      }
                    `}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>

            {/* Auth button mobile */}
            <button
              type="button"
              onClick={handleAuthClick}
              disabled={isAuthLoading}
              className={`
                mt-3 w-full rounded-lg px-3 py-2 text-[13px]
                bg-white/10 hover:bg-white/20
                text-white/90 text-left transition
                ${isAuthLoading ? "opacity-60 cursor-default" : ""}
              `}
            >
              {authLabel}
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}
