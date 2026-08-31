import { NextRequest, NextResponse } from 'next/server';
import {
  fetchAllCatalogueCards,
  fetchCatalogueCards,
  fetchCatalogueFilters,
} from '../../../../lib/riftbound/cards';
import { addCollectionQuantities } from '../../../../lib/riftbound/collection';
import { createClient } from '../../../../lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const offset = Math.max(0, Number(params.get('offset') ?? 0) || 0);
  const limit = Math.min(
    96,
    Math.max(1, Number(params.get('limit') ?? 48) || 48)
  );

  try {
    const query = params.get('q')?.trim() || undefined;
    const set = params.get('set') || undefined;
    const rarity = params.get('rarity') || undefined;
    const deckSection = params.get('deck_section');
    const deckDomains = new Set(
      (params.get('deck_domains') ?? '')
        .split(',')
        .map((domain) => domain.trim().toLocaleLowerCase())
        .filter(Boolean)
    );

    const [catalogue, filters] = await Promise.all([
      deckSection
        ? fetchAllCatalogueCards().then((allCards) => {
            const normalizedQuery = query?.toLocaleLowerCase();
            const cards = allCards.filter((card) => {
              const type = card.type?.toLocaleLowerCase();
              const searchable = `${card.name} ${card.publicCode ?? ''} ${
                card.id
              }`.toLocaleLowerCase();
              const belongsInSection =
                (deckSection === 'legend' && type === 'legend') ||
                (deckSection === 'main' &&
                  (type === 'gear' || type === 'spell' || type === 'unit')) ||
                (deckSection === 'battlefields' && type === 'battlefield') ||
                (deckSection === 'runes' && type === 'rune');
              const belongsToLegend =
                deckSection === 'legend' ||
                deckSection === 'battlefields' ||
                deckDomains.size === 0 ||
                card.domains.every((domain) =>
                  deckDomains.has(domain.toLocaleLowerCase())
                );
              return (
                belongsInSection &&
                belongsToLegend &&
                (!normalizedQuery || searchable.includes(normalizedQuery)) &&
                (!set || card.setId === set) &&
                (!rarity || card.rarity === rarity)
              );
            });
            return {
              cards: cards.slice(offset, offset + limit),
              total: cards.length,
            };
          })
        : fetchCatalogueCards({
            query,
            set,
            rarity,
            type: params.get('type') ?? undefined,
            offset,
            limit,
          }),
      fetchCatalogueFilters(),
    ]);

    const cards = await addCollectionQuantities(supabase, catalogue.cards);
    return NextResponse.json({ cards, total: catalogue.total, filters });
  } catch (error) {
    console.error('Unable to load Riftbound cards', error);
    return NextResponse.json(
      { message: 'The card catalogue is temporarily unavailable.' },
      { status: 502 }
    );
  }
}
