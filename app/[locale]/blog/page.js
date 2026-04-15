import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import BlogOverviewClient from './BlogOverviewClient';
import BlogFAQ from './BlogFAQ';

async function getPosts() {
  const query = `
    query GetPosts {
      posts(first: 100, where: { orderby: { field: DATE, order: DESC } }) {
        nodes {
          id
          title
          slug
          excerpt
          date
          featuredImage {
            node {
              sourceUrl
              altText
            }
          }
          categories {
            nodes {
              name
              slug
            }
          }
        }
      }
    }
  `;

  try {
    const res = await fetch(process.env.WORDPRESS_GRAPHQL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
      next: { revalidate: 3600 }
    });

    const json = await res.json();
    
    const posts = (json.data?.posts?.nodes || []).map(post => ({
      ...post,
      featuredImage: post.featuredImage ? {
        ...post.featuredImage,
        node: {
          ...post.featuredImage.node,
          sourceUrl: post.featuredImage.node.sourceUrl?.replace(
            'https://wordpress-988065-5905039.cloudwaysapps.com',
            'https://assets.teun.ai'
          )
        }
      } : null
    }));

    return { posts };
  } catch (error) {
    console.error('Fetch Error:', error);
    return { posts: [] };
  }
}

export async function generateMetadata() {
  const locale = await getLocale();
  const isEn = locale === 'en';

  const title = isEn
    ? 'GEO Blog – AI & SEO Insights 2026'
    : 'GEO Blog – AI & SEO Inzichten 2026';
  const description = isEn
    ? 'The latest strategies, insights and trends to stay visible in ChatGPT, Perplexity and other AI search engines.'
    : 'De nieuwste strategieën, inzichten en trends om vindbaar te blijven in ChatGPT, Perplexity en andere AI-zoekmachines.';
  const url = isEn ? 'https://teun.ai/en/blog' : 'https://teun.ai/blog';

  return {
    title,
    description,
    alternates: {
      canonical: 'https://teun.ai/blog',
      languages: {
        nl: 'https://teun.ai/blog',
        'x-default': 'https://teun.ai/blog',
      },
    },
    openGraph: {
      type: 'website',
      title: isEn
        ? 'GEO Blog – AI & SEO Insights 2026 | Teun.ai'
        : 'GEO Blog – AI & SEO Inzichten 2026 | Teun.ai',
      description,
      url,
      siteName: 'Teun.ai',
      locale: isEn ? 'en_GB' : 'nl_NL',
      images: [
        {
          url: 'https://teun.ai/GEO-insights-en-AI-SEO.webp',
          width: 1200,
          height: 675,
          alt: isEn ? 'GEO optimisation' : 'GEO optimalisatie',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: isEn
        ? 'GEO Blog – AI & SEO Insights 2026 | Teun.ai'
        : 'GEO Blog – AI & SEO Inzichten 2026 | Teun.ai',
      description,
      images: ['https://teun.ai/GEO-insights-en-AI-SEO.webp'],
    },
  };
}

export default async function BlogOverview() {
  const { posts } = await getPosts();
  const locale = await getLocale();
  const t = await getTranslations('blog');

  return (
    <>
      {/* ====== HEADER - Clean like pricing page ====== */}
      <section className="bg-white pt-12 lg:pt-20 pb-8 lg:pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Badge */}
          <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-white border border-slate-200 rounded-full text-sm text-slate-600 shadow-sm mb-6">
            <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            {t('badge')}
          </span>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 leading-tight mb-4">
            {t('heroTitle')}{' '}
            <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              {t('heroTitleHighlight')}
            </span>
          </h1>
          
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            {t('heroDescription')}
          </p>
        </div>
      </section>

      {/* ====== BLOG POSTS ====== */}
      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 lg:pb-20">
          <BlogOverviewClient posts={posts} locale={locale} />
        </div>
      </section>

      {/* ====== CTA ====== */}
      <section className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-5 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4">
            {t('ctaTitle')}{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              {t('ctaTitleHighlight')}
            </span>
          </h2>
          <p className="text-slate-500 text-lg mb-3 max-w-xl mx-auto">
            {t('ctaDescription')}
          </p>
          <p className="text-slate-400 text-sm mb-8 max-w-lg mx-auto">
            Liever hulp? OnlineLabs helpt je met professionele GEO-optimalisatie.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white border-2 border-[#1E1E3F] text-[#1E1E3F] rounded-xl font-bold text-lg hover:shadow-lg hover:scale-[1.02] transition-all"
            >
              Lite, €29,95/mnd
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-[#1E1E3F] to-[#2D2D5F] text-white rounded-xl font-bold text-lg hover:shadow-lg hover:scale-[1.02] transition-all"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Pro, €49,95/mnd
            </Link>
          </div>
          <div className="flex flex-wrap justify-center gap-6 mt-6">
            <Link href="/signup" className="text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors">
              Gratis account aanmaken →
            </Link>
            <a href="https://www.onlinelabs.nl/skills/geo-optimalisatie" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-slate-700 text-sm transition-colors">
              GEO door OnlineLabs →
            </a>
          </div>
          <p className="text-slate-400 text-xs mt-6">Geen creditcard nodig voor gratis account. Beide pakketten maandelijks opzegbaar. Prijzen excl. BTW.</p>
        </div>
      </section>

      {/* ====== FAQ ====== */}
      <BlogFAQ />
    </>
  );
}

export const revalidate = 86400;
