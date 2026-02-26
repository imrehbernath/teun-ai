// app/[locale]/dashboard/layout.js
import { getTranslations } from 'next-intl/server';
import './dashboard.css';

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'dashboard' });

  return {
    title: t('meta.title'),
    description: t('meta.description'),
    robots: {
      index: false,
      follow: false,
      nocache: true,
      noarchive: true,
      nosnippet: true,
      noimageindex: true,
    },
    openGraph: {
      title: t('meta.title'),
      description: t('meta.ogDescription'),
      url: 'https://teun.ai/dashboard',
      siteName: 'Teun.ai',
      locale: locale === 'nl' ? 'nl_NL' : 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title: t('meta.title'),
      description: t('meta.ogDescription'),
    },
    alternates: {
      canonical: 'https://teun.ai/dashboard',
    },
  }
}

export default function DashboardLayout({ children }) {
  return <>{children}</>
}
