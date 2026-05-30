import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardClient from './DashboardClient'

export const translations = {
  nl: {
    title: 'Dashboard',
    subtitle: 'AI-zichtbaarheid op een plek',
    tabs: { overview: 'Overzicht', prompts: 'Prompts', competitors: 'Concurrenten', geo: 'GEO Optimalisatie' },
    headers: { overview: 'Dashboard', prompts: 'Prompt Tracker', competitors: 'Concurrenten', geo: 'GEO Optimalisatie', audit: 'GEO Audit' },
    subtitles: {
      overview: 'AI-zichtbaarheid van {company} op een plek',
      prompts: 'Per prompt je positie op ChatGPT en Perplexity',
      competitors: 'Wie wordt vaker genoemd dan jij',
      geo: 'Laat AI-assistenten jouw bedrijf aanbevelen',
      audit: 'Scan een pagina op AI-gereedheid',
    },
    stats: {
      visibility: 'Zichtbaarheid',
      avgPosition: 'Gem. positie',
      topCompetitor: 'Top concurrent',
      lastScan: 'Laatste scan',
      mentions: 'vermeldingen',
      promptsFound: 'prompts gevonden',
      allPlatforms: 'over alle platformen',
    },
    chart: { title: 'Zichtbaarheid over tijd', subtitle: 'Percentage prompts waarin je wordt gevonden', total: 'Totaal', emptyTitle: 'Nog te weinig metingen', emptyBody: 'Je eerste wekelijkse meting verschijnt na de eerstvolgende scan. Daarna groeit de grafiek elke week.', lastUpdate: 'Laatste meting', nextUpdate: 'Volgende meting' },
    autoScan: {
      title: 'Wekelijkse auto-scan',
      description: 'Volgt je 10 commerciële prompts op ChatGPT, Perplexity, Google AI Mode en AI Overviews',
      nextScan: 'Volgende meting',
      statusOn: 'Aan',
      statusOff: 'Uit',
      upgradeTitle: 'Auto-scan vanaf Pro',
      upgradeBody: '1x per week ChatGPT, Perplexity, Google AI Mode en AI Overviews automatisch checken',
      upgradeCta: 'Bekijk plannen',
    },
    promptTracker: { prompt: 'Prompt', trend: 'Trend', found: 'gevonden', editPrompts: 'Prompts aanpassen', maxPrompts: 'Max {max} prompts' },
    competitors: {
      title: 'Concurrenten in AI-antwoorden', add: '+ Toevoegen',
      vsTitle: 'Jij vs. topconcurrent', vsSubtitle: 'Vergelijking per prompt',
      yourVisibility: 'Jouw zichtbaarheid', attention: 'Aandachtspunt', vsPrevMonth: 'vs vorige maand',
    },
    audit: {
      techScore: 'Technische GEO Score', contentTitle: 'Content Analyse',
      contentSubtitle: 'Hoe goed is je content voor AI-citatie',
      good: 'Goed', improve: 'Te verbeteren',
      statusGood: '✓ Goed', statusWarn: '⚠ Aandacht', statusFail: '✕ Ontbreekt',
      runAudit: 'GEO Audit uitvoeren', runAuditDesc: 'Analyseer je website op AI-gereedheid',
    },
    quickWins: { title: 'Quick Wins', subtitle: 'Acties met de meeste impact', impact: 'Impact', effort: 'Moeite' },
    platform: { title: 'Per platform', subtitle: 'Waar word je het best gevonden', topCompetitors: 'Top concurrenten' },
    sidebar: {
      platform: 'GEO Platform', tools: 'Tools',
      brandCheck: 'Brand Check', rankTracker: 'Rank Tracker',
      geoAnalyse: 'GEO Optimalisatie DIY', contentOptimizer: 'Content Optimizer',
      free: 'gratis', soon: 'soon',
    },
    rescan: 'Heranalyse',
    googleScan: {
      title: 'Scan ook Google AI Mode en AI Overviews',
      desc: 'Je hebt ChatGPT en Perplexity gescand. Meet nu je zichtbaarheid op Google AI Mode en AI Overviews met dezelfde prompts.',
      scanBoth: 'Beide scannen',
      scanning: 'Scannen',
    },
    loading: 'Dashboard laden...',
    noData: 'Voer eerst een AI Visibility scan uit',
    noDataDesc: 'Start een scan om je AI-zichtbaarheid te meten en je dashboard te vullen.',
    startScan: 'AI Visibility scan starten',
    noCompetitors: 'Nog geen concurrenten gevonden',
    recentRankChecks: 'Recente Rank Checks',
    basicChecks: 'Basis checks',
    websiteReachable: 'Website bereikbaar',
    aiVisibility: 'AI-zichtbaarheid',
    promptsNotFound: 'prompts niet gevonden',
    optimizeContent: 'Optimaliseer je content voor de prompts waar je nog niet zichtbaar bent.',
    mentioned: 'wordt {count}× genoemd',
    analyzeCompetitor: 'Analyseer wat je topconcurrent anders doet en pas je content aan.',
    improveVisibility: '{platform} zichtbaarheid verbeteren',
    lowerScore: 'Je scoort lager op {platform}. Focus op de content-eisen van dit platform.',
    keepOptimizing: 'Blijf je content optimaliseren',
    onTrack: 'Je bent op de goede weg!',
    competitorMentioned: '{name} wordt in {count} van je prompts genoemd. Analyseer hun content om je eigen zichtbaarheid te verbeteren.',
    competitorsDetected: '{count} concurrenten gedetecteerd',
    noCompetitorsFound: 'Geen concurrenten gevonden',
    promptsCoverage: 'Prompt dekking',
    promptsWithMention: '{found}/{total} prompts met vermelding',
    competitivePosition: 'Concurrentiepositie',
    selectCompany: 'Selecteer bedrijf',
    geoPromo: {
      headline: 'Weet precies wat AI over je zegt',
      description: 'GEO Optimalisatie koppelt je Search Console data aan AI-analyses. Je ziet per pagina hoe zichtbaar je bent in ChatGPT, Perplexity en Google AI, en krijgt concrete optimalisatietips.',
      videoPlaceholder: 'Bekijk hoe het werkt',
      features: [
        'Search Console koppeling voor al je pagina\'s',
        'Per pagina AI-zichtbaarheid en GEO score',
        'Concrete optimalisatietips per pagina',
        'Track je voortgang over tijd',
      ],
      cta: 'Upgrade naar PRO',
      price: '\u20AC49 per maand \u00B7 maandelijks opzegbaar',
      activeDesc: 'Je hebt GEO Optimalisatie PRO. Start een analyse om je pagina\'s te optimaliseren.',
      activeCta: 'GEO Optimalisatie DIY starten',
    },
  },
  en: {
    title: 'Dashboard',
    subtitle: 'AI visibility in one place',
    tabs: { overview: 'Overview', prompts: 'Prompts', competitors: 'Competitors', geo: 'GEO Optimization' },
    headers: { overview: 'Dashboard', prompts: 'Prompt Tracker', competitors: 'Competitors', geo: 'GEO Optimization', audit: 'GEO Audit' },
    subtitles: {
      overview: 'AI visibility of {company} in one place',
      prompts: 'Your position per prompt on ChatGPT and Perplexity',
      competitors: 'Who gets mentioned more than you',
      geo: 'Get AI assistants to recommend your business',
      audit: 'Scan a page for AI readiness',
    },
    stats: {
      visibility: 'Visibility', avgPosition: 'Avg. position', topCompetitor: 'Top competitor',
      lastScan: 'Last scan', mentions: 'mentions', promptsFound: 'prompts found', allPlatforms: 'across all platforms',
    },
    chart: { title: 'Visibility over time', subtitle: 'Percentage of prompts where you are found', total: 'Total', emptyTitle: 'Not enough measurements yet', emptyBody: 'Your first weekly measurement will appear after the next scan. The chart grows every week after that.', lastUpdate: 'Last measurement', nextUpdate: 'Next measurement' },
    autoScan: {
      title: 'Weekly auto-scan',
      description: 'Tracks your 10 commercial prompts on ChatGPT, Perplexity, Google AI Mode and AI Overviews',
      nextScan: 'Next measurement',
      statusOn: 'On',
      statusOff: 'Off',
      upgradeTitle: 'Auto-scan from Pro',
      upgradeBody: 'Auto-check ChatGPT, Perplexity, Google AI Mode and AI Overviews once a week',
      upgradeCta: 'View plans',
    },
    promptTracker: { prompt: 'Prompt', trend: 'Trend', found: 'found', editPrompts: 'Edit prompts', maxPrompts: 'Max {max} prompts' },
    competitors: {
      title: 'Competitors in AI responses', add: '+ Add',
      vsTitle: 'You vs. top competitor', vsSubtitle: 'Comparison per prompt',
      yourVisibility: 'Your visibility', attention: 'Attention point', vsPrevMonth: 'vs last month',
    },
    audit: {
      techScore: 'Technical GEO Score', contentTitle: 'Content Analysis',
      contentSubtitle: 'How well is your content optimized for AI citation',
      good: 'Good', improve: 'To improve',
      statusGood: '✓ Good', statusWarn: '⚠ Attention', statusFail: '✕ Missing',
      runAudit: 'Run GEO Audit', runAuditDesc: 'Analyze your website for AI readiness',
    },
    quickWins: { title: 'Quick Wins', subtitle: 'Actions with the most impact', impact: 'Impact', effort: 'Effort' },
    platform: { title: 'Per platform', subtitle: 'Where you are found most', topCompetitors: 'Top competitors' },
    sidebar: {
      platform: 'GEO Platform', tools: 'Tools',
      brandCheck: 'Brand Check', rankTracker: 'Rank Tracker',
      geoAnalyse: 'GEO Optimization DIY', contentOptimizer: 'Content Optimizer',
      free: 'free', soon: 'soon',
    },
    rescan: 'Re-analyze',
    googleScan: {
      title: 'Also scan Google AI Mode and AI Overviews',
      desc: 'You\'ve scanned ChatGPT and Perplexity. Now measure your visibility on Google AI Mode and AI Overviews using the same prompts.',
      scanBoth: 'Scan both',
      scanning: 'Scanning',
    },
    loading: 'Loading dashboard...',
    noData: 'Run an AI Visibility scan first',
    noDataDesc: 'Start a scan to measure your AI visibility and populate your dashboard.',
    startScan: 'Start AI Visibility scan',
    noCompetitors: 'No competitors found yet',
    recentRankChecks: 'Recent Rank Checks',
    basicChecks: 'Basic checks',
    websiteReachable: 'Website reachable',
    aiVisibility: 'AI visibility',
    promptsNotFound: 'prompts not found',
    optimizeContent: 'Optimize your content for prompts where you are not yet visible.',
    mentioned: 'mentioned {count} times',
    analyzeCompetitor: 'Analyze what your top competitor does differently and adjust your content.',
    improveVisibility: 'Improve {platform} visibility',
    lowerScore: 'You score lower on {platform}. Focus on this platform\'s content requirements.',
    keepOptimizing: 'Keep optimizing your content',
    onTrack: 'You are on the right track!',
    competitorMentioned: '{name} is mentioned in {count} of your prompts. Analyze their content to improve your own visibility.',
    competitorsDetected: '{count} competitors detected',
    noCompetitorsFound: 'No competitors found',
    promptsCoverage: 'Prompt coverage',
    promptsWithMention: '{found}/{total} prompts with mention',
    competitivePosition: 'Competitive position',
    selectCompany: 'Select company',
    geoPromo: {
      headline: 'Know exactly what AI says about you',
      description: 'GEO Optimization connects your Search Console data to AI analyses. See per page how visible you are in ChatGPT, Perplexity and Google AI, with actionable optimization tips.',
      videoPlaceholder: 'See how it works',
      features: [
        'Search Console integration for all your pages',
        'Per-page AI visibility and GEO score',
        'Actionable optimization tips per page',
        'Track your progress over time',
      ],
      cta: 'Upgrade to PRO',
      price: '\u20AC49/month \u00B7 cancel anytime',
      activeDesc: 'You have GEO Optimization PRO. Start an analysis to optimize your pages.',
      activeCta: 'Start GEO Optimization DIY',
    },
  },
}

export async function generateMetadata({ params }) {
  const { locale } = await params
  const t = translations[locale] || translations.nl
  return { title: t.title, description: t.subtitle }
}

export default async function DashboardPage({ params }) {
  const { locale } = await params
  const t = translations[locale] || translations.nl

  let user = null
  try {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser()
    user = data?.user || null
  } catch (e) {
    // Auth check failed
  }

  if (!user) {
    redirect(locale === 'nl' ? '/login?redirect=dashboard' : `/en/login?redirect=dashboard`)
  }

  return <DashboardClient locale={locale} t={t} userId={user.id} userEmail={user.email} />
}
