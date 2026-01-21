'use client';

import React, { useState, useEffect } from 'react';
import { XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { sb } from '@/lib/supabaseBrowser';

interface MerchantNotificationsModalProps {
    open: boolean;
    onClose: () => void;
    subscribedTowns: any[];
}

export default function MerchantNotificationsModal({ open, onClose, subscribedTowns }: MerchantNotificationsModalProps) {
    const [selectedTownId, setSelectedTownId] = useState<string>('');
    const [merchants, setMerchants] = useState<any[]>([]);
    const [notificationPrefs, setNotificationPrefs] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Fetch merchants when town is selected
    useEffect(() => {
        if (!selectedTownId || !open) return;

        (async () => {
            setLoading(true);
            try {
                const { data: { user } } = await sb.auth.getUser();
                if (!user) return;

                // Fetch merchants in this town
                const { data: merchantsData } = await sb
                    .from('merchants')
                    .select('id, name')
                    .eq('town_id', selectedTownId)
                    .order('name');

                setMerchants(merchantsData || []);

                // Fetch notification preferences
                const { data: prefsData } = await sb
                    .from('notification_preferences')
                    .select('*')
                    .eq('user_id', user.id)
                    .eq('town_id', selectedTownId);

                setNotificationPrefs(prefsData || []);
            } catch (error) {
                console.error('Error fetching merchants:', error);
            } finally {
                setLoading(false);
            }
        })();
    }, [selectedTownId, open]);

    const isMerchantEnabled = (merchantId: string) => {
        return notificationPrefs.some(p => p.merchant_id === merchantId && p.enabled);
    };

    const handleToggleMerchant = (merchantId: string) => {
        const isEnabled = isMerchantEnabled(merchantId);

        if (isEnabled) {
            // Remove from prefs
            setNotificationPrefs(prev => prev.filter(p => p.merchant_id !== merchantId));
        } else {
            // Add to prefs
            setNotificationPrefs(prev => [...prev, { merchant_id: merchantId, enabled: true }]);
        }
    };

    const handleEnableAll = () => {
        const allPrefs = merchants.map(m => ({ merchant_id: m.id, enabled: true }));
        setNotificationPrefs(allPrefs);
    };

    const handleDisableAll = () => {
        setNotificationPrefs([]);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const { data: { user } } = await sb.auth.getUser();
            if (!user) return;

            // Delete all existing prefs for this town
            await sb
                .from('notification_preferences')
                .delete()
                .eq('user_id', user.id)
                .eq('town_id', selectedTownId);

            // Insert new prefs
            if (notificationPrefs.length > 0) {
                const prefsToInsert = notificationPrefs.map(p => ({
                    user_id: user.id,
                    merchant_id: p.merchant_id,
                    town_id: selectedTownId,
                    enabled: true
                }));

                await sb
                    .from('notification_preferences')
                    .insert(prefsToInsert);
            }

            alert('Notification preferences saved!');

            // Dispatch event to refresh profile page
            window.dispatchEvent(new Event('notifications-updated'));

            onClose();
        } catch (error) {
            console.error('Error saving preferences:', error);
            alert('Failed to save preferences');
        } finally {
            setSaving(false);
        }
    };

    const filteredMerchants = merchants.filter(m =>
        m.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (!open) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-[#13202B] rounded-2xl max-w-2xl w-full max-h-[80vh] flex flex-col ring-1 ring-white/10">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                    <h2 className="text-xl font-bold text-white">Manage Merchant Notifications</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Town Selector */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-white/70 mb-2">Select Town</label>
                        <select
                            value={selectedTownId}
                            onChange={(e) => {
                                setSelectedTownId(e.target.value);
                                setSearchQuery('');
                            }}
                            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white text-lg focus:outline-none focus:border-emerald-500"
                        >
                            <option value="">-- Choose a town --</option>
                            {subscribedTowns.map(town => (
                                <option key={town.id} value={town.id}>{town.name}</option>
                            ))}
                        </select>
                    </div>

                    {selectedTownId && (
                        <>
                            {/* Search Bar */}
                            <div className="mb-4 relative">
                                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search merchants..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-white/10 border border-white/20 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-emerald-500"
                                />
                            </div>

                            {/* Enable/Disable All */}
                            <div className="flex gap-2 mb-4">
                                <button
                                    onClick={handleEnableAll}
                                    className="flex-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 font-medium py-2 px-4 rounded-lg transition-colors text-sm"
                                >
                                    Enable All
                                </button>
                                <button
                                    onClick={handleDisableAll}
                                    className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-medium py-2 px-4 rounded-lg transition-colors text-sm"
                                >
                                    Disable All
                                </button>
                            </div>

                            {/* Merchant List */}
                            {loading ? (
                                <div className="text-center py-8 text-white/50">Loading merchants...</div>
                            ) : filteredMerchants.length === 0 ? (
                                <div className="text-center py-8 text-white/50">
                                    {searchQuery ? 'No merchants found' : 'No merchants in this town'}
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {filteredMerchants.map(merchant => (
                                        <label
                                            key={merchant.id}
                                            className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-lg cursor-pointer transition-colors"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isMerchantEnabled(merchant.id)}
                                                onChange={() => handleToggleMerchant(merchant.id)}
                                                className="w-5 h-5 rounded border-white/20 bg-white/10 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0"
                                            />
                                            <span className="text-white text-base">{merchant.name}</span>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="flex gap-3 p-6 border-t border-white/10">
                    <button
                        onClick={onClose}
                        className="flex-1 bg-white/10 hover:bg-white/20 text-white font-semibold py-3 rounded-xl transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!selectedTownId || saving}
                        className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
}
