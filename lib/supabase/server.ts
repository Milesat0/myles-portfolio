import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch {}
        },
      },
    }
  );
}

/**
 * Authenticates with the Supabase SSR cookie session, then checks admin_users
 * using the verified access token. The token is only used after getClaims()
 * has verified it, and is never exposed to the browser.
 */
export async function requireAdmin() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    throw new Error('Supabase is not configured. Add the Supabase environment variables first.');
  }

  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  const userId = claims?.sub as string | undefined;
  if (claimsError || !claims || !userId) return { supabase, user: null, admin: false };

  // getClaims() is the identity check. We use the already-validated access token
  // only to make an RLS-authorized admin_users request.
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) return { supabase, user: claims, admin: false };

  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/admin_users?user_id=eq.${encodeURIComponent(userId)}&select=user_id&limit=1`;
  try {
    const response = await fetch(url, {
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${accessToken}`,
      },
      cache: 'no-store',
    });
    if (!response.ok) {
      console.error('[auth] admin_users check failed:', response.status, await response.text());
      return { supabase, user: claims, admin: false };
    }
    const rows = await response.json();
    return { supabase, user: claims, admin: Array.isArray(rows) && rows.length > 0 };
  } catch (error) {
    console.error('[auth] admin_users check error:', error);
    return { supabase, user: claims, admin: false };
  }
}
