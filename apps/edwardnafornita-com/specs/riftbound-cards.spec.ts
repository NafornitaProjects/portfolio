import { normalizeCard } from '../src/lib/riftbound/cards';
import { fetchOwnedCards } from '../src/lib/riftbound/collection';
import { formatCardText } from '../src/lib/riftbound/card-text';
import {
  cardCodeForDeck,
  championTagForLegend,
  deckSection,
  isEligibleChosenChampion,
} from '../src/lib/riftbound/decks';
import {
  getCodeFromDeck,
  getDeckFromCode,
} from '@piltoverarchive/riftbound-deck-codes';

describe('formatCardText', () => {
  it('renders exhaust and resource tokens as readable card text', () => {
    expect(
      formatCardText(
        ":rb_exhaust:: [Reaction] — [Add] :rb_rune_fury:. (Abilities that add resources can't be reacted to.)"
      )
    ).toBe(
      "Exhaust: [Reaction] — [Add] Fury Power. (Abilities that add resources can't be reacted to.)"
    );
  });

  it('adds sentence spacing before an exhaust token', () => {
    expect(
      formatCardText(
        'This enters exhausted.:rb_exhaust:: Deal 2 to a unit at a battlefield.'
      )
    ).toBe(
      'This enters exhausted. Exhaust: Deal 2 to a unit at a battlefield.'
    );
  });

  it('separates consecutive keyword abilities into readable blocks', () => {
    expect(
      formatCardText(
        "[Accelerate] (You may pay :rb_energy_1::rb_rune_fury: as an additional cost to have me enter ready.)[Assault 2] (+2 :rb_might: while I'm an attacker.)When you play me, discard 2."
      )
    ).toBe(
      "[Accelerate] (You may pay 1 Energy Fury Power as an additional cost to have me enter ready.)\n\n[Assault 2] (+2 Might while I'm an attacker.)\n\nWhen you play me, discard 2."
    );
  });

  it('formats colon-introduced label and effect entries as a list', () => {
    expect(
      formatCardText(
        "When I move, draw 1, then discard 1. Then, do the following based on the discarded card's type:Spell — Draw 1.Gear — Ready up to 2 runes.Unit — Give me +3 :rb_might: this turn."
      )
    ).toBe(
      "When I move, draw 1, then discard 1. Then, do the following based on the discarded card's type:\n• Spell — Draw 1.\n• Gear — Ready up to 2 runes.\n• Unit — Give me +3 Might this turn."
    );
  });
});

describe('normalizeCard', () => {
  it('maps the catalogue response into the application card model', () => {
    expect(
      normalizeCard({
        id: 'ogn-001-298',
        public_code: 'OGN-001/298',
        name: 'Blazing Scorcher',
        set_id: 'OGN',
        collector_number: 1,
        rarity: 'common',
        domains: ['fury'],
        stats: { energy: 5, might: 5, power: null },
        image_blur_data_url: 'data:image/jpeg;base64,card',
        image_thumb: { medium: 'https://example.com/card.png' },
      })
    ).toEqual({
      id: 'ogn-001-298',
      publicCode: 'OGN-001/298',
      name: 'Blazing Scorcher',
      setId: 'OGN',
      collectorNumber: 1,
      variant: '',
      rarity: 'common',
      faction: null,
      domains: ['fury'],
      type: null,
      orientation: null,
      stats: { energy: 5, might: 5, power: null },
      image: null,
      imageThumb: { medium: 'https://example.com/card.png' },
      imageBlurDataUrl: 'data:image/jpeg;base64,card',
      quantity: 0,
    });
  });

  it('provides stable defaults for optional catalogue fields', () => {
    const card = normalizeCard({
      id: 'sfd-010-221',
      name: 'Test Card',
      set_id: 'SFD',
      collector_number: 10,
    });

    expect(card.quantity).toBe(0);
    expect(card.domains).toEqual([]);
    expect(card.stats).toBeNull();
    expect(card.image).toBeNull();
    expect(card.imageBlurDataUrl).toBeNull();
  });
});

describe('fetchOwnedCards', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    jest.restoreAllMocks();
    if (originalFetch) {
      globalThis.fetch = originalFetch;
    } else {
      Reflect.deleteProperty(globalThis, 'fetch');
    }
  });

  it('returns only catalogue cards owned by the signed-in user', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => '2' },
      json: async () => [
        {
          id: 'ogn-001-298',
          name: 'Owned Card',
          set_id: 'OGN',
          collector_number: 1,
        },
        {
          id: 'ogn-002-298',
          name: 'Not Owned',
          set_id: 'OGN',
          collector_number: 2,
        },
      ],
    } as Response);
    const supabase = {
      from: () => ({
        select: async () => ({
          data: [{ card_id: 'ogn-001-298', quantity: 3 }],
          error: null,
        }),
      }),
    };

    const result = await fetchOwnedCards(supabase as never);

    expect(result.cards).toHaveLength(1);
    expect(result.cards[0]).toMatchObject({
      id: 'ogn-001-298',
      quantity: 3,
    });
    expect(result).toMatchObject({ total: 1, owned: 1, copies: 3 });
  });
});

describe('Riftbound deck exports', () => {
  it('normalizes catalogue public codes for the standard deck-code format', () => {
    const card = normalizeCard({
      id: 'ogn-030a-298',
      public_code: 'OGN-030a/298',
      name: 'Jinx, Demolitionist',
      set_id: 'OGN',
      collector_number: 30,
      type: 'Unit',
    });

    expect(cardCodeForDeck(card)).toBe('OGN-030a');
    expect(deckSection(card)).toBe('Main deck');
  });

  it('produces a code that round-trips main deck, sideboard, and champion', () => {
    const code = getCodeFromDeck(
      [{ cardCode: 'OGN-030', count: 3 }],
      [{ cardCode: 'OGN-017', count: 1 }],
      'OGN-030'
    );

    expect(getDeckFromCode(code)).toEqual({
      mainDeck: [{ cardCode: 'OGN-030', count: 3 }],
      sideboard: [{ cardCode: 'OGN-017', count: 1 }],
      chosenChampion: 'OGN-030',
    });
  });

  it('sorts card categories into the deck-builder sections', () => {
    const card = normalizeCard({
      id: 'ogn-300-298',
      name: 'Test Battlefield',
      set_id: 'OGN',
      collector_number: 300,
      type: 'Battlefield',
    });

    expect(deckSection(card)).toBe('Battlefields');
  });

  it('only permits matching Champion Units as the Chosen Champion', () => {
    const legend = normalizeCard({
      id: 'ogn-251-298',
      name: 'Loose Cannon',
      set_id: 'OGN',
      collector_number: 251,
      type: 'Legend',
      domains: ['Chaos', 'Fury'],
    });
    const jinx = normalizeCard({
      id: 'ogn-030-298',
      name: 'Jinx, Demolitionist',
      set_id: 'OGN',
      collector_number: 30,
      type: 'Unit',
      domains: ['Fury'],
    });
    const vi = normalizeCard({
      id: 'ogn-040-298',
      name: 'Vi, Destructive',
      set_id: 'OGN',
      collector_number: 40,
      type: 'Unit',
      domains: ['Fury'],
    });
    const offDomainJinx = normalizeCard({
      id: 'test-jinx',
      name: 'Jinx, Test Card',
      set_id: 'TST',
      collector_number: 1,
      type: 'Unit',
      domains: ['Calm'],
    });

    expect(championTagForLegend(legend)).toBe('Jinx');
    expect(isEligibleChosenChampion(jinx, legend)).toBe(true);
    expect(isEligibleChosenChampion(vi, legend)).toBe(false);
    expect(isEligibleChosenChampion(offDomainJinx, legend)).toBe(false);
  });

  it('does not treat a matching signature unit as a Champion Unit', () => {
    const legend = normalizeCard({
      id: 'sfd-legend',
      name: 'Dark Child - Starter',
      set_id: 'SFD',
      collector_number: 1,
      type: 'Legend',
      domains: ['Fury'],
    });
    const tibbers = normalizeCard({
      id: 'sfd-tibbers',
      name: 'Tibbers',
      set_id: 'SFD',
      collector_number: 2,
      type: 'Unit',
      domains: ['Fury'],
    });

    expect(championTagForLegend(legend)).toBe('Annie');
    expect(isEligibleChosenChampion(tibbers, legend)).toBe(false);
  });
});
