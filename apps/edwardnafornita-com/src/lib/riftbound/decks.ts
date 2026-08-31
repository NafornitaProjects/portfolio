import type { RiftboundCard } from './types';

export type DeckZone = 'main' | 'sideboard';

export type DeckCardRow = {
  card_id: string;
  quantity: number;
  zone: DeckZone;
};

export type RiftboundDeck = {
  id: string;
  name: string;
  chosenChampionId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DeckCard = {
  card: RiftboundCard;
  quantity: number;
  zone: DeckZone;
};

const CHAMPION_TAG_BY_LEGEND_TITLE: Record<string, string> = {
  'bashful bloom': 'Lillia',
  'battle mistress': 'Sivir',
  'blade dancer': 'Irelia',
  'blind monk': 'Lee Sin',
  'bloodharbor ripper': 'Pyke',
  'bounty hunter': 'Miss Fortune',
  'butcher of the sands': 'Renekton',
  'chem-baroness': 'Renata Glasc',
  'curator of the sands': 'Nasus',
  'dark child': 'Annie',
  'daughter of the void': "Kai'Sa",
  deceiver: 'LeBlanc',
  'defender of tomorrow': 'Jayce',
  'emperor of the sands': 'Azir',
  'eye of twilight': 'Shen',
  'fire below the mountain': 'Ornn',
  gloomist: 'Vex',
  'glorious executioner': 'Draven',
  'grand duelist': 'Fiora',
  'grandmaster at arms': 'Jax',
  'green father': 'Ivern',
  'hand of noxus': 'Darius',
  'heart of the tempest': 'Kennen',
  'herald of the arcane': 'Viktor',
  'keeper of the hammer': 'Poppy',
  'lady of luminosity': 'Lux',
  'loose cannon': 'Jinx',
  'master of shadows': 'Zed',
  'matriarch of war': 'Ambessa',
  'mechanized menace': 'Rumble',
  'might of demacia': 'Garen',
  'nine-tailed fox': 'Ahri',
  'piltover enforcer': 'Vi',
  pridestalker: 'Rengar',
  'prodigal explorer': 'Ezreal',
  purifier: 'Lucian',
  'radiant dawn': 'Leona',
  'relentless storm': 'Volibear',
  'rogue assassin': 'Akali',
  'scorn of the moon': 'Diana',
  "soul's reflection": 'Mel',
  'swift scout': 'Teemo',
  'the boss': 'Sett',
  unforgiven: 'Yasuo',
  virtuoso: 'Hwei',
  'void burrower': "Rek'Sai",
  voidreaver: "Kha'Zix",
  'wuju bladesman': 'Master Yi',
  'wuju master': 'Master Yi',
};

function normalizeChampionTag(value: string) {
  return value.replace(/[’‘]/g, "'").trim().toLocaleLowerCase();
}

export function championTagForLegend(legend: RiftboundCard) {
  if (legend.type?.toLocaleLowerCase() !== 'legend') return null;
  const legendName = legend.name.replace(/\s+-\s+starter$/i, '').trim();
  const title = normalizeChampionTag(legendName);
  const explicitChampionTag = legendName.includes(',')
    ? legendName.split(',')[0]?.trim() || null
    : null;
  return CHAMPION_TAG_BY_LEGEND_TITLE[title] ?? explicitChampionTag;
}

export function isEligibleChosenChampion(
  card: RiftboundCard,
  legend: RiftboundCard
) {
  const championTag = championTagForLegend(legend);
  if (!championTag || card.type?.toLocaleLowerCase() !== 'unit') return false;

  const cardTag = card.name.split(',')[0] ?? '';
  const allowedDomains = new Set(
    legend.domains.map((domain) => domain.toLocaleLowerCase())
  );
  const matchesDomainIdentity = card.domains.every((domain) =>
    allowedDomains.has(domain.toLocaleLowerCase())
  );

  return (
    normalizeChampionTag(cardTag) === normalizeChampionTag(championTag) &&
    matchesDomainIdentity
  );
}

export function cardCodeForDeck(card: RiftboundCard) {
  const publicCode = card.publicCode?.split('/')[0]?.trim();
  if (publicCode) return publicCode.replace(/\*$/, 's');

  const collectorNumber = String(card.collectorNumber).padStart(3, '0');
  const variant = card.variant === 'star' ? 's' : card.variant;
  return `${card.setId.toUpperCase()}-${collectorNumber}${variant}`;
}

export function deckSection(card: RiftboundCard) {
  switch (card.type?.toLocaleLowerCase()) {
    case 'legend':
      return 'Legend';
    case 'rune':
      return 'Runes';
    case 'battlefield':
      return 'Battlefields';
    default:
      return 'Main deck';
  }
}
