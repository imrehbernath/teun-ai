// app/api/session-token/route.js
// ── Tiny endpoint to expose the httpOnly session token to client components ──
// The teun_session_token cookie is httpOnly (not readable by JavaScript),
// so the signup page fetches it via this server-side route.
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get('teun_session_token')?.value || null

  return NextResponse.json({ sessionToken })
}
