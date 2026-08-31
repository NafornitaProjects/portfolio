export type CardImageThumbnails = {
  small?: string | null;
  medium?: string | null;
  large?: string | null;
};

export type CardStats = {
  energy: number | null;
  might: number | null;
  power: number | null;
};

export type RiftboundCard = {
  id: string;
  publicCode: string | null;
  name: string;
  setId: string;
  collectorNumber: number;
  variant: string;
  rarity: string | null;
  faction: string | null;
  domains: string[];
  type: string | null;
  orientation: string | null;
  stats: CardStats | null;
  image: string | null;
  imageThumb: CardImageThumbnails | null;
  imageBlurDataUrl: string | null;
  quantity: number;
};

export type RiftboundCardDetail = RiftboundCard & {
  description: string | null;
  flavorText: string | null;
  artist: string | null;
  keywords: string[];
  tags: string[];
  isBanned: boolean;
};

export type CardFilters = {
  sets: string[];
  factions: string[];
  rarities: string[];
  types: string[];
};

export type CardPage = {
  cards: RiftboundCard[];
  total: number;
  filters: CardFilters;
};
