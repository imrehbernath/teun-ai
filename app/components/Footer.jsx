import Link from 'next/link';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gradient-to-br from-[#1E1E3F] via-[#2D2D5F] to-[#1E1E3F] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          
          {/* Column 1: Brand */}
          <div className="lg:col-span-1">
            <Link href="/home" className="inline-block mb-4">
              <span className="text-white font-montserrat font-semibold text-[22px] leading-[24px]">
                TEUN.AI
              </span>
            </Link>
            <p className="text-white/70 text-sm leading-relaxed mb-4">
              Word zichtbaar in AI-zoekresultaten met Generative Engine Optimisation (GEO).
            </p>
            <p className="text-white/60 text-xs">
              © {currentYear} Teun.ai. Alle rechten voorbehouden.
            </p>
          </div>

          {/* Column 2: Over GEO */}
          <div>
            <h3 className="text-white font-semibold text-base mb-4">Over GEO</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/over-geo/wat-is-geo" className="text-white/70 hover:text-white text-sm transition-colors">
                  Wat is GEO?
                </Link>
              </li>
              <li>
                <Link href="/over-geo/seo-vs-geo" className="text-white/70 hover:text-white text-sm transition-colors">
                  SEO vs GEO
                </Link>
              </li>
              <li>
                <Link href="/over-geo/6-dimensies" className="text-white/70 hover:text-white text-sm transition-colors">
                  6 Dimensies van GEO
                </Link>
              </li>
              <li>
                <Link href="/blog" className="text-white/70 hover:text-white text-sm transition-colors">
                  Blog & Academy
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Tools */}
          <div>
            <h3 className="text-white font-semibold text-base mb-4">GEO Tools</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/tools/geo-audit" className="text-white/70 hover:text-white text-sm transition-colors">
                  GEO Audit
                </Link>
              </li>
              <li>
                <Link href="/tools/ai-zichtbaarheid" className="text-white/70 hover:text-white text-sm transition-colors">
                  AI Zichtbaarheidsanalyse
                </Link>
              </li>
              <li>
                <Link href="/tools/keyword-relevance" className="text-white/70 hover:text-white text-sm transition-colors">
                  Keyword Relevance Finder
                </Link>
              </li>
              <li>
                <Link href="/tools/entity-builder" className="text-white/70 hover:text-white text-sm transition-colors">
                  Entity Builder
                </Link>
              </li>
              <li>
                <Link href="/tools/structured-data" className="text-white/70 hover:text-white text-sm transition-colors">
                  Structured Data Checker
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Bedrijf */}
          <div>
            <h3 className="text-white font-semibold text-base mb-4">Bedrijf</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/over-ons" className="text-white/70 hover:text-white text-sm transition-colors">
                  Over Teun.ai
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-white/70 hover:text-white text-sm transition-colors">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/early-access" className="text-white/70 hover:text-white text-sm transition-colors">
                  Early Access
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-white/70 hover:text-white text-sm transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-white/70 hover:text-white text-sm transition-colors">
                  Algemene Voorwaarden
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-white/10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-white/60 text-xs">
              Powered by <Link href="https://onlinelabs.nl" target="_blank" className="hover:text-white transition-colors">OnlineLabs</Link>
            </p>
            
            {/* Social Media */}
            <div className="flex gap-4">
              <a 
                href="https://linkedin.com/company/teun-ai" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-white/70 hover:text-white transition-colors"
                aria-label="LinkedIn"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                </svg>
              </a>
              <a 
                href="https://twitter.com/teun_ai" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-white/70 hover:text-white transition-colors"
                aria-label="Twitter"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}