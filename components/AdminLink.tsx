'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { fetchMe, type Me } from '@/lib/me';

export default function AdminLink() {
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    fetchMe().then(setMe).catch(() => setMe(null));
  }, []);

  if (me?.role !== 'admin') return null;

  return (
    <Link href="/admin" className="px-3 py-2 font-semibold">
      Admin
    </Link>
  );
}
