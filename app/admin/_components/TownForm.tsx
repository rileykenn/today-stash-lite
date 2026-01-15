'use client';

import { useMemo, useState, useRef } from 'react';
import { sb } from '@/lib/supabaseBrowser';

type TownProps = {
    town?: {
        id: string;
        name: string | null;
        is_free: boolean | null;
        image_url?: string | null;
    };
    onSaved: () => void | Promise<void>;
    onCancel: () => void;
};

function slugifyTownName(input: string) {
    return input
        .trim()
        .toLowerCase()
        .replace(/&/g, 'and')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

export default function TownForm({ town, onSaved, onCancel }: TownProps) {
    const [name, setName] = useState(town?.name ?? '');
    const [isFree, setIsFree] = useState(town?.is_free ?? true);
    const [imageUrl, setImageUrl] = useState(town?.image_url ?? '');

    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const canSave = useMemo(() => name.trim().length > 0, [name]);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        setUploading(true);

        try {
            const file = e.target.files[0];
            const ext = file.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;
            const path = `town-images/${fileName}`;

            const { error: uploadError } = await sb.storage.from('public_assets').upload(path, file);
            if (uploadError) throw uploadError;

            const { data } = sb.storage.from('public_assets').getPublicUrl(path);
            setImageUrl(data.publicUrl);
        } catch (err: any) {
            alert('Upload failed: ' + err.message);
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async () => {
        if (!canSave) return;
        setSaving(true);

        try {
            if (town) {
                // Update
                const { error } = await sb
                    .from('towns')
                    .update({
                        name: name.trim(),
                        is_free: isFree,
                        image_url: imageUrl || null
                    })
                    .eq('id', town.id);

                if (error) throw error;
            } else {
                // Create
                const townName = name.trim();
                const baseSlug = slugifyTownName(townName) || 'town';

                let lastErr: any = null;
                for (let attempt = 0; attempt < 8; attempt++) {
                    const slug = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`;

                    const { error } = await sb.from('towns').insert({
                        name: townName,
                        slug,
                        is_free: isFree,
                        image_url: imageUrl || null
                    });

                    if (!error) {
                        await onSaved();
                        return;
                    }

                    lastErr = error;
                    const msg = String(error.message || '').toLowerCase();
                    if (!(msg.includes('duplicate') || msg.includes('unique'))) break;
                }
                if (lastErr) throw lastErr;
            }

            await onSaved();
        } catch (e: any) {
            alert('Failed to save town: ' + e.message);
            setSaving(false);
        }
    };

    return (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-700">Town Name</label>
                <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-slate-200"
                    placeholder="e.g. Sydney"
                />
            </div>

            <div>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                        type="checkbox"
                        checked={isFree}
                        onChange={(e) => setIsFree(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                    />
                    Free Town (Publicly accessible without subscription?)
                </label>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Town Image</label>

                {imageUrl ? (
                    <div className="relative w-full h-32 bg-slate-100 rounded-xl overflow-hidden mb-2 group">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={imageUrl} alt="preview" className="w-full h-full object-cover" />
                        <button
                            onClick={() => setImageUrl('')}
                            className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white p-1 rounded-full"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                ) : (
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full h-32 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:border-slate-300 hover:text-slate-500 cursor-pointer transition-colors"
                    >
                        <span className="text-2xl mb-1">+</span>
                        <span className="text-xs">Upload Photo</span>
                    </div>
                )}

                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageUpload}
                />
                {uploading && <div className="text-xs text-blue-500 mt-1">Uploading...</div>}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                    onClick={onCancel}
                    disabled={saving || uploading}
                    className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
                >
                    Cancel
                </button>
                <button
                    onClick={handleSave}
                    disabled={!canSave || saving || uploading}
                    className="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:opacity-95 disabled:opacity-50"
                >
                    {saving ? 'Saving…' : town ? 'Update Town' : 'Create Town'}
                </button>
            </div>
        </div >
    );
}
