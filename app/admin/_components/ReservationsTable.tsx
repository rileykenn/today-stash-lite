"use client";

import { useEffect, useState } from "react";
import { sb } from "@/lib/supabaseBrowser";
import { ArrowPathIcon, ExclamationTriangleIcon, CheckCircleIcon } from "@heroicons/react/24/outline";

type Reservation = {
    id: string;
    slot_time: string;
    status: 'pending' | 'redeemed' | 'missed' | 'cancelled';
    user_id: string;
    profile: {
        email: string;
        first_name: string;
        last_name: string;
        strikes: number;
        is_suspended: boolean;
    };
    offer: {
        title: string;
        merchant: {
            name: string;
        };
    };
};

export default function ReservationsTable() {
    const [loading, setLoading] = useState(true);
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const fetchReservations = async () => {
        setLoading(true);
        const { data, error } = await sb
            .from("reservations")
            .select(`
        id, slot_time, status, user_id,
        profile:profiles!user_id (email, first_name, last_name, strikes, is_suspended),
        offer:offers!offer_id (title, merchant:merchants!merchant_id (name))
      `)
            .order("slot_time", { ascending: false });

        if (error) {
            console.error("Error fetching reservations:", error);
            alert("Failed to load reservations");
        } else {
            setReservations(data as any || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchReservations();
    }, []);

    const handleLiftBan = async (userId: string) => {
        if (!confirm("Are you sure you want to lift the suspension and reset strikes for this user?")) return;
        setActionLoading(userId);

        try {
            const { error } = await sb.rpc('admin_lift_suspension', { p_user_id: userId });
            if (error) throw error;

            // Refresh
            await fetchReservations();
            alert("User suspension lifted.");
        } catch (e: any) {
            console.error(e);
            alert("Failed to lift ban: " + e.message);
        } finally {
            setActionLoading(null);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading reservations...</div>;

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Reservations Log</h2>
                <button onClick={fetchReservations} className="p-2 hover:bg-gray-100 rounded-full">
                    <ArrowPathIcon className="w-5 h-5 text-gray-600" />
                </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase text-xs">
                        <tr>
                            <th className="px-4 py-3">Slot Time</th>
                            <th className="px-4 py-3">User</th>
                            <th className="px-4 py-3">Deal</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3 text-center">Strikes</th>
                            <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {reservations.map((res) => {
                            const date = new Date(res.slot_time);
                            const fmtDate = date.toLocaleDateString("en-AU", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
                            const isSuspended = res.profile?.is_suspended;
                            const strikes = res.profile?.strikes || 0;

                            return (
                                <tr key={res.id} className="hover:bg-gray-50/50">
                                    <td className="px-4 py-3 font-medium whitespace-nowrap">{fmtDate}</td>
                                    <td className="px-4 py-3">
                                        <div className="font-medium text-gray-900">
                                            {res.profile?.first_name} {res.profile?.last_name}
                                        </div>
                                        <div className="text-xs text-gray-500">{res.profile?.email}</div>
                                        {isSuspended && (
                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-600 mt-1">
                                                SUSPENDED
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="line-clamp-1 font-medium">{res.offer?.title}</div>
                                        <div className="text-xs text-gray-500">{res.offer?.merchant?.name}</div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold capitalize
                        ${res.status === 'redeemed' ? 'bg-green-100 text-green-700' : ''}
                        ${res.status === 'pending' ? 'bg-blue-100 text-blue-700' : ''}
                        ${res.status === 'missed' ? 'bg-red-100 text-red-700' : ''}
                        ${res.status === 'cancelled' ? 'bg-gray-100 text-gray-600' : ''}
                    `}>
                                            {res.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {strikes > 0 ? (
                                            <span className={`font-bold ${strikes >= 3 ? "text-red-600" : "text-amber-600"}`}>
                                                {strikes}
                                            </span>
                                        ) : (
                                            <span className="text-gray-300">-</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        {isSuspended && (
                                            <button
                                                onClick={() => handleLiftBan(res.user_id)}
                                                disabled={actionLoading === res.user_id}
                                                className="text-xs bg-white border border-red-200 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 font-medium transition"
                                            >
                                                {actionLoading === res.user_id ? "..." : "Lift Ban"}
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {reservations.length === 0 && (
                    <div className="py-12 text-center text-gray-400">No reservations found.</div>
                )}
            </div>
        </div>
    );
}
