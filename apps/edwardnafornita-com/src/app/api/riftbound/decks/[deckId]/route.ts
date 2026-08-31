import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../../lib/supabase/server';

type RouteContext = {
  params: Promise<{ deckId: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { deckId } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    name?: unknown;
    chosenChampionId?: unknown;
  } | null;
  const updates: { name?: string; chosen_champion_id?: string | null } = {};

  if (body && 'name' in body) {
    if (typeof body.name !== 'string' || !body.name.trim()) {
      return NextResponse.json(
        { message: 'Deck name cannot be empty.' },
        { status: 400 }
      );
    }
    updates.name = body.name.trim().slice(0, 80);
  }

  if (body && 'chosenChampionId' in body) {
    if (
      body.chosenChampionId !== null &&
      typeof body.chosenChampionId !== 'string'
    ) {
      return NextResponse.json(
        { message: 'Chosen champion must be a card ID or null.' },
        { status: 400 }
      );
    }
    const chosenChampionId = body.chosenChampionId?.trim() || null;

    if (chosenChampionId) {
      const { data: championEntry, error: championError } = await supabase
        .from('riftbound_deck_cards')
        .select('card_id')
        .eq('deck_id', deckId)
        .eq('card_id', chosenChampionId)
        .eq('zone', 'main')
        .maybeSingle();

      if (championError) {
        return NextResponse.json(
          { message: championError.message },
          { status: 500 }
        );
      }
      if (!championEntry) {
        return NextResponse.json(
          { message: 'The chosen champion must be in the main deck.' },
          { status: 400 }
        );
      }
    }

    updates.chosen_champion_id = chosenChampionId;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { message: 'No valid deck changes were provided.' },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('riftbound_decks')
    .update(updates)
    .eq('id', deckId)
    .eq('user_id', user.id)
    .select('id, name, chosen_champion_id, created_at, updated_at')
    .maybeSingle();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ message: 'Deck not found.' }, { status: 404 });
  }

  return NextResponse.json({ deck: data });
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { deckId } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { error } = await supabase
    .from('riftbound_decks')
    .delete()
    .eq('id', deckId)
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ deckId });
}
