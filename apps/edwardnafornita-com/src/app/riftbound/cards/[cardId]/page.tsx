import Image from 'next/image';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { formatCardText } from '../../../../lib/riftbound/card-text';
import { fetchCatalogueCard } from '../../../../lib/riftbound/cards';
import { createClient } from '../../../../lib/supabase/server';
import { SiteHeader } from '../../site-header';
import { CardDetailActions } from './card-detail-actions';

type CardDetailPageProps = {
  params: Promise<{ cardId: string }>;
};

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

export default async function CardDetailPage({ params }: CardDetailPageProps) {
  const { cardId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/riftbound/login');

  const [card, { data: collectionCard }] = await Promise.all([
    fetchCatalogueCard(cardId),
    supabase
      .from('riftbound_collection')
      .select('quantity')
      .eq('user_id', user.id)
      .eq('card_id', cardId)
      .maybeSingle(),
  ]);

  if (!card) notFound();

  const quantity = Number(collectionCard?.quantity ?? 0);
  const image = card.image ?? card.imageThumb?.large ?? card.imageThumb?.medium;
  const stats = [
    { label: 'Energy cost', value: card.stats?.energy },
    { label: 'Power cost', value: card.stats?.power },
    { label: 'Might', value: card.stats?.might },
  ];

  return (
    <main className="rb-app rb-detail-page">
      <SiteHeader active="cards" userEmail={user.email ?? 'Collector'} />

      <Link className="rb-back-link" href="/riftbound">
        <span aria-hidden="true">←</span> Back to cards
      </Link>

      <article className="rb-detail">
        <div
          className={`rb-detail-image ${
            card.orientation === 'landscape' ? 'is-landscape' : ''
          }`}
        >
          {image ? (
            <Image
              src={image}
              alt={`${card.name} Riftbound card`}
              fill
              priority
              sizes="(max-width: 760px) 92vw, 43vw"
              placeholder={card.imageBlurDataUrl ? 'blur' : 'empty'}
              blurDataURL={card.imageBlurDataUrl ?? undefined}
            />
          ) : (
            <div className="rb-image-placeholder">
              <Mark />
            </div>
          )}
        </div>

        <div className="rb-detail-content">
          <p className="rb-eyebrow">
            {card.publicCode ?? `${card.setId}-${card.collectorNumber}`}
          </p>
          <h1>{card.name}</h1>
          <p className="rb-detail-subtitle">
            {[card.type, card.rarity && titleCase(card.rarity)]
              .filter(Boolean)
              .join(' · ')}
          </p>

          <dl className="rb-detail-stats">
            {stats.map((stat) => (
              <div key={stat.label}>
                <dt>{stat.label}</dt>
                <dd>{stat.value ?? '—'}</dd>
              </div>
            ))}
          </dl>

          <section className="rb-card-text" aria-labelledby="card-text-heading">
            <p className="rb-eyebrow">Rules</p>
            <h2 id="card-text-heading"></h2>
            <p className="rb-rules-copy">
              {card.description
                ? formatCardText(card.description)
                : 'This card has no rules text.'}
            </p>
            {card.flavorText && (
              <p className="rb-flavor-text">“{card.flavorText}”</p>
            )}
          </section>

          <CardDetailActions
            cardId={card.id}
            cardName={card.name}
            initialQuantity={quantity}
          />

          <dl className="rb-detail-metadata">
            <div>
              <dt>Set</dt>
              <dd>{card.setId}</dd>
            </div>
            <div>
              <dt>Collector no.</dt>
              <dd>{card.collectorNumber}</dd>
            </div>
            <div>
              <dt>Faction</dt>
              <dd>{card.faction ? titleCase(card.faction) : '—'}</dd>
            </div>
            <div>
              <dt>Domains</dt>
              <dd>
                {card.domains.length > 0
                  ? card.domains.map(titleCase).join(', ')
                  : '—'}
              </dd>
            </div>
            {card.keywords.length > 0 && (
              <div className="rb-detail-wide">
                <dt>Keywords</dt>
                <dd>{card.keywords.map(titleCase).join(', ')}</dd>
              </div>
            )}
            {card.artist && (
              <div className="rb-detail-wide">
                <dt>Artist</dt>
                <dd>{card.artist}</dd>
              </div>
            )}
          </dl>
        </div>
      </article>
    </main>
  );
}
