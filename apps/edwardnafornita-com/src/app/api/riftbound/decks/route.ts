import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('riftbound_decks')
    .select(
      'id, name, chosen_champion_id, created_at, updated_at, riftbound_deck_cards(quantity, zone)'
    )
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ decks: data ?? [] });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    name?: unknown;
  } | null;
  const name =
    typeof body?.name === 'string' && body.name.trim()
      ? body.name.trim().slice(0, 80)
      : 'Untitled deck';

  const { data, error } = await supabase
    .from('riftbound_decks')
    .insert({ user_id: user.id, name })
    .select('id, name, chosen_champion_id, created_at, updated_at')
    .single();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ deck: data }, { status: 201 });
}
