'use client';

import { useState } from 'react';

type CardDetailActionsProps = {
  cardId: string;
  cardName: string;
  initialQuantity: number;
};

export function CardDetailActions({
  cardId,
  cardName,
  initialQuantity,
}: CardDetailActionsProps) {
  const [quantity, setQuantity] = useState(initialQuantity);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function updateQuantity(nextQuantity: number, removeAll = false) {
    if (pending) return;

    const next = Math.max(0, Math.min(999, nextQuantity));
    const previous = quantity;
    if (next === previous) return;

    setQuantity(next);
    setPending(true);
    setError('');

    try {
      const response = await fetch(
        `/api/riftbound/collection/${encodeURIComponent(cardId)}`,
        removeAll
          ? { method: 'DELETE' }
          : {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ quantity: next }),
            }
      );

      if (!response.ok)
        throw new Error('Your collection could not be updated.');
    } catch (requestError) {
      setQuantity(previous);
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Your collection could not be updated.'
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rb-detail-collection">
      <div>
        <p className="rb-detail-action-label">Your collection</p>
        <p aria-live="polite">
          {quantity === 0
            ? 'Not currently owned'
            : `${quantity} ${quantity === 1 ? 'copy' : 'copies'} owned`}
        </p>
      </div>
      <div className="rb-detail-action-buttons">
        <div
          className="rb-detail-stepper"
          aria-label={`Quantity of ${cardName}`}
        >
          <button
            type="button"
            onClick={() => updateQuantity(quantity - 1)}
            disabled={pending || quantity === 0}
            aria-label={`Remove one ${cardName}`}
          >
            −
          </button>
          <output>{quantity}</output>
          <button
            type="button"
            onClick={() => updateQuantity(quantity + 1)}
            disabled={pending || quantity >= 999}
            aria-label={`Add one ${cardName}`}
          >
            +
          </button>
        </div>
        {quantity > 0 && (
          <button
            className="rb-detail-delete"
            type="button"
            onClick={() => updateQuantity(0, true)}
            disabled={pending}
          >
            Remove all
          </button>
        )}
      </div>
      {error && (
        <p className="rb-detail-action-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
