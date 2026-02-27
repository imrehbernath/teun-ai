import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';

/**
 * Haal session_token op uit cookie, of genereer een nieuwe.
 * Returns: { sessionToken, isNew }
 */
export async function getOrCreateSessionToken() {
  const cookieStore = await cookies();
  const existing = cookieStore.get('teun_session_token')?.value;
  
  if (existing) {
    return { sessionToken: existing, isNew: false };
  }
  
  const sessionToken = uuidv4();
  cookieStore.set('teun_session_token', sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,  // 30 dagen
    path: '/',
  });
  
  return { sessionToken, isNew: true };
}

/**
 * Claim alle anonieme data voor een user.
 * Wordt aangeroepen na signup/login.
 */
export async function claimSessionData(supabase, userId, sessionToken) {
  if (!sessionToken || !userId) return { claimed: 0 };
  
  const results = await Promise.allSettled([
    // Claim tool_integrations (AI Visibility scans)
    supabase
      .from('tool_integrations')
      .update({ user_id: userId, claimed_at: new Date().toISOString() })
      .eq('session_token', sessionToken)
      .is('user_id', null),
    
    // Claim prompt_discovery_results
    supabase
      .from('prompt_discovery_results')
      .update({ user_id: userId, claimed_at: new Date().toISOString() })
      .eq('session_token', sessionToken)
      .is('user_id', null),
  ]);
  
  return { 
    claimed: results.filter(r => r.status === 'fulfilled').length,
    results 
  };
}