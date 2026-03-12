import { getTranslations } from 'next-intl/server';

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const isEn = locale === 'en';

  return {
    title: isEn ? 'Forgot password | Teun.ai' : 'Wachtwoord vergeten | Teun.ai',
    description: isEn ? 'Reset your Teun.ai password' : 'Reset je Teun.ai wachtwoord',
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default function ForgotPasswordLayout({ children }) {
  return children;
}