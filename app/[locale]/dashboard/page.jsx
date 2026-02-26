import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardClient from './DashboardClient'

const translations = {
  nl: {
    title: 'Dashboard',
    subtitle: 'AI-zichtbaarheid op een plek',
    tabs: { overview: 'Overzicht', prompts: 'Prompts', competitors: 'Concurrenten', audit: 'GEO Audit' },
    headers: { overview: 'Dashboard', prompts: 'Prompt Tracker', competitors: 'Concurrenten', audit: 'GEO Audit' },
    subtitles: {
      overview: 'AI-zichtbaarheid van {company} op een plek',
      prompts: 'Per prompt je positie op ChatGPT en Perplexity',
      competitors: 'Wie wordt vaker genoemd dan jij',
      audit: 'Technische en content optimalisatie',
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
    chart: { title: 'Zichtbaarheid over tijd', subtitle: 'Percentage prompts waarin je wordt gevonden', total: 'Totaal' },
    promptTracker: { prompt: 'Prompt', trend: 'Trend', found: 'gevonden', editPrompts: 'Prompts aanpassen', maxPrompts: 'Max {max} prompts in BETA' },
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
      geoAnalyse: 'GEO Analyse', contentOptimizer: 'Content Optimizer',
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
  },
  en: {
    title: 'Dashboard',
    subtitle: 'AI visibility in one place',
    tabs: { overview: 'Overview', prompts: 'Prompts', competitors: 'Competitors', audit: 'GEO Audit' },
    headers: { overview: 'Dashboard', prompts: 'Prompt Tracker', competitors: 'Competitors', audit: 'GEO Audit' },
    subtitles: {
      overview: 'AI visibility of {company} in one place',
      prompts: 'Your position per prompt on ChatGPT and Perplexity',
      competitors: 'Who gets mentioned more than you',
      audit: 'Technical and content optimization',
    },
    stats: {
      visibility: 'Visibility', avgPosition: 'Avg. position', topCompetitor: 'Top competitor',
      lastScan: 'Last scan', mentions: 'mentions', promptsFound: 'prompts found', allPlatforms: 'across all platforms',
    },
    chart: { title: 'Visibility over time', subtitle: 'Percentage of prompts where you are found', total: 'Total' },
    promptTracker: { prompt: 'Prompt', trend: 'Trend', found: 'found', editPrompts: 'Edit prompts', maxPrompts: 'Max {max} prompts in BETA' },
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
      geoAnalyse: 'GEO Analysis', contentOptimizer: 'Content Optimizer',
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
  },
}

export async function generateMetadata({ params }) {
  const { locale } = await params
  const t = translations[locale] || translations.nl
  return { title: `${t.title} | Teun.ai`, description: t.subtitle }
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
    redirect(`/${locale}/login?redirect=dashboard`)
  }

  return <DashboardClient locale={locale} t={t} userId={user.id} userEmail={user.email} />
}
