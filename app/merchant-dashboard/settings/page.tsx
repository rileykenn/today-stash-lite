"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { sb } from "@/lib/supabaseBrowser";

type DaySchedule = {
    isOpen: boolean;
    open: string;
    close: string;
};

type WeeklyHours = {
    [key: string]: DaySchedule;
};

const DEFAULT_HOURS: WeeklyHours = {
    monday: { isOpen: true, open: "09:00", close: "17:00" },
    tuesday: { isOpen: true, open: "09:00", close: "17:00" },
    wednesday: { isOpen: true, open: "09:00", close: "17:00" },
    thursday: { isOpen: true, open: "09:00", "close": "17:00" },
    friday: { isOpen: true, open: "09:00", close: "17:00" },
    saturday: { isOpen: true, open: "09:00", close: "17:00" },
    sunday: { isOpen: false, open: "09:00", close: "17:00" },
};

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

export default function MerchantSettingsPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [merchantId, setMerchantId] = useState<string | null>(null);
    const [hours, setHours] = useState<WeeklyHours>(DEFAULT_HOURS);
    const [error, setError] = useState<string | null>(null);

    // Branding State
    const [bannerUrl, setBannerUrl] = useState<string | null>(null);
    const [bannerFile, setBannerFile] = useState<File | null>(null);
    const [streetAddress, setStreetAddress] = useState("");

    // Previews
    const [bannerPreview, setBannerPreview] = useState<string | null>(null);

    useEffect(() => {
        async function load() {
            const { data: { session } } = await sb.auth.getSession();
            if (!session) {
                router.push("/signin");
                return;
            }

            const { data: profile } = await sb
                .from("profiles")
                .select("merchant_id")
                .eq("user_id", session.user.id)
                .single();

            if (!profile?.merchant_id) {
                router.push("/merchant-dashboard");
                return;
            }

            setMerchantId(profile.merchant_id);

            const { data: merchant, error: fetchError } = await sb
                .from("merchants")
                .select("operating_hours, logo_url, banner_url, street_address")
                .eq("id", profile.merchant_id)
                .single();

            if (fetchError) {
                console.error(fetchError);
            } else {
                if (merchant?.operating_hours) {
                    setHours({ ...DEFAULT_HOURS, ...(merchant.operating_hours as WeeklyHours) });
                }
                // Logo removed per request
                if (merchant?.banner_url) {
                    setBannerUrl(merchant.banner_url);
                    setBannerPreview(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${process.env.NEXT_PUBLIC_OFFER_BUCKET || "offer-media"}/${merchant.banner_url}`);
                }
                if (merchant?.street_address) {
                    setStreetAddress(merchant.street_address);
                }
            }

            setLoading(false);
        }
        load();
    }, [router]);

    const handleDayChange = (day: string, field: keyof DaySchedule, value: any) => {
        setHours(prev => ({
            ...prev,
            [day]: {
                ...prev[day],
                [field]: value
            }
        }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'banner') => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (type === 'banner') {
            setBannerFile(file);
            setBannerPreview(URL.createObjectURL(file));
        }
    };

    const handleSave = async () => {
        if (!merchantId) return;
        setSaving(true);
        setError(null);

        try {
            let finalBannerUrl = bannerUrl;

            // Logo removed per request

            // Upload Banner
            if (bannerFile) {
                const fileExt = bannerFile.name.split('.').pop();
                const fileName = `banner-${merchantId}-${Math.random().toString(36).substring(2)}.${fileExt}`;
                const { error: uploadError } = await sb.storage
                    .from(process.env.NEXT_PUBLIC_OFFER_BUCKET || "offer-media")
                    .upload(fileName, bannerFile);
                if (uploadError) throw uploadError;
                finalBannerUrl = fileName;
            }

            const { error: updateError } = await sb
                .from("merchants")
                .update({
                    operating_hours: hours,
                    // logo_url: finalLogoUrl, // Removed
                    banner_url: finalBannerUrl,
                    street_address: streetAddress
                } as any)
                .eq("id", merchantId);

            if (updateError) throw updateError;

            // Update local state to avoid re-uploading on next save without change
            // setLogoUrl(finalLogoUrl); // Removed
            setBannerUrl(finalBannerUrl);
            // setLogoFile(null); // Removed
            setBannerFile(null);

            alert("Settings saved successfully!");
            router.push("/merchant-dashboard");
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Failed to save settings.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <main className="min-h-screen bg-[#0A0F13] text-white flex items-center justify-center">
                Loading...
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-[#0A0F13] text-white p-4 md:p-8">
            <div className="max-w-2xl mx-auto">
                <header className="mb-8">
                    <button
                        onClick={() => router.back()}
                        className="text-sm text-gray-400 hover:text-white mb-4 flex items-center gap-2"
                    >
                        ← Back to Dashboard
                    </button>
                    <h1 className="text-2xl font-bold">Venue Settings</h1>
                    <p className="text-gray-400 mt-2">Manage your brand and operating hours.</p>
                </header>

                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 text-red-400 rounded-xl text-sm">
                        {error}
                    </div>
                )}

                <div className="bg-[#111821] border border-white/10 rounded-2xl p-6 mb-6">
                    <h2 className="text-lg font-semibold mb-6">Brand Identity</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Logo Upload Removed */}

                        {/* Address Input */}
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-3">Business Address</label>
                            <input
                                type="text"
                                value={streetAddress}
                                onChange={(e) => setStreetAddress(e.target.value)}
                                placeholder="123 Example St, Sydney NSW"
                                className="w-full bg-[#1A2330] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500 transition-colors"
                            />
                        </div>

                        {/* Banner Upload */}
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-3">Banner Image</label>
                            <div className="flex flex-col gap-4">
                                <div className="w-full h-24 rounded-xl bg-[#1A2330] border border-white/10 overflow-hidden flex items-center justify-center relative group">
                                    {bannerPreview ? (
                                        <img src={bannerPreview} alt="Banner Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-gray-600 text-xs">No Banner</span>
                                    )}
                                </div>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleFileChange(e, 'banner')}
                                    className="hidden"
                                    id="banner-upload"
                                />
                                <label
                                    htmlFor="banner-upload"
                                    className="px-4 py-2 bg-[#1A2330] hover:bg-[#252f3e] border border-white/10 rounded-lg text-sm transition-colors cursor-pointer text-center text-emerald-500"
                                >
                                    Upload Banner
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-[#111821] border border-white/10 rounded-2xl p-6">
                    <h2 className="text-lg font-semibold mb-6">Operating Hours</h2>

                    <div className="space-y-4">
                        {DAYS.map(day => (
                            <div key={day} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-[#0A0F13] rounded-xl border border-white/5">
                                <div className="flex items-center justify-between sm:justify-start gap-4">
                                    <span className="capitalize w-24 font-medium">{day}</span>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={hours[day]?.isOpen}
                                            onChange={(e) => handleDayChange(day, "isOpen", e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                                        <span className="ml-3 text-sm text-gray-400">{hours[day]?.isOpen ? "Open" : "Closed"}</span>
                                    </label>
                                </div>

                                {hours[day]?.isOpen && (
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="time"
                                            value={hours[day]?.open}
                                            onChange={(e) => handleDayChange(day, "open", e.target.value)}
                                            className="bg-[#1A2330] border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                                        />
                                        <span className="text-gray-400">-</span>
                                        <input
                                            type="time"
                                            value={hours[day]?.close}
                                            onChange={(e) => handleDayChange(day, "close", e.target.value)}
                                            className="bg-[#1A2330] border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                                        />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="mt-8 flex justify-end">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="bg-emerald-500 hover:bg-emerald-400 text-white font-semibold py-3 px-8 rounded-xl transition-colors shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {saving ? "Saving..." : "Save Settings"}
                        </button>
                    </div>
                </div>
            </div>
        </main>
    );
}
