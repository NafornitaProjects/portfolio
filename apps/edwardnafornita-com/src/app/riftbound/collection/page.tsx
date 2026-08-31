import { redirect } from 'next/navigation';
import { fetchCatalogueFilters } from '../../../lib/riftbound/cards';
import { fetchOwnedCards } from '../../../lib/riftbound/collection';
import { createClient } from '../../../lib/supabase/server';
import type { CardPage } from '../../../lib/riftbound/types';
import { CollectionApp } from '../collection-app';

export const dynamic = 'force-dynamic';

export default async function OwnedCollectionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/riftbound/login');

  const [collection, filters] = await Promise.all([
    fetchOwnedCards(supabase, { limit: 48 }),
    fetchCatalogueFilters(),
  ]);
  const initialData: CardPage = {
    cards: collection.cards,
    total: collection.total,
    filters,
  };

  return (
    <CollectionApp
      initialData={initialData}
      initialOwned={collection.owned}
      initialCopies={collection.copies}
      userEmail={user.email ?? 'Collector'}
      view="collection"
    />
  );
}
