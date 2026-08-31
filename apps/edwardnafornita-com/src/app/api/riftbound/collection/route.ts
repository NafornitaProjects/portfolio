import { NextRequest, NextResponse } from 'next/server';
import { fetchCatalogueFilters } from '../../../../lib/riftbound/cards';
import { fetchOwnedCards } from '../../../../lib/riftbound/collection';
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
    const [collection, filters] = await Promise.all([
      fetchOwnedCards(supabase, {
        query: params.get('q')?.trim() || undefined,
        set: params.get('set') || undefined,
        rarity: params.get('rarity') || undefined,
        type: params.get('type') || undefined,
        offset,
        limit,
      }),
      fetchCatalogueFilters(),
    ]);

    return NextResponse.json({
      cards: collection.cards,
      total: collection.total,
      filters,
    });
  } catch (error) {
    console.error('Unable to load the Riftbound collection', error);
    return NextResponse.json(
      { message: 'Your collection is temporarily unavailable.' },
      { status: 502 }
    );
  }
}
