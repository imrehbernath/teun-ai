'use client';

import { useState } from 'react';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import Image from 'next/image';

const POSTS_PER_PAGE = 6;

export default function BlogOverviewClient({ posts, categories, locale }) {
  const t = useTranslations('blog');
  const [activeFilter, setActiveFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Main categories mapping (translated names, WP slugs stay the same)
  const mainCategories = [
    { name: t('catAll'), slug: 'all', icon: '📚' },
    { name: t('catGeo'), slug: 'geo-ai-zichtbaarheid', icon: '🤖' },
    { name: t('catSeo'), slug: 'seo-techniek', icon: '⚙️' },
    { name: t('catTools'), slug: 'tools-analyses', icon: '🔧' },
    { name: t('catCases'), slug: 'cases-experimenten', icon: '🧪' },
    { name: t('catStrategy'), slug: 'toekomst-strategie', icon: '🚀' },
    { name: 'Academy', slug: 'academy', icon: '🎓' },
  ];

  // Filter posts based on active category
  const filteredPosts = activeFilter === 'all' 
    ? posts 
    : posts.filter(post => 
        post.categories?.nodes?.some(cat => cat.slug === activeFilter)
      );

  // Pagination
  const totalPages = Math.ceil(filteredPosts.length / POSTS_PER_PAGE);
  const startIndex = (currentPage - 1) * POSTS_PER_PAGE;
  const paginatedPosts = filteredPosts.slice(startIndex, startIndex + POSTS_PER_PAGE);

  // Check which categories have content
  const hasContent = (slug) => {
    if (slug === 'all') return true;
    return posts.some(post => 
      post.categories?.nodes?.some(cat => cat.slug === slug)
    );
  };

  // Strip HTML from excerpt
  const stripHtml = (html) => {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, '').replace(/\[&hellip;\]|&hellip;/g, '...').trim();
  };

  // Generate page numbers with ellipsis
  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1, 2, 3);
      if (currentPage > 4) pages.push('...');
      if (currentPage > 3 && currentPage < totalPages - 2) pages.push(currentPage);
      if (currentPage < totalPages - 3) pages.push('...');
      pages.push(totalPages - 1, totalPages);
    }
    return [...new Set(pages)];
  };

  const handleFilterChange = (slug) => {
    setActiveFilter(slug);
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    document.getElementById('blog-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const dateLocale = locale === 'en' ? 'en-GB' : 'nl-NL';

  return (
    <>
      {/* Category Filters */}
      <div className="flex flex-wrap gap-2 justify-start items-center mb-8" id="blog-grid">
        {mainCategories.map((category) => {
          const categoryHasContent = hasContent(category.slug);
          
          if (categoryHasContent) {
            return (
              <button
                key={category.slug}
                onClick={() => handleFilterChange(category.slug)}
                className={`group flex items-center gap-2 px-4 py-2 rounded-full border transition-all font-medium text-sm ${
                  activeFilter === category.slug
                    ? 'bg-slate-900 border-slate-900 text-white'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400 hover:text-slate-900'
                }`}
              >
                <span className="text-base">{category.icon}</span>
                <span>{category.name}</span>
              </button>
            );
          }
          
          return (
            <div
              key={category.slug}
              className="group relative flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-full border border-slate-100 cursor-not-allowed text-sm"
              title={t('comingSoon')}
            >
              <span className="text-base grayscale opacity-40">{category.icon}</span>
              <span className="text-slate-300">{category.name}</span>
            </div>
          );
        })}
      </div>

      {/* Active filter indicator */}
      {activeFilter !== 'all' && (
        <div className="mb-6 flex items-center justify-between">
          <p className="text-slate-500 text-sm">
            {t('articlesInCategory', { count: filteredPosts.length, category: mainCategories.find(c => c.slug === activeFilter)?.name })}
          </p>
          <button
            onClick={() => handleFilterChange('all')}
            className="text-slate-500 hover:text-slate-900 font-medium text-sm flex items-center gap-1.5 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            {t('clearFilter')}
          </button>
        </div>
      )}

      {/* Blog Cards Grid */}
      {filteredPosts.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-slate-400 text-lg">{t('noArticles')}</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-7">
          {paginatedPosts.map((post, index) => {
            const isAboveFold = index < 3 && currentPage === 1;
            
            return (
              <Link
                key={post.id}
                href={`/${post.slug}`}
                className="group bg-white rounded-xl overflow-hidden border border-slate-200/60 hover:shadow-lg hover:border-slate-300 transition-all duration-300 flex flex-col"
              >
                {/* Card Image */}
                <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                  {post.featuredImage?.node?.sourceUrl ? (
                    <Image
                      src={post.featuredImage.node.sourceUrl}
                      alt={post.featuredImage.node.altText || post.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      priority={isAboveFold}
                      loading={isAboveFold ? undefined : 'lazy'}
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                      <svg className="w-12 h-12 text-slate-300" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Card Content */}
                <div className="p-5 lg:p-6 flex flex-col flex-grow">
                  {/* Date + Arrow */}
                  <div className="flex items-center justify-between mb-2.5">
                    <time className="text-xs text-slate-400 font-medium">
                      {new Date(post.date).toLocaleDateString(dateLocale, {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </time>
                    <span className="w-7 h-7 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 group-hover:border-slate-900 group-hover:text-slate-900 transition-colors shrink-0">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M17 7H7M17 7v10" />
                      </svg>
                    </span>
                  </div>

                  {/* Title (from WP, not translated) */}
                  <h2 className="text-base lg:text-[17px] font-semibold text-slate-900 leading-snug mb-2 group-hover:text-slate-700 transition-colors line-clamp-2">
                    {post.title}
                  </h2>

                  {/* Excerpt (from WP, not translated) */}
                  <p className="text-sm text-slate-500 leading-relaxed line-clamp-2 mb-4 flex-grow">
                    {stripHtml(post.excerpt)}
                  </p>

                  {/* Category Tag (from WP) */}
                  {post.categories?.nodes?.[0] && (
                    <span className="inline-block text-xs font-medium text-slate-500 bg-slate-100 rounded-full px-3 py-1 self-start">
                      {post.categories.nodes[0].name}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-12 pt-8 border-t border-slate-200">
          {/* Previous */}
          <button
            onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
              currentPage === 1
                ? 'text-slate-300 cursor-not-allowed'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            {t('previous')}
          </button>

          {/* Page Numbers */}
          <div className="flex items-center gap-1">
            {getPageNumbers().map((page, i) => (
              page === '...' ? (
                <span key={`ellipsis-${i}`} className="w-9 h-9 flex items-center justify-center text-sm text-slate-400">
                  …
                </span>
              ) : (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-medium transition-colors ${
                    currentPage === page
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {page}
                </button>
              )
            ))}
          </div>

          {/* Next */}
          <button
            onClick={() => currentPage < totalPages && handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
              currentPage === totalPages
                ? 'text-slate-300 cursor-not-allowed'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t('next')}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </>
  );
}
