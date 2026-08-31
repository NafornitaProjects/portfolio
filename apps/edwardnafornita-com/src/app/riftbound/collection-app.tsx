'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CardPage, RiftboundCard } from '../../lib/riftbound/types';
import { SiteHeader } from './site-header';

type CollectionAppProps = {
  initialData: CardPage;
  initialOwned: number;
  initialCopies: number;
  userEmail: string;
  view?: 'catalogue' | 'collection';
};

type Filters = {
  query: string;
  set: string;
  rarity: string;
  type: string;
};

const PAGE_SIZE = 48;

function titleCase(value: string) {
  return value
    .split(/[_-]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function Mark() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M24 3 43 14v20L24 45 5 34V14L24 3Z" />
      <path d="m16 15 16 9-16 9V15Z" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m16.2 16.2 4.1 4.1" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5" />
    </svg>
  );
}

function CardTile({
  card,
  pending,
  onQuantityChange,
  onRemove,
}: {
  card: RiftboundCard;
  pending: boolean;
  onQuantityChange: (card: RiftboundCard, quantity: number) => void;
  onRemove: (card: RiftboundCard) => void;
}) {
  const image = card.imageThumb?.medium ?? card.imageThumb?.large ?? card.image;
  const detailHref = `/riftbound/cards/${encodeURIComponent(card.id)}`;
  const transposeArtwork =
    card.orientation === 'landscape' ||
    card.type?.toLocaleLowerCase() === 'battlefield';

  return (
    <article className={`rb-card ${card.quantity > 0 ? 'is-owned' : ''}`}>
      <Link
        className={`rb-card-image ${transposeArtwork ? 'is-transposed' : ''}`}
        href={detailHref}
        prefetch={false}
        aria-label={`View ${card.name} card details`}
      >
        {image ? (
          <span className="rb-card-art">
            <Image
              src={image}
              alt={`${card.name} Riftbound card`}
              fill
              sizes={
                transposeArtwork
                  ? '(max-width: 520px) 65vw, (max-width: 900px) 42vw, 310px'
                  : '(max-width: 520px) 46vw, (max-width: 900px) 30vw, 220px'
              }
              placeholder={card.imageBlurDataUrl ? 'blur' : 'empty'}
              blurDataURL={card.imageBlurDataUrl ?? undefined}
            />
          </span>
        ) : (
          <div className="rb-image-placeholder">
            <Mark />
          </div>
        )}
        {card.quantity > 0 && (
          <span className="rb-owned-badge">Owned · {card.quantity}</span>
        )}
      </Link>
      <div className="rb-card-copy">
        <div>
          <h2>
            <Link
              className="rb-card-title-link"
              href={detailHref}
              prefetch={false}
            >
              {card.name}
            </Link>
          </h2>
          <p>
            {card.publicCode ?? `${card.setId}-${card.collectorNumber}`} ·{' '}
            {titleCase(card.rarity ?? 'Card')}
          </p>
        </div>
        <div className="rb-card-actions">
          <div className="rb-quantity" aria-label={`Quantity of ${card.name}`}>
            <button
              type="button"
              onClick={() => onQuantityChange(card, card.quantity - 1)}
              disabled={pending || card.quantity === 0}
              aria-label={`Remove one ${card.name}`}
            >
              −
            </button>
            <output aria-live="polite">{card.quantity}</output>
            <button
              type="button"
              onClick={() => onQuantityChange(card, card.quantity + 1)}
              disabled={pending || card.quantity >= 999}
              aria-label={`Add one ${card.name}`}
            >
              +
            </button>
          </div>
          {card.quantity > 0 && (
            <button
              className="rb-delete-card"
              type="button"
              onClick={() => onRemove(card)}
              disabled={pending}
              title={`Remove all ${card.name} copies`}
              aria-label={`Remove all ${card.name} copies from your collection`}
            >
              <TrashIcon />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export function CollectionApp({
  initialData,
  initialOwned,
  initialCopies,
  userEmail,
  view = 'catalogue',
}: CollectionAppProps) {
  const [data, setData] = useState(initialData);
  const [filters, setFilters] = useState<Filters>({
    query: '',
    set: '',
    rarity: '',
    type: '',
  });
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pendingCards, setPendingCards] = useState<Set<string>>(new Set());
  const [owned, setOwned] = useState(initialOwned);
  const [copies, setCopies] = useState(initialCopies);
  const initialRequest = useRef(true);
  const isCollectionView = view === 'collection';

  useEffect(() => {
    const timer = window.setTimeout(
      () => setDebouncedQuery(filters.query.trim()),
      300
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
    });
    if (debouncedQuery) params.set('q', debouncedQuery);
    if (filters.set) params.set('set', filters.set);
    if (filters.rarity) params.set('rarity', filters.rarity);
    if (filters.type) params.set('type', filters.type);

    setLoading(true);
    setError('');
    const endpoint = isCollectionView
      ? '/api/riftbound/collection'
      : '/api/riftbound/cards';
    fetch(`${endpoint}?${params}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('Unable to load the card catalogue.');
        return (await response.json()) as CardPage;
      })
      .then(setData)
      .catch((requestError: Error) => {
        if (requestError.name !== 'AbortError') setError(requestError.message);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [
    debouncedQuery,
    filters.rarity,
    filters.set,
    filters.type,
    isCollectionView,
    page,
  ]);

  const pages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));
  const resultLabel = useMemo(
    () => `${data.total.toLocaleString()} card${data.total === 1 ? '' : 's'}`,
    [data.total]
  );

  function changeFilter(key: keyof Filters, value: string) {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(0);
  }

  async function changeQuantity(
    card: RiftboundCard,
    nextQuantity: number,
    removeAll = false
  ) {
    const quantity = Math.max(0, Math.min(999, nextQuantity));
    const previousQuantity = card.quantity;
    if (quantity === previousQuantity) return;

    setPendingCards((current) => new Set(current).add(card.id));
    setData((current) => ({
      ...current,
      cards: current.cards.map((item) =>
        item.id === card.id ? { ...item, quantity } : item
      ),
    }));
    setCopies((current) => current + quantity - previousQuantity);
    if (previousQuantity === 0 && quantity > 0)
      setOwned((current) => current + 1);
    if (previousQuantity > 0 && quantity === 0)
      setOwned((current) => current - 1);

    try {
      const response = await fetch(
        `/api/riftbound/collection/${encodeURIComponent(card.id)}`,
        removeAll
          ? { method: 'DELETE' }
          : {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ quantity }),
            }
      );
      if (!response.ok) throw new Error('Your change could not be saved.');
      if (isCollectionView && quantity === 0) {
        setData((current) => ({
          ...current,
          cards: current.cards.filter((item) => item.id !== card.id),
          total: Math.max(0, current.total - 1),
        }));
      }
    } catch (requestError) {
      setData((current) => ({
        ...current,
        cards: current.cards.map((item) =>
          item.id === card.id ? { ...item, quantity: previousQuantity } : item
        ),
      }));
      setCopies((current) => current + previousQuantity - quantity);
      if (previousQuantity === 0 && quantity > 0)
        setOwned((current) => current - 1);
      if (previousQuantity > 0 && quantity === 0)
        setOwned((current) => current + 1);
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Your change could not be saved.'
      );
    } finally {
      setPendingCards((current) => {
        const next = new Set(current);
        next.delete(card.id);
        return next;
      });
    }
  }

  return (
    <main className="rb-app">
      <SiteHeader
        active={isCollectionView ? 'collection' : 'cards'}
        userEmail={userEmail}
        ownedCards={owned}
      />

      <section className="rb-hero">
        <div>
          <p className="rb-eyebrow">Personal archive</p>
          <h1>
            {isCollectionView
              ? 'Your collection, at a glance.'
              : 'Know what’s in your collection.'}
          </h1>
          <p className="rb-intro">
            {isCollectionView
              ? 'Every card you’ve logged, gathered in one searchable place.'
              : 'Search every Riftbound printing and keep an exact count of the cards you own.'}
          </p>
        </div>
        <dl className="rb-stats">
          <div>
            <dt>Unique cards</dt>
            <dd>{owned.toLocaleString()}</dd>
          </div>
          <div>
            <dt>Total copies</dt>
            <dd>{copies.toLocaleString()}</dd>
          </div>
        </dl>
      </section>

      <section className="rb-catalogue" aria-labelledby="catalogue-heading">
        <div className="rb-toolbar">
          <label className="rb-search">
            <span className="sr-only">Search cards</span>
            <SearchIcon />
            <input
              type="search"
              value={filters.query}
              onChange={(event) => changeFilter('query', event.target.value)}
              placeholder={
                isCollectionView
                  ? 'Search your collection'
                  : 'Search by card name or code'
              }
            />
          </label>
          <div className="rb-filters">
            <label>
              <span className="sr-only">Set</span>
              <select
                value={filters.set}
                onChange={(event) => changeFilter('set', event.target.value)}
              >
                <option value="">All sets</option>
                {data.filters.sets.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="sr-only">Rarity</span>
              <select
                value={filters.rarity}
                onChange={(event) => changeFilter('rarity', event.target.value)}
              >
                <option value="">All rarities</option>
                {data.filters.rarities.map((value) => (
                  <option key={value} value={value}>
                    {titleCase(value)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="sr-only">Card type</span>
              <select
                value={filters.type}
                onChange={(event) => changeFilter('type', event.target.value)}
              >
                <option value="">All types</option>
                {data.filters.types.map((value) => (
                  <option key={value} value={value}>
                    {titleCase(value)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="rb-results-heading">
          <div>
            <p className="rb-eyebrow">
              {isCollectionView ? 'Your cards' : 'Card catalogue'}
            </p>
            <h2 id="catalogue-heading">
              {isCollectionView ? 'Owned cards' : 'Browse cards'}
            </h2>
          </div>
          <span>{resultLabel}</span>
        </div>

        {error && (
          <p className="rb-alert" role="alert">
            {error}
          </p>
        )}
        <div
          className={`rb-grid ${loading ? 'is-loading' : ''}`}
          aria-busy={loading}
        >
          {data.cards.map((card) => (
            <CardTile
              key={card.id}
              card={card}
              pending={pendingCards.has(card.id)}
              onQuantityChange={changeQuantity}
              onRemove={(item) => changeQuantity(item, 0, true)}
            />
          ))}
        </div>

        {!loading && data.cards.length === 0 && (
          <div className="rb-empty">
            <Mark />
            <h2>
              {isCollectionView && owned === 0
                ? 'Your collection is empty'
                : 'No cards found'}
            </h2>
            <p>
              {isCollectionView && owned === 0
                ? 'Browse the catalogue and add your first card.'
                : 'Try clearing one of your filters.'}
            </p>
            {isCollectionView && owned === 0 && (
              <Link className="rb-empty-link" href="/riftbound">
                Browse all cards
              </Link>
            )}
          </div>
        )}

        {pages > 1 && (
          <nav className="rb-pagination" aria-label="Card catalogue pages">
            <button
              type="button"
              disabled={page === 0 || loading}
              onClick={() => setPage((value) => value - 1)}
            >
              Previous
            </button>
            <span>
              Page {page + 1} of {pages}
            </span>
            <button
              type="button"
              disabled={page + 1 >= pages || loading}
              onClick={() => setPage((value) => value + 1)}
            >
              Next
            </button>
          </nav>
        )}
      </section>

      <footer className="rb-footer">
        <p>
          Riftbound Collection Vault was created under Riot Games&apos;
          &quot;Legal Jibber Jabber&quot; policy using assets owned by Riot
          Games. Riot Games does not endorse or sponsor this project.
        </p>
        <Link href="/">edwardnafornita.com</Link>
      </footer>
    </main>
  );
}
