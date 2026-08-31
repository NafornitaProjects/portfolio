'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase/client';
import { ThemeToggle } from './theme-toggle';

type SiteHeaderProps = {
  active: 'cards' | 'collection' | 'decks';
  userEmail: string;
  ownedCards?: number;
};

function Mark() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M24 3 43 14v20L24 45 5 34V14L24 3Z" />
      <path d="m16 15 16 9-16 9V15Z" />
    </svg>
  );
}

export function SiteHeader({ active, userEmail, ownedCards }: SiteHeaderProps) {
  const router = useRouter();

  async function signOut() {
    await createClient().auth.signOut();
    router.replace('/riftbound/login');
    router.refresh();
  }

  return (
    <header className="rb-header">
      <Link
        className="rb-brand"
        href="/riftbound"
        aria-label="Riftbound collection home"
      >
        <span className="rb-mark">
          <Mark />
        </span>
        <span>
          <strong>Riftbound</strong>
          <small>Collection vault</small>
        </span>
      </Link>
      <nav className="rb-nav" aria-label="Riftbound tools">
        <Link
          href="/riftbound"
          aria-current={active === 'cards' ? 'page' : undefined}
        >
          Browse all
        </Link>
        <Link
          href="/riftbound/collection"
          aria-current={active === 'collection' ? 'page' : undefined}
        >
          My collection
          {ownedCards !== undefined && <span>{ownedCards}</span>}
        </Link>
        <Link
          href="/riftbound/decks"
          aria-current={active === 'decks' ? 'page' : undefined}
        >
          Decks
        </Link>
      </nav>
      <div className="rb-account">
        <span>{userEmail}</span>
        <ThemeToggle />
        <button type="button" onClick={signOut}>
          Sign out
        </button>
      </div>
    </header>
  );
}
