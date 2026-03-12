export async function generateMetadata({ params }) {
  const { locale } = await params;
  const isEn = locale === 'en';

  return {
    title: isEn ? 'Set new password' : 'Nieuw wachtwoord instellen',
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