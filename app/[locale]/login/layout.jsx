import { getTranslations } from 'next-intl/server';

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth' });

  return {
    title: t('login.metaTitle'),
    description: t('login.metaDescription'),
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default function LoginLayout({ children }) {
  return children;
}
