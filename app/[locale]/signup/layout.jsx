import { getTranslations } from 'next-intl/server';

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth' });

  return {
    title: t('signup.metaTitle'),
    description: t('signup.metaDescription'),
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default function SignupLayout({ children }) {
  return children;
}
