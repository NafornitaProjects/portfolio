import { notFound, redirect } from 'next/navigation';
import {
  fetchAllCatalogueCards,
  fetchCatalogueCards,
  fetchCatalogueFilters,
} from '../../../../lib/riftbound/cards';
import type { DeckCardRow } from '../../../../lib/riftbound/decks';
import { createClient } from '../../../../lib/supabase/server';
import type { CardPage } from '../../../../lib/riftbound/types';
import { SiteHeader } from '../../site-header';
import { DeckBuilder } from './deck-builder';

type DeckBuilderPageProps = {
  params: Promise<{ deckId: string }>;
};

export const dynamic = 'force-dynamic';

export default async function DeckBuilderPage({
  params,
}: DeckBuilderPageProps) {
  const { deckId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/riftbound/login');

  const [
    { data: deck, error: deckError },
    { data: rows, error: cardError },
    catalogue,
    filters,
    allCards,
  ] = await Promise.all([
    supabase
      .from('riftbound_decks')
      .select('id, name, chosen_champion_id, created_at, updated_at')
      .eq('id', deckId)
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('riftbound_deck_cards')
      .select('card_id, quantity, zone')
      .eq('deck_id', deckId),
    fetchCatalogueCards({ limit: 48, type: 'Legend' }),
    fetchCatalogueFilters(),
    fetchAllCatalogueCards(),
  ]);

  if (deckError || cardError) throw deckError ?? cardError;
  if (!deck) notFound();

  const cardsById = new Map(allCards.map((card) => [card.id, card]));
  const initialDeckCards = ((rows ?? []) as DeckCardRow[])
    .map((row) => {
      const card = cardsById.get(row.card_id);
      return card ? { card, quantity: row.quantity, zone: row.zone } : null;
    })
    .filter((entry) => entry !== null);
  const initialData: CardPage = {
    cards: catalogue.cards,
    total: catalogue.total,
    filters,
  };

  return (
    <main className="rb-app rb-builder-page">
      <SiteHeader active="decks" userEmail={user.email ?? 'Collector'} />
      <DeckBuilder
        deck={{
          id: deck.id,
          name: deck.name,
          chosenChampionId: deck.chosen_champion_id,
          createdAt: deck.created_at,
          updatedAt: deck.updated_at,
        }}
        initialData={initialData}
        initialDeckCards={initialDeckCards}
      />
    </main>
  );
}
