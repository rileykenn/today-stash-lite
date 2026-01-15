'use client';

import { useState, useEffect } from 'react';
import { sb } from '@/lib/supabaseBrowser';

export default function AdminTownsPage() {
    const [towns, setTowns] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    // Form State
    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);

    useEffect(() => {
        fetchTowns();
    }, []);

    async function fetchTowns() {
        setLoading(true);
        const { data } = await sb.from('towns').select('*').order('name');
        if (data) setTowns(data);
        setLoading(false);
    }

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !slug || !imageFile) {
            alert('Please fill all fields and upload an image.');
            return;
        }

        setUploading(true);

        try {
            // 1. Upload Image
            const fileExt = imageFile.name.split('.').pop();
            const fileName = `town-${slug}-${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `${fileName}`;

            // Using 'offer-media' bucket for simplicity as it exists. Ideally 'town-media'.
            const { error: uploadError } = await sb.storage
                .from(process.env.NEXT_PUBLIC_OFFER_BUCKET || 'offer-media')
                .upload(filePath, imageFile);

            if (uploadError) throw uploadError;

            // 2. Insert Town
            const { error: insertError } = await sb
                .from('towns')
                .insert({
                    name,
                    slug,
                    image_url: filePath
                });

            if (insertError) throw insertError;

            alert('Town created successfully!');
            setName('');
            setSlug('');
            setSlug('');
            setImageFile(null);
            fetchTowns();

        } catch (err: any) {
            console.error(err);
            alert('Failed to create town: ' + err.message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="p-8 text-white min-h-screen bg-[#0A0F13]">
            <h1 className="text-3xl font-bold mb-8">Manage Towns / Areas</h1>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Create Form */}
                <div className="bg-[#13202B] p-6 rounded-2xl border border-white/10 h-fit">
                    <h2 className="text-xl font-semibold mb-4">Add New Town</h2>
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Town Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => {
                                    setName(e.target.value);
                                    setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''));
                                }}
                                className="w-full bg-[#0A0F13] border border-white/10 rounded-lg p-2.5 focus:border-emerald-500 outline-none"
                                placeholder="e.g. Greater Sydney"
                            />
                        </div>

                        <div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Slug (URL)</label>
                                <input
                                    type="text"
                                    value={slug}
                                    onChange={e => setSlug(e.target.value)}
                                    className="w-full bg-[#0A0F13] border border-white/10 rounded-lg p-2.5 focus:border-emerald-500 outline-none"
                                    placeholder="e.g. greater-sydney"
                                />
                            </div>


                        </div>

                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Cover Image</label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={e => setImageFile(e.target.files?.[0] || null)}
                                className="w-full bg-[#0A0F13] border border-white/10 rounded-lg p-2.5 text-sm text-gray-400"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={uploading}
                            className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-3 rounded-xl transition disabled:opacity-50"
                        >
                            {uploading ? 'Creating...' : 'Create Town'}
                        </button>
                    </form>
                </div>

                {/* List */}
                <div className="bg-[#13202B] p-6 rounded-2xl border border-white/10">
                    <h2 className="text-xl font-semibold mb-4">Existing Towns</h2>
                    {loading ? (
                        <p className="text-gray-500">Loading...</p>
                    ) : (
                        <div className="space-y-3">
                            {towns.map(town => (
                                <div key={town.id} className="flex items-center gap-4 bg-[#0A0F13] p-3 rounded-xl border border-white/5">
                                    <div className="w-12 h-12 bg-gray-800 rounded-lg overflow-hidden flex-shrink-0">
                                        {town.image_url && (
                                            <img
                                                src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${process.env.NEXT_PUBLIC_OFFER_BUCKET || "offer-media"}/${town.image_url}`}
                                                alt={town.name}
                                                className="w-full h-full object-cover"
                                            />
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold">{town.name}</h3>
                                        <p className="text-xs text-gray-500">/areas/{town.slug}</p>
                                    </div>
                                </div>
                            ))}
                            {towns.length === 0 && <p className="text-gray-500">No towns found.</p>}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
