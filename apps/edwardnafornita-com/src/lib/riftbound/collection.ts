import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchAllCatalogueCards, type CardQuery } from './cards';
import type { RiftboundCard } from './types';

type CollectionRow = {
  card_id: string;
  quantity: number;
};

export async function addCollectionQuantities(
  supabase: SupabaseClient,
  cards: RiftboundCard[]
) {
  if (cards.length === 0) return cards;

  const { data, error } = await supabase
    .from('riftbound_collection')
    .select('card_id, quantity')
    .in(
      'card_id',
      cards.map((card) => card.id)
    );

  if (error) throw error;

  const quantities = new Map(
    ((data ?? []) as CollectionRow[]).map((row) => [row.card_id, row.quantity])
  );

  return cards.map((card) => ({
    ...card,
    quantity: quantities.get(card.id) ?? 0,
  }));
}

export async function fetchOwnedCards(
  supabase: SupabaseClient,
  query: CardQuery = {}
) {
  const { data, error } = await supabase
    .from('riftbound_collection')
    .select('card_id, quantity');

  if (error) throw error;

  const rows = (data ?? []) as CollectionRow[];
  if (rows.length === 0) {
    return { cards: [], total: 0, owned: 0, copies: 0 };
  }

  const quantities = new Map(rows.map((row) => [row.card_id, row.quantity]));
  const search = query.query?.toLocaleLowerCase();
  const catalogue = await fetchAllCatalogueCards();
  const matches = catalogue
    .filter((card) => quantities.has(card.id))
    .map((card) => ({ ...card, quantity: quantities.get(card.id) ?? 0 }))
    .filter((card) => {
      if (
        search &&
        !card.name.toLocaleLowerCase().includes(search) &&
        !card.id.toLocaleLowerCase().includes(search) &&
        !card.publicCode?.toLocaleLowerCase().includes(search)
      ) {
        return false;
      }
      if (query.set && card.setId !== query.set) return false;
      if (query.rarity && card.rarity !== query.rarity) return false;
      if (query.type && card.type !== query.type) return false;
      return true;
    })
    .sort((left, right) => left.name.localeCompare(right.name));
  const offset = query.offset ?? 0;
  const limit = query.limit ?? 48;

  return {
    cards: matches.slice(offset, offset + limit),
    total: matches.length,
    owned: rows.length,
    copies: rows.reduce((total, row) => total + row.quantity, 0),
  };
}
