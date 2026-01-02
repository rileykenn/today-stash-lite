// app/admin/_components/MerchantCreate.tsx
'use client';

import { useEffect, useState } from 'react';
import { sb } from '@/lib/supabaseBrowser';

type Town = { id: string; name: string };

export default function MerchantCreate({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [towns, setTowns] = useState<Town[]>([]);
  const [newMerchantName, setNewMerchantName] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [merchantPin, setMerchantPin] = useState('');
  const [selectedTownId, setSelectedTownId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data, error } = await sb
        .from('towns')
        .select('id,name')
        .order('name', { ascending: true });
      if (error) {
        console.error('TOWNS FETCH ERROR:', error);
        setTowns([]);
        return;
      }
      setTowns((data as any[]) as Town[]);
    })();
  }, [open]);

  const createMerchant = async () => {
    if (!newMerchantName.trim()) return alert('Please enter a merchant name.');
    if (!selectedTownId) return alert('Please select a town.');

    setSaving(true);

    const payload: Record<string, any> = {
      name: newMerchantName.trim(),
      town_id: selectedTownId,
    };

    if (streetAddress.trim()) payload.street_address = streetAddress.trim();
    if (merchantPin.trim()) payload.merchant_pin = merchantPin.trim();

    const { error } = await sb.from('merchants').insert(payload);

    if (error) {
      setSaving(false);
      return alert('Failed to create merchant: ' + error.message);
    }

    setSaving(false);
    setNewMerchantName('');
    setStreetAddress('');
    setMerchantPin('');
    setSelectedTownId('');
    onCreated();
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-3">
      <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-lg p-4">
        <h3 className="text-lg font-semibold mb-3">Create merchant</h3>

        <label className="text-sm font-medium mb-1 block">Business name</label>
        <input
          className="w-full mb-3 rounded-xl border border-slate-200 px-3 py-2 bg-white"
          value={newMerchantName}
          onChange={(e) => setNewMerchantName(e.target.value)}
          placeholder="e.g., Ocean Café"
        />

        <label className="text-sm font-medium mb-1 block">Town</label>
        <select
          className="w-full mb-3 rounded-xl border border-slate-200 px-3 py-2 bg-white"
          value={selectedTownId}
          onChange={(e) => setSelectedTownId(e.target.value)}
        >
          <option value="">Select a town…</option>
          {towns.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>

        <label className="text-sm font-medium mb-1 block">Street address</label>
        <input
          className="w-full mb-3 rounded-xl border border-slate-200 px-3 py-2 bg-white"
          value={streetAddress}
          onChange={(e) => setStreetAddress(e.target.value)}
          placeholder="e.g., 12 Beach St"
        />

        <label className="text-sm font-medium mb-1 block">Merchant PIN</label>
        <input
          className="w-full mb-4 rounded-xl border border-slate-200 px-3 py-2 bg-white"
          value={merchantPin}
          onChange={(e) => setMerchantPin(e.target.value)}
          placeholder="e.g., 1234"
        />

        <div className="flex justify-end gap-2">
          <button
            onClick={() => {
              if (!saving) onClose();
            }}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={createMerchant}
            className="px-3 py-2 rounded-xl bg-slate-900 text-white font-semibold disabled:opacity-50"
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
