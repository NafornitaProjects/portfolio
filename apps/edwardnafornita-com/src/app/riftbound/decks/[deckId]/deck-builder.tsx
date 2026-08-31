'use client';

import { getCodeFromDeck } from '@piltoverarchive/riftbound-deck-codes';
import Image from 'next/image';
import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import type { CardPage, RiftboundCard } from '../../../../lib/riftbound/types';
import {
  cardCodeForDeck,
  championTagForLegend,
  deckSection,
  isEligibleChosenChampion,
  type DeckCard,
  type DeckZone,
  type RiftboundDeck,
} from '../../../../lib/riftbound/decks';

type DeckBuilderProps = {
  deck: RiftboundDeck;
  initialData: CardPage;
  initialDeckCards: DeckCard[];
};

type Filters = {
  query: string;
  set: string;
  rarity: string;
};

type BuildStep = 'legend' | 'main' | 'battlefields' | 'runes';

const BUILD_STEPS: Array<{
  id: BuildStep;
  title: string;
  heading: string;
  description: string;
  section: string;
  target: number;
  addLabel: string;
}> = [
  {
    id: 'legend',
    title: 'Legend',
    heading: 'Select a legend',
    description: 'Your legend defines the champion and domains for this deck.',
    section: 'Legend',
    target: 1,
    addLabel: 'Select legend',
  },
  {
    id: 'main',
    title: 'Main deck',
    heading: 'Build your main deck',
    description:
      'Add 40 units, gear, and spells, then denote one Unit as your champion.',
    section: 'Main deck',
    target: 40,
    addLabel: '+ Main deck',
  },
  {
    id: 'battlefields',
    title: 'Battlefields',
    heading: 'Select your battlefields',
    description: 'Choose 3 battlefields for the deck.',
    section: 'Battlefields',
    target: 3,
    addLabel: '+ Battlefield',
  },
  {
    id: 'runes',
    title: 'Runes',
    heading: 'Select your runes',
    description: 'Finish the deck with 12 runes.',
    section: 'Runes',
    target: 12,
    addLabel: '+ Rune',
  },
];

const PAGE_SIZE = 48;

function titleCase(value: string) {
  return value
    .split(/[_-]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function entryKey(cardId: string, zone: DeckZone) {
  return `${zone}:${cardId}`;
}

function PoolCard({
  card,
  quantity,
  pending,
  disabled,
  addLabel,
  onAdd,
}: {
  card: RiftboundCard;
  quantity: number;
  pending: boolean;
  disabled: boolean;
  addLabel: string;
  onAdd: (card: RiftboundCard) => void;
}) {
  const image = card.imageThumb?.small ?? card.imageThumb?.medium ?? card.image;
  const transposeArtwork =
    card.orientation === 'landscape' ||
    card.type?.toLocaleLowerCase() === 'battlefield';

  return (
    <article className="rb-deck-pool-card">
      <Link
        className={`rb-card-image ${transposeArtwork ? 'is-transposed' : ''}`}
        href={`/riftbound/cards/${encodeURIComponent(card.id)}`}
        prefetch={false}
        aria-label={`View ${card.name}`}
      >
        {image ? (
          <span className="rb-card-art">
            <Image
              src={image}
              alt={`${card.name} Riftbound card`}
              fill
              sizes="(max-width: 700px) 42vw, 145px"
              placeholder={card.imageBlurDataUrl ? 'blur' : 'empty'}
              blurDataURL={card.imageBlurDataUrl ?? undefined}
            />
          </span>
        ) : (
          <span className="rb-deck-pool-placeholder">No image</span>
        )}
      </Link>
      <div className="rb-deck-pool-copy">
        <strong title={card.name}>{card.name}</strong>
        <small>
          {card.publicCode ?? `${card.setId}-${card.collectorNumber}`} ·{' '}
          {card.type ?? 'Card'}
        </small>
        <div>
          <button
            type="button"
            disabled={pending || disabled}
            onClick={() => onAdd(card)}
          >
            {addLabel}
            {quantity > 0 ? ` · ${quantity}` : ''}
          </button>
        </div>
      </div>
    </article>
  );
}

function DeckRow({
  entry,
  pending,
  champion,
  onChange,
}: {
  entry: DeckCard;
  pending: boolean;
  champion: boolean;
  onChange: (entry: DeckCard, quantity: number) => void;
}) {
  const image = entry.card.imageThumb?.small ?? entry.card.image;

  return (
    <div className={`rb-deck-row ${champion ? 'is-champion' : ''}`}>
      <Link
        href={`/riftbound/cards/${encodeURIComponent(entry.card.id)}`}
        prefetch={false}
      >
        {image ? (
          <Image src={image} alt="" width={42} height={59} sizes="42px" />
        ) : (
          <span className="rb-deck-row-placeholder" />
        )}
      </Link>
      <div className="rb-deck-row-copy">
        <strong>{entry.card.name}</strong>
        <small>
          {entry.card.publicCode ?? entry.card.id}
          {champion && ' · Chosen champion'}
        </small>
      </div>
      <div className="rb-deck-row-quantity">
        <button
          type="button"
          onClick={() => onChange(entry, entry.quantity - 1)}
          disabled={pending}
          aria-label={`Remove one ${entry.card.name}`}
        >
          −
        </button>
        <output>{entry.quantity}</output>
        <button
          type="button"
          onClick={() => onChange(entry, entry.quantity + 1)}
          disabled={pending || entry.quantity >= 999}
          aria-label={`Add one ${entry.card.name}`}
        >
          +
        </button>
      </div>
    </div>
  );
}

function CountPill({
  label,
  value,
  target,
}: {
  label: string;
  value: number;
  target: number;
}) {
  const state =
    value === target ? 'is-complete' : value > target ? 'is-over' : '';
  return (
    <div className={`rb-deck-count ${state}`}>
      <span>{label}</span>
      <strong>
        {value}/{target}
      </strong>
    </div>
  );
}

export function DeckBuilder({
  deck,
  initialData,
  initialDeckCards,
}: DeckBuilderProps) {
  const [name, setName] = useState(deck.name);
  const savedName = useRef(deck.name);
  const [chosenChampionId, setChosenChampionId] = useState(
    deck.chosenChampionId
  );
  const [entries, setEntries] = useState(initialDeckCards);
  const [data, setData] = useState(initialData);
  const [currentStep, setCurrentStep] = useState<BuildStep>('legend');
  const [filters, setFilters] = useState<Filters>({
    query: '',
    set: '',
    rarity: '',
  });
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pendingCards, setPendingCards] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');
  const [exportCode, setExportCode] = useState('');
  const [copied, setCopied] = useState(false);
  const initialRequest = useRef(true);
  const legend = entries.find(
    (entry) =>
      entry.zone === 'main' && entry.card.type?.toLocaleLowerCase() === 'legend'
  );
  const legendDomainsKey = [...(legend?.card.domains ?? [])]
    .map((domain) => domain.toLocaleLowerCase())
    .sort()
    .join(',');

  useEffect(() => {
    const timer = window.setTimeout(
      () => setDebouncedQuery(filters.query.trim()),
      250
    );
    return () => window.clearTimeout(timer);
  }, [filters.query]);

  useEffect(() => {
    if (initialRequest.current) {
      initialRequest.current = false;
      return;
    }

    const controller = new AbortController();
    const params = new URLSearchParams({
      offset: String(page * PAGE_SIZE),
      limit: String(PAGE_SIZE),
      deck_section: currentStep,
    });
    if (debouncedQuery) params.set('q', debouncedQuery);
    if (filters.set) params.set('set', filters.set);
    if (filters.rarity) params.set('rarity', filters.rarity);
    if (currentStep !== 'legend') {
      params.set('deck_domains', legendDomainsKey || '_none');
    }

    setLoading(true);
    fetch(`/api/riftbound/cards?${params}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('Unable to load cards.');
        return (await response.json()) as CardPage;
      })
      .then(setData)
      .catch((requestError: Error) => {
        if (requestError.name !== 'AbortError') setError(requestError.message);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [
    currentStep,
    debouncedQuery,
    filters.rarity,
    filters.set,
    legendDomainsKey,
    page,
  ]);

  const entryMap = useMemo(
    () =>
      new Map(
        entries.map((entry) => [entryKey(entry.card.id, entry.zone), entry])
      ),
    [entries]
  );
  const mainEntries = entries.filter((entry) => entry.zone === 'main');
  const sideboardEntries = entries.filter(
    (entry) => entry.zone === 'sideboard'
  );
  const championCandidates = legend
    ? mainEntries
        .filter((entry) => isEligibleChosenChampion(entry.card, legend.card))
        .sort((left, right) => left.card.name.localeCompare(right.card.name))
    : [];
  const championTag = legend ? championTagForLegend(legend.card) : null;
  const chosenChampionIsEligible = championCandidates.some(
    (entry) => entry.card.id === chosenChampionId
  );
  const sections = ['Legend', 'Main deck', 'Battlefields', 'Runes'].map(
    (title) => ({
      title,
      entries: mainEntries
        .filter((entry) => deckSection(entry.card) === title)
        .sort(
          (left, right) =>
            (left.card.stats?.energy ?? 99) -
              (right.card.stats?.energy ?? 99) ||
            left.card.name.localeCompare(right.card.name)
        ),
    })
  );
  if (sideboardEntries.length > 0) {
    sections.push({
      title: 'Sideboard',
      entries: [...sideboardEntries].sort((left, right) =>
        left.card.name.localeCompare(right.card.name)
      ),
    });
  }
  const countBySection = (section: string) =>
    mainEntries
      .filter((entry) => deckSection(entry.card) === section)
      .reduce((total, entry) => total + entry.quantity, 0);
  const mainCount = countBySection('Main deck');
  const runeCount = countBySection('Runes');
  const battlefieldCount = countBySection('Battlefields');
  const legendCount = countBySection('Legend');
  const stepCounts: Record<BuildStep, number> = {
    legend: legendCount,
    main: mainCount,
    battlefields: battlefieldCount,
    runes: runeCount,
  };
  const stepComplete: Record<BuildStep, boolean> = {
    legend: legendCount === 1,
    main: mainCount === 40 && chosenChampionIsEligible,
    battlefields: battlefieldCount === 3,
    runes: runeCount === 12,
  };
  const stepUnlocked: Record<BuildStep, boolean> = {
    legend: true,
    main: stepComplete.legend,
    battlefields: stepComplete.legend,
    runes: stepComplete.legend,
  };
  const activeStep =
    BUILD_STEPS.find((step) => step.id === currentStep) ?? BUILD_STEPS[0];
  const activeCount = stepCounts[currentStep];
  const deckComplete = Object.values(stepComplete).every(Boolean);
  const currentStepIndex = BUILD_STEPS.findIndex(
    (step) => step.id === currentStep
  );
  const nextBuildStep = BUILD_STEPS[currentStepIndex + 1];
  const pages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));

  function changeFilter(key: keyof Filters, value: string) {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(0);
  }

  function goToStep(step: BuildStep) {
    if (!stepUnlocked[step]) return;
    setCurrentStep(step);
    setData((current) => ({ ...current, cards: [], total: 0 }));
    setFilters({ query: '', set: '', rarity: '' });
    setDebouncedQuery('');
    setPage(0);
    setError('');
  }

  function continueBuilding() {
    if (nextBuildStep && stepUnlocked[nextBuildStep.id]) {
      goToStep(nextBuildStep.id);
    }
  }

  async function saveName(event?: FormEvent) {
    event?.preventDefault();
    const nextName = name.trim();
    if (!nextName) {
      setName(savedName.current);
      return;
    }
    if (nextName === savedName.current) return;

    try {
      const response = await fetch(`/api/riftbound/decks/${deck.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nextName }),
      });
      if (!response.ok) throw new Error('The deck name could not be saved.');
      savedName.current = nextName;
      setName(nextName);
    } catch (requestError) {
      setName(savedName.current);
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'The deck name could not be saved.'
      );
    }
  }

  async function changeChampion(cardId: string | null) {
    if (
      cardId &&
      !championCandidates.some((entry) => entry.card.id === cardId)
    ) {
      setError(
        'That card is not an eligible Champion Unit for the selected Legend.'
      );
      return;
    }

    const previous = chosenChampionId;
    setChosenChampionId(cardId);
    setError('');
    try {
      const response = await fetch(`/api/riftbound/decks/${deck.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chosenChampionId: cardId }),
      });
      if (!response.ok)
        throw new Error('The chosen champion could not be saved.');
      setExportCode('');
      if (cardId === null && currentStepIndex > 1) goToStep('main');
    } catch (requestError) {
      setChosenChampionId(previous);
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'The chosen champion could not be saved.'
      );
    }
  }

  async function changeEntry(entry: DeckCard, nextQuantity: number) {
    const key = entryKey(entry.card.id, entry.zone);
    if (pendingCards.has(key)) return;
    const quantity = Math.max(0, Math.min(999, nextQuantity));
    const section = deckSection(entry.card);
    const sectionStep = BUILD_STEPS.find((step) => step.section === section);

    if (
      entry.zone === 'main' &&
      quantity > entry.quantity &&
      sectionStep &&
      stepCounts[sectionStep.id] >= sectionStep.target
    ) {
      setError(`${sectionStep.title} already has ${sectionStep.target} cards.`);
      return;
    }
    if (
      entry.zone === 'main' &&
      quantity < entry.quantity &&
      sectionStep &&
      BUILD_STEPS.findIndex((step) => step.id === sectionStep.id) <
        currentStepIndex
    ) {
      goToStep(sectionStep.id);
    }
    const previousEntries = entries;

    setPendingCards((current) => new Set(current).add(key));
    setEntries((current) =>
      quantity === 0
        ? current.filter(
            (item) =>
              !(item.card.id === entry.card.id && item.zone === entry.zone)
          )
        : current.map((item) =>
            item.card.id === entry.card.id && item.zone === entry.zone
              ? { ...item, quantity }
              : item
          )
    );
    setError('');

    try {
      const endpoint = `/api/riftbound/decks/${
        deck.id
      }/cards/${encodeURIComponent(entry.card.id)}`;
      const response = await fetch(
        quantity === 0 ? `${endpoint}?zone=${entry.zone}` : endpoint,
        quantity === 0
          ? { method: 'DELETE' }
          : {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ zone: entry.zone, quantity }),
            }
      );
      if (!response.ok) throw new Error('The deck change could not be saved.');
      if (
        quantity === 0 &&
        (chosenChampionId === entry.card.id || section === 'Legend')
      ) {
        await changeChampion(null);
      }
      setExportCode('');
    } catch (requestError) {
      setEntries(previousEntries);
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'The deck change could not be saved.'
      );
    } finally {
      setPendingCards((current) => {
        const next = new Set(current);
        next.delete(key);
        return next;
      });
    }
  }

  function addCard(card: RiftboundCard) {
    if (deckSection(card) !== activeStep.section) {
      setError(
        `That card cannot be added during the ${activeStep.title} step.`
      );
      return;
    }
    if (activeCount >= activeStep.target) {
      setError(
        `${activeStep.title} already has ${activeStep.target} cards. Remove one before adding another.`
      );
      return;
    }

    const existing = entryMap.get(entryKey(card.id, 'main'));
    if (existing) {
      void changeEntry(existing, existing.quantity + 1);
    } else {
      const entry = { card, zone: 'main', quantity: 0 } satisfies DeckCard;
      setEntries((current) => [...current, { ...entry, quantity: 1 }]);
      void persistNewEntry(entry);
    }
  }

  async function persistNewEntry(entry: DeckCard) {
    const key = entryKey(entry.card.id, entry.zone);
    setPendingCards((current) => new Set(current).add(key));
    setError('');
    try {
      const response = await fetch(
        `/api/riftbound/decks/${deck.id}/cards/${encodeURIComponent(
          entry.card.id
        )}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ zone: entry.zone, quantity: 1 }),
        }
      );
      if (!response.ok) throw new Error('The card could not be added.');
      setExportCode('');
      return true;
    } catch (requestError) {
      setEntries((current) =>
        current.filter(
          (item) =>
            !(item.card.id === entry.card.id && item.zone === entry.zone)
        )
      );
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'The card could not be added.'
      );
      return false;
    } finally {
      setPendingCards((current) => {
        const next = new Set(current);
        next.delete(key);
        return next;
      });
    }
  }

  function exportDeck() {
    setError('');
    setCopied(false);
    try {
      const encodeEntries = (zone: DeckZone) =>
        entries
          .filter((entry) => entry.zone === zone)
          .map((entry) => ({
            cardCode: cardCodeForDeck(entry.card),
            count: entry.quantity,
          }));
      const champion = chosenChampionId
        ? entries.find(
            (entry) =>
              entry.zone === 'main' && entry.card.id === chosenChampionId
          )
        : null;

      if (
        !champion ||
        !legend ||
        !isEligibleChosenChampion(champion.card, legend.card)
      ) {
        throw new Error(
          'Choose an eligible Champion Unit for this Legend before exporting.'
        );
      }

      setExportCode(
        getCodeFromDeck(
          encodeEntries('main'),
          encodeEntries('sideboard'),
          cardCodeForDeck(champion.card)
        )
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'The deck could not be exported.'
      );
    }
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(exportCode);
      setCopied(true);
    } catch {
      setError('Copy failed. Select the code and copy it manually.');
    }
  }

  return (
    <>
      <section className="rb-builder-heading">
        <div>
          <Link className="rb-back-link" href="/riftbound/decks">
            <span aria-hidden="true">←</span> All decks
          </Link>
          <form onSubmit={saveName}>
            <label className="sr-only" htmlFor="deck-name">
              Deck name
            </label>
            <input
              id="deck-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              onBlur={() => void saveName()}
              maxLength={80}
            />
          </form>
          <p>Changes save automatically.</p>
        </div>
        <button
          className="rb-export-button"
          type="button"
          onClick={exportDeck}
          disabled={!deckComplete}
        >
          Export deck code
        </button>
      </section>

      <nav className="rb-build-flow" aria-label="Deck-building steps">
        <ol>
          {BUILD_STEPS.map((step, index) => {
            const current = step.id === currentStep;
            const complete = stepComplete[step.id];
            const unlocked = stepUnlocked[step.id];
            return (
              <li key={step.id}>
                <button
                  className={`${current ? 'is-current' : ''} ${
                    complete ? 'is-complete' : ''
                  }`}
                  type="button"
                  onClick={() => goToStep(step.id)}
                  disabled={!unlocked}
                  aria-current={current ? 'step' : undefined}
                >
                  <span>{complete ? '✓' : index + 1}</span>
                  <strong>{step.title}</strong>
                  <small>
                    {stepCounts[step.id]}/{step.target}
                  </small>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="rb-deck-counts" aria-label="Deck counts">
        <CountPill label="Legend" value={legendCount} target={1} />
        <CountPill label="Main deck" value={mainCount} target={40} />
        <CountPill label="Battlefields" value={battlefieldCount} target={3} />
        <CountPill label="Runes" value={runeCount} target={12} />
      </div>

      {legend && (
        <label className="rb-champion-control">
          <span>
            <strong>Chosen Champion</strong>
            <small>
              Choose an eligible {championTag ?? 'matching'} Champion Unit
              already included in your main deck.
            </small>
          </span>
          <select
            value={chosenChampionIsEligible ? chosenChampionId ?? '' : ''}
            onChange={(event) =>
              void changeChampion(event.target.value || null)
            }
            disabled={championCandidates.length === 0}
          >
            <option value="">
              {championCandidates.length > 0
                ? 'Select your champion…'
                : `Add a ${championTag ?? 'matching'} Champion Unit first`}
            </option>
            {championCandidates.map((entry) => (
              <option value={entry.card.id} key={entry.card.id}>
                {entry.card.name} · {entry.card.publicCode ?? entry.card.id}
              </option>
            ))}
          </select>
        </label>
      )}

      {error && (
        <p className="rb-alert" role="alert">
          {error}
        </p>
      )}

      {exportCode && (
        <section className="rb-deck-export" aria-labelledby="deck-code-title">
          <div>
            <p className="rb-eyebrow">Portable deck code</p>
            <h2 id="deck-code-title">Ready to import</h2>
            <p>
              Copy this standard Riftbound deck code into RiftAtlas or another
              compatible deck tool.
            </p>
          </div>
          <textarea
            value={exportCode}
            readOnly
            aria-label="Exported deck code"
          />
          <button type="button" onClick={copyCode}>
            {copied ? 'Copied' : 'Copy code'}
          </button>
        </section>
      )}

      <div className="rb-builder-layout">
        <section className="rb-card-pool" aria-labelledby="card-pool-title">
          <div className="rb-builder-section-heading">
            <div>
              <p className="rb-eyebrow">
                Step {currentStepIndex + 1} of {BUILD_STEPS.length}
              </p>
              <h2 id="card-pool-title">{activeStep.heading}</h2>
              <p className="rb-step-description">{activeStep.description}</p>
              {(currentStep === 'main' || currentStep === 'runes') &&
                legend && (
                  <p className="rb-domain-limit">
                    Eligible domains:{' '}
                    {legend.card.domains.length > 0
                      ? legend.card.domains.join(' + ')
                      : 'Domainless cards'}
                  </p>
                )}
              {currentStep === 'main' && (
                <p className="rb-champion-status">
                  Champion:{' '}
                  {chosenChampionIsEligible ? 'selected' : 'not selected'}
                </p>
              )}
            </div>
            <span>{data.total.toLocaleString()} results</span>
          </div>
          <div className="rb-builder-filters">
            <input
              type="search"
              value={filters.query}
              onChange={(event) => changeFilter('query', event.target.value)}
              placeholder="Search cards"
              aria-label="Search cards"
            />
            <select
              value={filters.set}
              onChange={(event) => changeFilter('set', event.target.value)}
              aria-label="Filter by set"
            >
              <option value="">All sets</option>
              {data.filters.sets.map((value) => (
                <option value={value} key={value}>
                  {value}
                </option>
              ))}
            </select>
            <select
              value={filters.rarity}
              onChange={(event) => changeFilter('rarity', event.target.value)}
              aria-label="Filter by rarity"
            >
              <option value="">All rarities</option>
              {data.filters.rarities.map((value) => (
                <option value={value} key={value}>
                  {titleCase(value)}
                </option>
              ))}
            </select>
          </div>
          <div
            className={`rb-deck-pool-grid ${loading ? 'is-loading' : ''}`}
            aria-busy={loading}
          >
            {data.cards.map((card) => (
              <PoolCard
                key={card.id}
                card={card}
                quantity={
                  entryMap.get(entryKey(card.id, 'main'))?.quantity ?? 0
                }
                pending={pendingCards.has(entryKey(card.id, 'main'))}
                disabled={activeCount >= activeStep.target}
                addLabel={activeStep.addLabel}
                onAdd={addCard}
              />
            ))}
          </div>
          {!loading && data.cards.length === 0 && (
            <div className="rb-step-empty">
              No eligible cards match these filters.
            </div>
          )}
          {pages > 1 && (
            <nav className="rb-pagination" aria-label="Card pool pages">
              <button
                type="button"
                disabled={page === 0 || loading}
                onClick={() => setPage((current) => current - 1)}
              >
                Previous
              </button>
              <span>
                Page {page + 1} of {pages}
              </span>
              <button
                type="button"
                disabled={page + 1 >= pages || loading}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </button>
            </nav>
          )}
          <div className="rb-step-actions">
            <span>
              {activeCount}/{activeStep.target} {activeStep.title.toLowerCase()}
              {currentStep === 'main' && !chosenChampionId
                ? ' · choose a champion to continue'
                : ''}
            </span>
            {currentStepIndex < BUILD_STEPS.length - 1 ? (
              <button
                type="button"
                onClick={continueBuilding}
                disabled={!nextBuildStep || !stepUnlocked[nextBuildStep.id]}
              >
                Continue to {nextBuildStep?.title}
              </button>
            ) : (
              <button
                type="button"
                onClick={exportDeck}
                disabled={!deckComplete}
              >
                Export completed deck
              </button>
            )}
          </div>
        </section>

        <aside className="rb-deck-list" aria-labelledby="deck-list-title">
          <div className="rb-builder-section-heading">
            <div>
              <p className="rb-eyebrow">Current build</p>
              <h2 id="deck-list-title">Deck list</h2>
            </div>
            <span>{entries.length} unique</span>
          </div>
          {sections.map((section) => (
            <section className="rb-deck-section" key={section.title}>
              <h3>
                {section.title}
                <span>
                  {section.entries.reduce(
                    (total, entry) => total + entry.quantity,
                    0
                  )}
                </span>
              </h3>
              {section.entries.length > 0 ? (
                <div>
                  {section.entries.map((entry) => (
                    <DeckRow
                      key={entryKey(entry.card.id, entry.zone)}
                      entry={entry}
                      pending={pendingCards.has(
                        entryKey(entry.card.id, entry.zone)
                      )}
                      champion={chosenChampionId === entry.card.id}
                      onChange={changeEntry}
                    />
                  ))}
                </div>
              ) : (
                <p>None added</p>
              )}
            </section>
          ))}
        </aside>
      </div>
    </>
  );
}
