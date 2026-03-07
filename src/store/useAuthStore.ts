/**
 * Auth store — wraps Supabase authentication.
 *
 * Provides:
 *   - Email/password sign-in and sign-up
 *   - Google OAuth via Expo WebBrowser
 *   - Session persistence across app restarts (via AsyncStorage)
 *   - Real-time auth state updates via onAuthStateChange listener
 */

import { create } from 'zustand';
import { User, Session } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { supabase } from '../lib/supabase';

// ─── State & Actions ──────────────────────────────────────────────────────────

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  initialize: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState & AuthActions>((set) => ({
  user: null,
  session: null,
  isLoading: true,
  error: null,

  // ── Initialize ─────────────────────────────────────────────────────────────
  // Call once on app start. Restores persisted session and subscribes to
  // future auth state changes (token refresh, sign-out from another tab, etc.)

  async initialize() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      set({ session, user: session?.user ?? null, isLoading: false });

      supabase.auth.onAuthStateChange((_event, session) => {
        set({ session, user: session?.user ?? null });
      });
    } catch (e) {
      set({ isLoading: false, error: String(e) });
    }
  },

  // ── Email / Password ───────────────────────────────────────────────────────

  async signInWithEmail(email, password) {
    set({ error: null });
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) set({ error: error.message });
  },

  async signUpWithEmail(email, password) {
    set({ error: null });
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) set({ error: error.message });
  },

  // ── Google OAuth ───────────────────────────────────────────────────────────
  // Uses expo-web-browser to open the Google consent page, then exchanges
  // the returned tokens with Supabase. Works in Expo Go and production builds.

  async signInWithGoogle() {
    set({ error: null });
    try {
      const redirectUrl = makeRedirectUri();

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;
      if (!data.url) throw new Error('No OAuth URL returned from Supabase');

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

      if (result.type === 'success') {
        // Parse tokens from redirect URL
        const url = new URL(result.url);
        // Supabase returns tokens in the fragment (#) as a query string
        const fragment = url.hash.startsWith('#') ? url.hash.slice(1) : url.hash;
        const params = new URLSearchParams(fragment || url.search);

        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (sessionError) throw sessionError;
        }
      }
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e) });
    }
  },

  // ── Sign Out ───────────────────────────────────────────────────────────────

  async signOut() {
    await supabase.auth.signOut();
    set({ user: null, session: null, error: null });
  },

  clearError() {
    set({ error: null });
  },
}));
