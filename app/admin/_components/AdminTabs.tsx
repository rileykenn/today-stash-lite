'use client';

export type AdminTabKey =
  | 'users'
  | 'merchants'
  | 'deals'
  | 'applications'
  | 'support'
  | 'towns';

const tabs: { key: AdminTabKey; label: string }[] = [
  { key: 'users', label: 'Users' },
  { key: 'merchants', label: 'Merchants' },
  { key: 'deals', label: 'Deals' },
  { key: 'applications', label: 'Applications' },
  { key: 'support', label: 'Support' },
  { key: 'towns', label: 'Towns' },
];

export default function AdminTabs({
  value,
  onChange,
}: {
  value: AdminTabKey;
  onChange: (k: AdminTabKey) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((t) => {
        const active = value === t.key;
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            className={[
              'px-3 py-2 rounded-xl text-sm font-medium border transition',
              active
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50',
            ].join(' ')}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
