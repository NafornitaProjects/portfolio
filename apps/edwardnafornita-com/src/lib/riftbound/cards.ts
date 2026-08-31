import type {
  CardFilters,
  CardImageThumbnails,
  CardStats,
  RiftboundCard,
  RiftboundCardDetail,
} from './types';

const DEFAULT_API_BASE_URL = 'https://riftscribe.gg';

type CatalogueCard = {
  id: string;
  public_code?: string | null;
  name: string;
  set_id: string;
  collector_number: number;
  variant?: string;
  rarity?: string | null;
  faction?: string | null;
  domains?: string[];
  type?: string | null;
  orientation?: string | null;
  stats?: CardStats | null;
  image?: string | null;
  image_thumb?: CardImageThumbnails | null;
  image_blur_data_url?: string | null;
};

type CatalogueCardDetail = CatalogueCard & {
  description?: string | null;
  flavor_text?: string | null;
  art?: {
    artist?: string | null;
  } | null;
  keywords?: string[];
  tags?: string[];
  is_banned?: boolean;
};

type CatalogueFilters = Partial<CardFilters>;

export type CardQuery = {
  query?: string;
  set?: string;
  rarity?: string;
  type?: string;
  offset?: number;
  limit?: number;
};

function apiUrl(path: string) {
  const baseUrl =
    process.env['RIFTBOUND_CARD_API_BASE_URL'] ?? DEFAULT_API_BASE_URL;
  return new URL(path, baseUrl);
}

export function normalizeCard(card: CatalogueCard): RiftboundCard {
  return {
    id: card.id,
    publicCode: card.public_code ?? null,
    name: card.name,
    setId: card.set_id,
    collectorNumber: card.collector_number,
    variant: card.variant ?? '',
    rarity: card.rarity ?? null,
    faction: card.faction ?? null,
    domains: card.domains ?? [],
    type: card.type ?? null,
    orientation: card.orientation ?? null,
    stats: card.stats ?? null,
    image: card.image ?? null,
    imageThumb: card.image_thumb ?? null,
    imageBlurDataUrl: card.image_blur_data_url ?? null,
    quantity: 0,
  };
}

export async function fetchCatalogueCard(
  cardId: string
): Promise<RiftboundCardDetail | null> {
  const response = await fetch(
    apiUrl(`/api/cards/${encodeURIComponent(cardId)}`),
    {
      headers: { Accept: 'application/json' },
      next: { revalidate: 3600 },
    }
  );

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Card catalogue returned ${response.status}`);
  }

  const card = (await response.json()) as CatalogueCardDetail;
  return {
    ...normalizeCard(card),
    description: card.description ?? null,
    flavorText: card.flavor_text ?? null,
    artist: card.art?.artist ?? null,
    keywords: card.keywords ?? [],
    tags: card.tags ?? [],
    isBanned: card.is_banned ?? false,
  };
}

export async function fetchCatalogueCards(query: CardQuery) {
  const url = apiUrl('/api/cards');
  url.searchParams.set('limit', String(query.limit ?? 48));
  url.searchParams.set('offset', String(query.offset ?? 0));
  if (query.query) url.searchParams.set('q', query.query);
  if (query.set) url.searchParams.set('set_id', query.set);
  if (query.rarity) url.searchParams.set('rarity', query.rarity);
  if (query.type) url.searchParams.set('type', query.type);

  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    throw new Error(`Card catalogue returned ${response.status}`);
  }

  const cards = (await response.json()) as CatalogueCard[];
  return {
    cards: cards.map(normalizeCard),
    total: Number(response.headers.get('x-total-count') ?? cards.length),
  };
}

export async function fetchAllCatalogueCards() {
  const pageSize = 200;
  const firstPage = await fetchCatalogueCards({ limit: pageSize });
  const remainingOffsets = Array.from(
    { length: Math.max(0, Math.ceil(firstPage.total / pageSize) - 1) },
    (_, index) => (index + 1) * pageSize
  );
  const remainingPages = await Promise.all(
    remainingOffsets.map((offset) =>
      fetchCatalogueCards({ limit: pageSize, offset })
    )
  );

  return [...firstPage.cards, ...remainingPages.flatMap((page) => page.cards)];
}

export async function fetchCatalogueFilters(): Promise<CardFilters> {
  const response = await fetch(apiUrl('/api/cards/filters'), {
    headers: { Accept: 'application/json' },
    next: { revalidate: 86_400 },
  });

  if (!response.ok) {
    return { sets: [], factions: [], rarities: [], types: [] };
  }

  const filters = (await response.json()) as CatalogueFilters;
  return {
    sets: filters.sets ?? [],
    factions: filters.factions ?? [],
    rarities: filters.rarities ?? [],
    types: filters.types ?? [],
  };
}
