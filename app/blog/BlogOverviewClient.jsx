'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function BlogOverviewClient({ posts, categories }) {
  const [activeFilter, setActiveFilter] = useState('all');

  // Main categories mapping
  const mainCategories = [
    { name: 'Alle artikelen', slug: 'all', icon: '📚' },
    { name: 'GEO & AI-zichtbaarheid', slug: 'geo-ai-zichtbaarheid', icon: '🤖' },
    { name: 'SEO & Techniek', slug: 'seo-techniek', icon: '⚙️' },
    { name: 'Tools & Analyses', slug: 'tools-analyses', icon: '🔧' },
    { name: 'Cases & Experimenten', slug: 'cases-experimenten', icon: '🧪' },
    { name: 'Toekomst & Strategie', slug: 'toekomst-strategie', icon: '🚀' },
    { name: 'Academy', slug: 'academy', icon: '🎓' },
  ];

  // Filter posts based on active category
  const filteredPosts = activeFilter === 'all' 
    ? posts 
    : posts.filter(post => 
        post.categories?.nodes?.some(cat => cat.slug === activeFilter)
      );

  // Check which categories have content
  const hasContent = (slug) => {
    if (slug === 'all') return true;
    return posts.some(post => 
      post.categories?.nodes?.some(cat => cat.slug === slug)
    );
  };

  return (
    <>
      {/* Category Filters */}
      <section className="bg-white py-8 shadow-sm relative z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap gap-3 justify-center items-center">
            {mainCategories.map((category) => {
              const categoryHasContent = hasContent(category.slug);
              
              if (categoryHasContent) {
                return (
                  <button
                    key={category.slug}
                    onClick={() => setActiveFilter(category.slug)}
                    className={`group flex items-center gap-2.5 px-5 py-3 rounded-full border-2 transition-all font-medium text-sm relative z-10 ${
                      activeFilter === category.slug
                        ? 'bg-purple-50 border-purple-400 text-purple-700 shadow-md'
                        : 'bg-gray-50 border-gray-200 text-gray-700 hover:border-purple-300 hover:bg-purple-50 hover:shadow-lg'
                    }`}
                  >
                    <span className={`text-xl transition-transform ${
                      activeFilter === category.slug ? 'scale-110' : 'group-hover:scale-110'
                    }`}>
                      {category.icon}
                    </span>
                    <span className={activeFilter === category.slug ? 'text-purple-700 font-semibold' : 'group-hover:text-purple-700'}>
                      {category.name}
                    </span>
                  </button>
                );
              }
              
              // Disabled category with tooltip
              return (
                <div
                  key={category.slug}
                  className="group relative flex items-center gap-2.5 px-5 py-3 bg-gray-100 rounded-full border-2 border-gray-200 cursor-not-allowed font-medium text-sm"
                  title="Binnenkort beschikbaar"
                >
                  <span className="text-xl grayscale opacity-40">{category.icon}</span>
                  <span className="text-gray-400">{category.name}</span>
                  
                  {/* Tooltip */}
                  <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100]">
                    <div className="bg-gray-950 text-white text-xs font-semibold rounded-lg px-4 py-2 whitespace-nowrap shadow-2xl">
                      Binnenkort
                      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-gray-950"></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Blog Grid */}
      <section className="bg-white py-12 lg:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Active filter indicator */}
          {activeFilter !== 'all' && (
            <div className="mb-8 flex items-center justify-between">
              <p className="text-gray-600">
                Toont {filteredPosts.length} artikel{filteredPosts.length !== 1 ? 'en' : ''} in <strong>{mainCategories.find(c => c.slug === activeFilter)?.name}</strong>
              </p>
              <button
                onClick={() => setActiveFilter('all')}
                className="text-purple-600 hover:text-purple-700 font-medium text-sm flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Wis filter
              </button>
            </div>
          )}

          {filteredPosts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">Geen artikelen gevonden in deze categorie.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredPosts.map((post) => (
                <article
                  key={post.id}
                  className="group bg-white rounded-2xl overflow-hidden border-2 border-gray-200 hover:border-purple-500 hover:shadow-xl transition-all duration-300 flex flex-col h-full"
                >
                  {/* Featured Image */}
                  <Link href={`/${post.slug}`} className="block relative h-56 bg-gradient-to-br from-purple-100 to-blue-100 overflow-hidden flex-shrink-0">
                    {post.featuredImage?.node?.sourceUrl ? (
                      <Image
                        src={post.featuredImage.node.sourceUrl}
                        alt={post.featuredImage.node.altText || post.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-16 h-16 text-purple-300" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" />
                        </svg>
                      </div>
                    )}
                    
                    {/* Category Badge */}
                    {post.categories?.nodes?.[0] && (
                      <div className="absolute top-3 left-3">
                        <span className="inline-block bg-purple-600 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-lg">
                          {post.categories.nodes[0].name}
                        </span>
                      </div>
                    )}
                  </Link>

                  {/* Content */}
                  <div className="p-6 flex flex-col flex-grow">
                    {/* Date */}
                    <time className="text-sm text-gray-500 mb-3 block">
                      {new Date(post.date).toLocaleDateString('nl-NL', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </time>

                    {/* Title */}
                    <Link href={`/${post.slug}`}>
                      <h2 className="text-xl font-bold text-gray-900 mb-4 group-hover:text-purple-600 transition-colors leading-tight">
                        {post.title}
                      </h2>
                    </Link>

                    {/* Excerpt */}
                    <div 
                      className="text-gray-600 text-base leading-relaxed line-clamp-3 mb-6 flex-grow"
                      dangerouslySetInnerHTML={{ 
                        __html: post.excerpt?.replace(/<[^>]*>/g, '') || '' 
                      }}
                    />

                    {/* Read More */}
                    <Link 
                      href={`/${post.slug}`}
                      className="inline-flex items-center gap-2 text-purple-600 font-semibold text-sm hover:gap-3 transition-all mt-auto"
                    >
                      Lees meer
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}