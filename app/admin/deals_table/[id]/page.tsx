// app/admin/deals_table/[id]/page.tsx
'use client';

import { useParams } from 'next/navigation';
import DealForm from '@/app/admin/_components/DealForm';

export default function EditDealPage() {
  const params = useParams();
  const id = String((params as any)?.id || '');

  return (
    <div className="p-4">
      <DealForm offerId={id} />
    </div>
  );
}
