import { getCodeFromDeck } from '@piltoverarchive/riftbound-deck-codes';
import { NextResponse } from 'next/server';
import { fetchAllCatalogueCards } from '../../../../../../lib/riftbound/cards';
import {
  cardCodeForDeck,
  type DeckCardRow,
} from '../../../../../../lib/riftbound/decks';
import { createClient } from '../../../../../../lib/supabase/server';

type RouteContext = {
  params: Promise<{ deckId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { deckId } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const [{ data: deck, error: deckError }, { data: rows, error: cardError }] =
    await Promise.all([
      supabase
        .from('riftbound_decks')
        .select('id, chosen_champion_id')
        .eq('id', deckId)
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase
        .from('riftbound_deck_cards')
        .select('card_id, quantity, zone')
        .eq('deck_id', deckId),
    ]);

  if (deckError || cardError) {
    return NextResponse.json(
      { message: deckError?.message ?? cardError?.message },
      { status: 500 }
    );
  }
  if (!deck) {
    return NextResponse.json({ message: 'Deck not found.' }, { status: 404 });
  }

  try {
    const catalogue = await fetchAllCatalogueCards();
    const cardsById = new Map(catalogue.map((card) => [card.id, card]));
    const deckRows = (rows ?? []) as DeckCardRow[];
    const encodeRows = (zone: DeckCardRow['zone']) =>
      deckRows
        .filter((row) => row.zone === zone)
        .map((row) => {
          const card = cardsById.get(row.card_id);
          if (!card) throw new Error(`Card ${row.card_id} is unavailable.`);
          return { cardCode: cardCodeForDeck(card), count: row.quantity };
        });
    const champion = deck.chosen_champion_id
      ? cardsById.get(deck.chosen_champion_id)
      : null;
    const championEntry = deck.chosen_champion_id
      ? deckRows.some(
          (row) =>
            row.card_id === deck.chosen_champion_id && row.zone === 'main'
        )
      : true;

    if (deck.chosen_champion_id && !champion) {
      throw new Error('The chosen champion is unavailable.');
    }
    if (!championEntry) {
      throw new Error('The chosen champion is not in the main deck.');
    }

    const code = getCodeFromDeck(
      encodeRows('main'),
      encodeRows('sideboard'),
      champion ? cardCodeForDeck(champion) : undefined
    );

    return NextResponse.json({ code });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : 'Deck export failed.',
      },
      { status: 400 }
    );
  }
}
