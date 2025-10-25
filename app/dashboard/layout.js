// app/dashboard/layout.js

export const metadata = {
  title: 'Dashboard - Teun.ai GEO Platform',
  description: 'Jouw persoonlijke GEO dashboard. Bekijk AI visibility scores, commercial prompts en platform performance voor Perplexity, ChatGPT en Google AI Overviews.',
  
  // CRITICAL: Dashboard is PRIVATE - NO INDEXING!
  robots: {
    index: false,
    follow: false,
    nocache: true,
    noarchive: true,
    nosnippet: true,
    noimageindex: true,
  },
  
  // OpenGraph (voor social sharing - maar liever niet delen want private!)
  openGraph: {
    title: 'Dashboard - Teun.ai GEO Platform',
    description: 'Jouw persoonlijke GEO dashboard voor AI visibility monitoring.',
    url: 'https://teun.ai/dashboard',
    siteName: 'Teun.ai',
    locale: 'nl_NL',
    type: 'website',
  },
  
  // Twitter Card
  twitter: {
    card: 'summary',
    title: 'Dashboard - Teun.ai GEO Platform',
    description: 'Jouw persoonlijke GEO dashboard voor AI visibility monitoring.',
  },
  
  // Canonical
  alternates: {
    canonical: 'https://teun.ai/dashboard',
  },
}

export default function DashboardLayout({ children }) {
  return <>{children}</>
}