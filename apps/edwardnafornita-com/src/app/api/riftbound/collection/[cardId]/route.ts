import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../../lib/supabase/server';

type RouteContext = {
  params: Promise<{ cardId: string }>;
};

async function authenticatedRequest(context: RouteContext) {
  const { cardId } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { cardId, supabase, user };
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { cardId, supabase, user } = await authenticatedRequest(context);

  if (!user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    quantity?: unknown;
  } | null;
  const quantity = body?.quantity;

  if (
    typeof quantity !== 'number' ||
    !Number.isInteger(quantity) ||
    quantity < 0 ||
    quantity > 999
  ) {
    return NextResponse.json(
      { message: 'Quantity must be a whole number between 0 and 999.' },
      { status: 400 }
    );
  }

  if (quantity === 0) {
    const { error } = await supabase
      .from('riftbound_collection')
      .delete()
      .eq('user_id', user.id)
      .eq('card_id', cardId);

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }
  } else {
    const { error } = await supabase.from('riftbound_collection').upsert(
      {
        user_id: user.id,
        card_id: cardId,
        quantity,
      },
      { onConflict: 'user_id,card_id' }
    );

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ cardId, quantity });
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { cardId, supabase, user } = await authenticatedRequest(context);

  if (!user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { error } = await supabase
    .from('riftbound_collection')
    .delete()
    .eq('user_id', user.id)
    .eq('card_id', cardId);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ cardId, quantity: 0 });
}
