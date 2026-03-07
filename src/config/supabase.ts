/**
 * Supabase Configuration
 *
 * Fill in your project URL and anon key from:
 *   Supabase Dashboard → Project Settings → API
 *
 * To enable Google OAuth:
 *   1. Supabase Dashboard → Authentication → Providers → Google → Enable
 *   2. Add your Google OAuth Client ID + Secret (from Google Cloud Console)
 *   3. In Google Cloud Console, add these redirect URIs:
 *        https://<your-project>.supabase.co/auth/v1/callback
 *        exp://localhost:8081  (for Expo Go dev)
 *        your-app-scheme://  (for production builds)
 */

export const SUPABASE_URL = 'https://your-project.supabase.co';
export const SUPABASE_ANON_KEY = 'your-anon-key-here';
