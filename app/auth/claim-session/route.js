import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { claimSessionData } from '@/lib/session-token';

export async function POST(request) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('teun_session_token')?.value;
  
  if (!sessionToken) {
    return NextResponse.json({ claimed: 0, message: 'No session token' });
  }
  
  // Claim alle anonieme data
  const result = await claimSessionData(supabase, user.id, sessionToken);
  
  // Cookie opruimen (optioneel, of laten staan voor toekomstige scans)
  // cookieStore.delete('teun_session_token');
  
  return NextResponse.json({ 
    success: true, 
    claimed: result.claimed,
    message: 'Session data linked to account' 
  });
}