// app/[locale]/blog/BlogOverviewClient.jsx
'use client'

import { Link } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import Image from 'next/image'

export default function BlogOverviewClient({ posts, locale }) {
  const t = useTranslations('blog')

  const stripHtml = (html) => {
    if (!html) return ''
    return html.replace(/<[^>]*>/g, '').replace(/\[&hellip;\]|&hellip;/g, '...').trim()
  }

  const dateLocale = locale === 'en' ? 'en-GB' : 'nl-NL'

  return (
    <>
      {posts.length === 0 ? (
        <div className="bov-empty">
          <p>{t('noArticles')}</p>
        </div>
      ) : (
        <div className="bov-grid" id="bov-grid">
          {posts.map((post, index) => {
            const isAboveFold = index < 3
            return (
              <Link
                key={post.id}
                href={`/${post.slug}`}
                className="bov-card"
              >
                <div className="bov-card-img-wrap" style={{ position: 'relative' }}>
                  {post.featuredImage?.node?.sourceUrl ? (
                    <Image
                      src={post.featuredImage.node.sourceUrl}
                      alt={post.featuredImage.node.altText || post.title}
                      fill
                      className="bov-card-img"
                      priority={isAboveFold}
                      loading={isAboveFold ? undefined : 'lazy'}
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="bov-card-img-placeholder" aria-hidden="true">
                      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
                        <circle cx="9" cy="9" r="2"/>
                        <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
                      </svg>
                    </div>
                  )}
                </div>

                <div className="bov-card-body">
                  <div className="bov-card-meta">
                    <time className="bov-card-date">
                      {new Date(post.date).toLocaleDateString(dateLocale, {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </time>
                    <span className="bov-card-arrow" aria-hidden="true">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M7 17 17 7"/><path d="M7 7h10v10"/>
                      </svg>
                    </span>
                  </div>

                  <h2 className="bov-card-title">{post.title}</h2>

                  <p className="bov-card-excerpt">
                    {stripHtml(post.excerpt)}
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </>
  )
}