import { redirect } from 'next/navigation';
import { CollectionApp } from './collection-app';
import {
  fetchCatalogueCards,
  fetchCatalogueFilters,
} from '../../lib/riftbound/cards';
import { addCollectionQuantities } from '../../lib/riftbound/collection';
import { createClient } from '../../lib/supabase/server';
import type { CardPage } from '../../lib/riftbound/types';

export const dynamic = 'force-dynamic';

export default async function RiftboundPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/riftbound/login');

  const [{ data: collection }, catalogue, filters] = await Promise.all([
    supabase.from('riftbound_collection').select('quantity'),
    fetchCatalogueCards({ limit: 48 }),
    fetchCatalogueFilters(),
  ]);

  const initialData: CardPage = {
    cards: await addCollectionQuantities(supabase, catalogue.cards),
    total: catalogue.total,
    filters,
  };
  const quantities = collection ?? [];

  return (
    <CollectionApp
      initialData={initialData}
      initialOwned={quantities.length}
      initialCopies={quantities.reduce(
        (total, row) => total + Number(row.quantity),
        0
      )}
      userEmail={user.email ?? 'Collector'}
    />
  );
}
