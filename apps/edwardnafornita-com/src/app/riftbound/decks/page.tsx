import { redirect } from 'next/navigation';
import { createClient } from '../../../lib/supabase/server';
import { DecksApp } from './decks-app';
import { SiteHeader } from '../site-header';

export const dynamic = 'force-dynamic';

export default async function DecksPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/riftbound/login');

  const { data: decks, error } = await supabase
    .from('riftbound_decks')
    .select(
      'id, name, chosen_champion_id, created_at, updated_at, riftbound_deck_cards(quantity, zone)'
    )
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  if (error) throw error;

  return (
    <main className="rb-app rb-decks-page">
      <SiteHeader active="decks" userEmail={user.email ?? 'Collector'} />
      <DecksApp initialDecks={decks ?? []} />
    </main>
  );
}
