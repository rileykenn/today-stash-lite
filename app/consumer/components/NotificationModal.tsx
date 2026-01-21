"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { BellIcon } from "@heroicons/react/24/outline";

interface NotificationModalProps {
    open: boolean;
    onClose: () => void;
    merchantName: string;
    isConfigured: boolean; // True if user has global notifications enabled + method set
    onConfirm: () => void; // Called when user clicks "Yes" to enable for merchant
    loading?: boolean;
}

export default function NotificationModal({
    open,
    onClose,
    merchantName,
    isConfigured,
    onConfirm,
    loading = false,
}: NotificationModalProps) {
    const router = useRouter();

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative w-full max-w-md bg-[#111821] rounded-2xl border border-white/10 shadow-2xl p-6 transform transition-all">
                {/* Icon Header */}
                <div className="flex justify-center mb-5">
                    <div className="h-16 w-16 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/20">
                        <BellIcon className="h-8 w-8 text-emerald-400" />
                    </div>
                </div>

                {/* Content */}
                <div className="text-center space-y-4 mb-8">
                    {isConfigured ? (
                        <>
                            <h3 className="text-xl font-bold text-white">Enable notifications?</h3>
                            <p className="text-gray-400 text-sm leading-relaxed">
                                Do you want to enable notifications from <span className="text-white font-semibold">{merchantName}</span>?
                            </p>
                            <div className="bg-white/5 rounded-xl p-4 text-xs text-start space-y-2 border border-white/5">
                                <p className="text-emerald-400 font-medium mb-1">You will be notified when:</p>
                                <div className="flex gap-2 text-gray-300">
                                    <span>✨</span>
                                    <span>A merchant restocks a deal</span>
                                </div>
                                <div className="flex gap-2 text-gray-300">
                                    <span>📫</span>
                                    <span>This merchant posts a new deal</span>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <h3 className="text-xl font-bold text-white">Notifications Not Configured</h3>
                            <p className="text-gray-400 text-sm leading-relaxed">
                                You haven&apos;t turned on notifications yet. To receive alerts from {merchantName}, you need to enable them in your profile.
                            </p>
                            <div className="bg-amber-500/10 rounded-xl p-4 text-xs text-amber-200/80 border border-amber-500/20">
                                Go to <strong>Profile &gt; Settings &gt; Notifications</strong> to choose from Email or Phone notifications.
                            </div>
                        </>
                    )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-3">
                    {isConfigured ? (
                        <>
                            <button
                                onClick={onConfirm}
                                disabled={loading}
                                className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? "Enabling..." : "Yes, Enable Notifications"}
                            </button>
                            <button
                                onClick={onClose}
                                disabled={loading}
                                className="w-full py-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white font-medium transition-colors"
                            >
                                Cancel
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={() => router.push('/profile')}
                                className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-lg shadow-blue-600/20 transition-all"
                            >
                                Go to Profile
                            </button>
                            <button
                                onClick={onClose}
                                className="w-full py-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white font-medium transition-colors"
                            >
                                Cancel
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
