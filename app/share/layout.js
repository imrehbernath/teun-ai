import './share.css'
import GoogleTagManager from '../components/GoogleTagManager'

export const metadata = {
  title: 'Gedeeld AI-rapport — Teun.ai',
  description: 'Read-only AI-zichtbaarheidsrapport',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    noarchive: true,
    nosnippet: true,
    noimageindex: true,
  },
}

export default function ShareLayout({ children }) {
  return (
    <html lang="nl">
      <body className="antialiased" suppressHydrationWarning>
        <GoogleTagManager />
        <div className="teun-dashboard-layout">{children}</div>
      </body>
    </html>
  )
}
