export async function generateMetadata({ params }) {
  const { locale } = await params;
  const isEn = locale === 'en';

  return {
    title: isEn ? 'Set new password | Teun.ai' : 'Nieuw wachtwoord instellen | Teun.ai',
    description: isEn ? 'Set a new password for your Teun.ai account' : 'Stel een nieuw wachtwoord in voor je Teun.ai account',
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default function ResetPasswordLayout({ children }) {
  return children;
}