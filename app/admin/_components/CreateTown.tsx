'use client';

import { useMemo, useState } from 'react';
import { sb } from '@/lib/supabaseBrowser';

function random4DigitCode() {
  // 1000–9999
  return String(Math.floor(1000 + Math.random() * 9000));
}

function slugifyTownName(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9\s-]/g, '') // remove special chars
    .replace(/\s+/g, '-') // spaces -> hyphen
    .replace(/-+/g, '-') // collapse hyphens
    .replace(/^-|-$/g, ''); // trim hyphens
}

export default function CreateTown({ onCreated }: { onCreated: () => Promise<void> | void }) {
  const [name, setName] = useState('');
  const [isFree, setIsFree] = useState<boolean>(true);
  const [creating, setCreating] = useState(false);

  const canSubmit = useMemo(() => name.trim().length > 0 && !creating, [name, creating]);

  const createTown = async () => {
    const townName = name.trim();
    if (!townName) return;

    setCreating(true);

    const baseSlug = slugifyTownName(townName) || 'town';

    // generate a 4-digit code (retry a few times if collision happens due to unique constraint)
    let lastErr: any = null;

    for (let attempt = 0; attempt < 8; attempt++) {
      const access_code = random4DigitCode();

      // keep slug unique by suffixing if needed (covers unique constraint on slug)
      const slug = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`;

      const { error } = await sb.from('towns').insert({
        name: townName,
        slug,
        is_free: isFree,
        access_code,
      });

      if (!error) {
        setName('');
        setIsFree(true);
        setCreating(false);
        await onCreated?.();
        return;
      }

      lastErr = error;

      // retry on unique collisions (slug/code); otherwise stop immediately
      const msg = String(error.message || '').toLowerCase();
      const isUniqueViolation =
        msg.includes('duplicate') || msg.includes('unique') || msg.includes('already exists');

      if (!isUniqueViolation) break;
    }

    setCreating(false);
    alert('Failed to create town: ' + (lastErr?.message ?? 'Unknown error'));
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="text-sm font-semibold">Create town</div>
          <div className="text-xs text-slate-500">
            Adds a town to <span className="font-mono">public.towns</span> and generates a 4-digit access
            code.
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Town name…"
            className="w-full sm:w-64 px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-slate-200"
          />

          <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm">
            <input
              type="checkbox"
              checked={isFree}
              onChange={(e) => setIsFree(e.target.checked)}
              className="h-4 w-4"
            />
            Free town
          </label>

          <button
            onClick={createTown}
            disabled={!canSubmit}
            className="px-3 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold disabled:opacity-60"
          >
            {creating ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
