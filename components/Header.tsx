"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const navLinks = [
  { href: "/about", label: "What is Today’s Stash?" },
  { href: "/success-stories", label: "Success Stories" },
  { href: "/consumer", label: "View Deals" },
  { href: "/profile", label: "Profile" },
];

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const isActive = (href: string) =>
    pathname === href || pathname?.startsWith(href + "/");

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
          {/* LEFT: keeps space on mobile so logo stays centered */}
          <div className="flex-1">
            <span className="hidden sm:inline text-[11px] text-white/60">
              Admin
            </span>
          </div>

          {/* CENTER: logo */}
          <div className="flex-1 flex justify-center">
            <Link
              href="/"
              className="text-[20px] font-semibold tracking-wide leading-none"
            >
              <span className="text-white">todays</span>
              <span className="text-emerald-400">stash</span>
            </Link>
          </div>

          {/* RIGHT: sign out (desktop) + hamburger (mobile) */}
          <div className="flex-1 flex justify-end items-center gap-2">
            {/* Sign out desktop */}
            <button
              className="
                hidden sm:inline-flex
                items-center justify-center
                rounded-full px-3 py-1.5
                text-[11px] font-medium
                bg-white/10 hover:bg-white/20
                text-white
                transition
              "
            >
              Sign out
            </button>

            {/* Hamburger mobile */}
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="
                inline-flex sm:hidden
                items-center justify-center
                rounded-full p-2.5
                hover:bg-white/10
                transition
              "
              aria-label="Toggle navigation"
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
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`
                rounded-full px-4 py-1.5 text-[13px] font-medium
                transition
                ${
                  isActive(link.href)
                    ? "bg-white text-black shadow-sm"
                    : "text-white/75 hover:text-white hover:bg-white/10"
                }
              `}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* MOBILE DROPDOWN */}
      {open && (
        <div
          className="
            sm:hidden border-t border-white/5
            bg-gradient-to-b from-[#0B1210] via-[#07131F] to-[#02050A]
            backdrop-blur-2xl
          "
        >
          <nav className="mx-auto max-w-5xl px-4 py-3 flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`
                  w-full rounded-lg px-3 py-2 text-[13px]
                  transition
                  ${
                    isActive(link.href)
                      ? "bg-white text-black"
                      : "text-white/85 hover:text-white hover:bg-white/10"
                  }
                `}
              >
                {link.label}
              </Link>
            ))}

            <button
              className="
                mt-2 w-full
                rounded-lg px-3 py-2 text-[13px]
                bg-white/10 hover:bg-white/20
                text-white/90 text-left
                transition
              "
            >
              Sign out
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}
