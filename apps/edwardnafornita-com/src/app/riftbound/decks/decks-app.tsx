'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

type DeckSummary = {
  id: string;
  name: string;
  chosen_champion_id: string | null;
  created_at: string;
  updated_at: string;
  riftbound_deck_cards: Array<{ quantity: number; zone: string }>;
};

type DecksAppProps = {
  initialDecks: DeckSummary[];
};

export function DecksApp({ initialDecks }: DecksAppProps) {
  const router = useRouter();
  const [decks, setDecks] = useState(initialDecks);
  const [name, setName] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function createDeck(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError('');

    try {
      const response = await fetch('/api/riftbound/decks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const result = (await response.json()) as {
        deck?: DeckSummary;
        message?: string;
      };
      if (!response.ok || !result.deck) {
        throw new Error(result.message ?? 'The deck could not be created.');
      }
      router.push(`/riftbound/decks/${result.deck.id}`);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'The deck could not be created.'
      );
      setPending(false);
    }
  }

  async function deleteDeck(deck: DeckSummary) {
    if (!window.confirm(`Delete “${deck.name}”? This cannot be undone.`))
      return;

    const previous = decks;
    setDecks((current) => current.filter((item) => item.id !== deck.id));
    setError('');

    try {
      const response = await fetch(
        `/api/riftbound/decks/${encodeURIComponent(deck.id)}`,
        { method: 'DELETE' }
      );
      if (!response.ok) throw new Error('The deck could not be deleted.');
    } catch (requestError) {
      setDecks(previous);
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'The deck could not be deleted.'
      );
    }
  }

  return (
    <>
      <section className="rb-decks-hero">
        <div>
          <p className="rb-eyebrow">Deck workshop</p>
          <h1>Build, tune, and take it anywhere.</h1>
          <p>
            Create private Riftbound decks and export an interoperable deck code
            when you are ready to play elsewhere.
          </p>
        </div>
        <form className="rb-create-deck" onSubmit={createDeck}>
          <label htmlFor="new-deck-name">New deck name</label>
          <div>
            <input
              id="new-deck-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={80}
              placeholder="My new deck"
            />
            <button type="submit" disabled={pending}>
              {pending ? 'Creating…' : 'Create deck'}
            </button>
          </div>
        </form>
      </section>

      {error && (
        <p className="rb-alert" role="alert">
          {error}
        </p>
      )}

      <section className="rb-deck-library" aria-labelledby="deck-library-title">
        <div className="rb-results-heading">
          <div>
            <p className="rb-eyebrow">Your library</p>
            <h2 id="deck-library-title">Saved decks</h2>
          </div>
          <span>{decks.length} decks</span>
        </div>

        {decks.length > 0 ? (
          <div className="rb-deck-library-grid">
            {decks.map((deck) => {
              const mainCount = deck.riftbound_deck_cards
                .filter((card) => card.zone === 'main')
                .reduce((total, card) => total + Number(card.quantity), 0);
              const sideboardCount = deck.riftbound_deck_cards
                .filter((card) => card.zone === 'sideboard')
                .reduce((total, card) => total + Number(card.quantity), 0);

              return (
                <article className="rb-deck-summary" key={deck.id}>
                  <Link href={`/riftbound/decks/${deck.id}`}>
                    <span className="rb-deck-summary-mark" aria-hidden="true">
                      {deck.name.charAt(0).toUpperCase() || 'D'}
                    </span>
                    <span>
                      <strong>{deck.name}</strong>
                      <small>
                        Updated {new Date(deck.updated_at).toLocaleDateString()}
                      </small>
                    </span>
                  </Link>
                  <dl>
                    <div>
                      <dt>Main configuration</dt>
                      <dd>{mainCount}</dd>
                    </div>
                    <div>
                      <dt>Sideboard</dt>
                      <dd>{sideboardCount}</dd>
                    </div>
                    <div>
                      <dt>Champion</dt>
                      <dd>{deck.chosen_champion_id ? 'Set' : '—'}</dd>
                    </div>
                  </dl>
                  <div className="rb-deck-summary-actions">
                    <Link href={`/riftbound/decks/${deck.id}`}>
                      Open builder
                    </Link>
                    <button type="button" onClick={() => deleteDeck(deck)}>
                      Delete
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rb-empty rb-decks-empty">
            <h2>No decks yet</h2>
            <p>Name your first deck above to open the builder.</p>
          </div>
        )}
      </section>
    </>
  );
}
