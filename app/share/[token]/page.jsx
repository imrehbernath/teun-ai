import { createServiceClient } from '@/lib/supabase/server'
import DashboardClient from '../../[locale]/dashboard/DashboardClient'
import { translations } from '../../[locale]/dashboard/page'
import ShareViewTracker from './ShareViewTracker'

export const dynamic = 'force-dynamic'

function ShareError({ title, body }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ maxWidth: 480, textAlign: 'center' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1e1e3f', marginBottom: 12 }}>{title}</h1>
        <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.6 }}>{body}</p>
      </div>
    </div>
  )
}

export default async function SharePage({ params }) {
  const { token } = await params

  if (!token || token.length < 16) {
    return <ShareError
      title="Ongeldige link"
      body="Deze deel-link heeft geen geldig formaat. Vraag de eigenaar om een nieuwe link." />
  }

  const db = await createServiceClient()
  const { data: share, error } = await db
    .from('shared_access')
    .select('id, company_name, expires_at, is_active')
    .eq('share_token', token)
    .maybeSingle()

  if (error) {
    console.error('[SharePage] lookup error:', error.message, 'token:', token.slice(0, 12))
    return <ShareError
      title="Er ging iets mis"
      body="We konden de deel-link niet ophalen. Probeer het later nog eens." />
  }

  if (!share) {
    console.warn('[SharePage] share not found for token prefix:', token.slice(0, 12))
    return <ShareError
      title="Link bestaat niet"
      body="Deze deel-link is niet bekend. Mogelijk is de URL niet compleet, of is de link ingetrokken." />
  }

  if (share.is_active === false) {
    return <ShareError
      title="Link is ingetrokken"
      body="De eigenaar heeft deze deel-link gestopt. Vraag een nieuwe link aan." />
  }

  if (share.expires_at && new Date(share.expires_at) < new Date()) {
    return <ShareError
      title="Deze link is verlopen"
      body={`Het AI-zichtbaarheidsrapport van ${share.company_name} is niet meer beschikbaar via deze link. Vraag de eigenaar om een nieuwe deel-link.`} />
  }

  const locale = 'nl'
  const t = translations[locale]

  return (
    <>
      <ShareViewTracker token={token} companyName={share.company_name} />
      <DashboardClient
        locale={locale}
        t={t}
        userId={null}
        userEmail={null}
        shareToken={token}
      />
    </>
  )
}
