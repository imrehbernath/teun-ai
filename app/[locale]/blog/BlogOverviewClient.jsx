// app/[locale]/blog/BlogOverviewClient.jsx
'use client'

import { useState } from 'react'
import { Link } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import Image from 'next/image'

const POSTS_PER_PAGE = 6

export default function BlogOverviewClient({ posts, locale }) {
  const t = useTranslations('blog')
  const [currentPage, setCurrentPage] = useState(1)

  const totalPages = Math.ceil(posts.length / POSTS_PER_PAGE)
  const startIndex = (currentPage - 1) * POSTS_PER_PAGE
  const paginatedPosts = posts.slice(startIndex, startIndex + POSTS_PER_PAGE)

  const stripHtml = (html) => {
    if (!html) return ''
    return html.replace(/<[^>]*>/g, '').replace(/\[&hellip;\]|&hellip;/g, '...').trim()
  }

  const getPageNumbers = () => {
    const pages = []
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1, 2, 3)
      if (currentPage > 4) pages.push('...')
      if (currentPage > 3 && currentPage < totalPages - 2) pages.push(currentPage)
      if (currentPage < totalPages - 3) pages.push('...')
      pages.push(totalPages - 1, totalPages)
    }
    return [...new Set(pages)]
  }

  const handlePageChange = (page) => {
    setCurrentPage(page)
    document.getElementById('bov-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
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
          {paginatedPosts.map((post, index) => {
            const isAboveFold = index < 3 && currentPage === 1
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

      {totalPages > 1 && (
        <div className="bov-pagination">
          <button
            onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="bov-page-nav"
            aria-label={t('previous')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m15 18-6-6 6-6"/>
            </svg>
            {t('previous')}
          </button>

          <div className="bov-page-numbers">
            {getPageNumbers().map((page, i) => (
              page === '...' ? (
                <span key={`ellipsis-${i}`} className="bov-page-ellipsis">…</span>
              ) : (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`bov-page-num ${currentPage === page ? 'active' : ''}`}
                  aria-current={currentPage === page ? 'page' : undefined}
                >
                  {page}
                </button>
              )
            ))}
          </div>

          <button
            onClick={() => currentPage < totalPages && handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="bov-page-nav"
            aria-label={t('next')}
          >
            {t('next')}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m9 18 6-6-6-6"/>
            </svg>
          </button>
        </div>
      )}
    </>
  )
}
