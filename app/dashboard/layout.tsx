'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { sb } from '@/lib/supabaseBrowser';
import {
    SparklesIcon,
    RectangleGroupIcon,
    ArrowRightStartOnRectangleIcon,
} from '@heroicons/react/24/outline';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();

    const handleSignOut = async () => {
        await sb.auth.signOut();
        router.push('/login');
        router.refresh();
    };

    const navItems = [
        { label: 'Dashboard', href: '/dashboard', icon: RectangleGroupIcon },
    ];

    return (
        <div className="min-h-screen flex flex-col bg-[#0B1210]">
            {/* Top Nav */}
            <header className="sticky top-0 z-50 bg-[#0B1210]/90 backdrop-blur-xl border-b border-white/8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                    {/* Left: Branding */}
                    <Link href="/dashboard" className="flex items-center gap-3 group">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-md shadow-emerald-900/20 group-hover:shadow-emerald-900/40 transition">
                            <SparklesIcon className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <span className="text-sm font-bold text-white">Today&apos;s Stash</span>
                            <span className="text-xs text-emerald-400/70 ml-1.5 font-medium">Sales</span>
                        </div>
                    </Link>

                    {/* Center: Nav */}
                    <nav className="hidden sm:flex items-center gap-1">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${isActive
                                            ? 'bg-white/10 text-white'
                                            : 'text-white/50 hover:text-white hover:bg-white/5'
                                        }`}
                                >
                                    <item.icon className="w-4 h-4" />
                                    {item.label}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Right: Sign Out */}
                    <button
                        onClick={handleSignOut}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/40 hover:text-white hover:bg-white/5 transition"
                    >
                        <ArrowRightStartOnRectangleIcon className="w-4 h-4" />
                        <span className="hidden sm:inline">Sign Out</span>
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1">
                {children}
            </main>
        </div>
    );
}
