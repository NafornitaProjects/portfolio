import { NextRequest, NextResponse } from 'next/server';
import type { DeckZone } from '../../../../../../../lib/riftbound/decks';
import { createClient } from '../../../../../../../lib/supabase/server';

type RouteContext = {
  params: Promise<{ deckId: string; cardId: string }>;
};

function isDeckZone(value: unknown): value is DeckZone {
  return value === 'main' || value === 'sideboard';
}

async function authenticatedDeck(context: RouteContext) {
  const { deckId, cardId } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { deckId, cardId, supabase, user: null, deck: null };

  const { data: deck } = await supabase
    .from('riftbound_decks')
    .select('id')
    .eq('id', deckId)
    .eq('user_id', user.id)
    .maybeSingle();

  return { deckId, cardId, supabase, user, deck };
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { deckId, cardId, supabase, user, deck } = await authenticatedDeck(
    context
  );

  if (!user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  if (!deck) {
    return NextResponse.json({ message: 'Deck not found.' }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) as {
    quantity?: unknown;
    zone?: unknown;
  } | null;

  if (
    !isDeckZone(body?.zone) ||
    typeof body.quantity !== 'number' ||
    !Number.isInteger(body.quantity) ||
    body.quantity < 1 ||
    body.quantity > 999
  ) {
    return NextResponse.json(
      { message: 'Zone and a quantity from 1 through 999 are required.' },
      { status: 400 }
    );
  }

  const { error } = await supabase.from('riftbound_deck_cards').upsert(
    {
      deck_id: deckId,
      card_id: cardId,
      zone: body.zone,
      quantity: body.quantity,
    },
    { onConflict: 'deck_id,card_id,zone' }
  );

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({
    cardId,
    zone: body.zone,
    quantity: body.quantity,
  });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { deckId, cardId, supabase, user, deck } = await authenticatedDeck(
    context
  );

  if (!user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  if (!deck) {
    return NextResponse.json({ message: 'Deck not found.' }, { status: 404 });
  }

  const zone = request.nextUrl.searchParams.get('zone');
  if (!isDeckZone(zone)) {
    return NextResponse.json(
      { message: 'A valid deck zone is required.' },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from('riftbound_deck_cards')
    .delete()
    .eq('deck_id', deckId)
    .eq('card_id', cardId)
    .eq('zone', zone);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ cardId, zone, quantity: 0 });
}
