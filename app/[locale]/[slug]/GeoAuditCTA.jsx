'use client'

import { useTranslations } from 'next-intl'

export default function GeoAuditCTA() {
  const t = useTranslations('blogPost')

  return (
    <section className="teun-final bp-cta" aria-labelledby="bp-cta-heading">
      <div className="wrap">
        <h2 id="bp-cta-heading">
          Volg automatisch.<br /><em>Optimaliseer zelf.</em>
        </h2>
        <p>
          {t('ctaDescription')} Liever hulp? OnlineLabs helpt je met professionele GEO-optimalisatie.
        </p>
        <div className="btns">
          <a href="/pricing" className="btn-secondary">
            Lite, €29,95/mnd
          </a>
          <a href="/pricing" className="btn-primary">
            Pro, €49,95/mnd <span aria-hidden="true">→</span>
          </a>
        </div>
        <div className="bp-cta-links">
          <a href="/tools/ai-visibility" className="bp-link">
            Gratis scan starten <span aria-hidden="true">→</span>
          </a>
          <a
            href="https://www.onlinelabs.nl/skills/geo-optimalisatie"
            target="_blank"
            rel="noopener noreferrer"
            className="bp-link bp-link-muted"
          >
            GEO door OnlineLabs <span aria-hidden="true">→</span>
          </a>
        </div>
        <p className="bp-cta-meta">
          Geen creditcard nodig voor gratis account. Maandelijks opzegbaar.<br />
          Prijzen excl. BTW.
        </p>
      </div>
    </section>
  )
}
