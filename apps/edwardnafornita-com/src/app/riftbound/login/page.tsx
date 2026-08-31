'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '../../../lib/supabase/client';
import { ThemeToggle } from '../theme-toggle';

function Mark() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M24 3 43 14v20L24 45 5 34V14L24 3Z" />
      <path d="m16 15 16 9-16 9V15Z" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('error')) {
      setMessage('That confirmation link is invalid or has expired.');
    }
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    const supabase = createClient();
    if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/riftbound/auth/callback`,
        },
      });

      setLoading(false);
      if (error) return setMessage(error.message);
      if (!data.session) {
        setMessage('Check your email to confirm your account, then sign in.');
        return;
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      setLoading(false);
      if (error) return setMessage(error.message);
    }

    router.replace('/riftbound');
    router.refresh();
  }

  return (
    <main className="rb-login-page">
      <section className="rb-login-story">
        <Link href="/riftbound" className="rb-login-brand">
          <span className="rb-mark">
            <Mark />
          </span>
          <span>
            <strong>Riftbound</strong>
            <small>Collection vault</small>
          </span>
        </Link>
        <div>
          <p className="rb-eyebrow">Your cards. Clearly counted.</p>
          <h1>A calm place for a growing collection.</h1>
          <p>
            Find any printing, record every copy, and pick up exactly where you
            left off—on any device.
          </p>
        </div>
        <p className="rb-login-legal">
          Riftbound Collection Vault was created under Riot Games&apos;
          &quot;Legal Jibber Jabber&quot; policy using assets owned by Riot
          Games. Riot Games does not endorse or sponsor this project.
        </p>
      </section>

      <section className="rb-login-panel">
        <ThemeToggle />
        <div className="rb-login-card">
          <p className="rb-eyebrow">Private collection</p>
          <h2>{mode === 'login' ? 'Welcome back' : 'Create your vault'}</h2>
          <p className="rb-form-intro">
            {mode === 'login'
              ? 'Sign in to view and update your cards.'
              : 'Create an account to start tracking your collection.'}
          </p>

          <div
            className="rb-auth-tabs"
            role="tablist"
            aria-label="Authentication mode"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'login'}
              onClick={() => {
                setMode('login');
                setMessage('');
              }}
            >
              Sign in
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'signup'}
              onClick={() => {
                setMode('signup');
                setMessage('');
              }}
            >
              Create account
            </button>
          </div>

          <form onSubmit={submit}>
            <label>
              <span>Email address</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
                placeholder="you@example.com"
              />
            </label>
            <label>
              <span>Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={
                  mode === 'login' ? 'current-password' : 'new-password'
                }
                required
                minLength={8}
                placeholder="At least 8 characters"
              />
            </label>
            {message && (
              <p className="rb-form-message" role="status">
                {message}
              </p>
            )}
            <button className="rb-submit" type="submit" disabled={loading}>
              {loading
                ? 'Please wait…'
                : mode === 'login'
                ? 'Sign in to your collection'
                : 'Create account'}
            </button>
          </form>
          <p className="rb-privacy-note">
            Each account has a private collection protected at the database
            level.
          </p>
        </div>
      </section>
    </main>
  );
}
