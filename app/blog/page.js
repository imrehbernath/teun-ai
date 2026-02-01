import Image from 'next/image';
import Link from 'next/link';
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
      categories(where: { hideEmpty: true }) {
        nodes {
          name
          slug
          count
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

    return {
      posts,
      categories: json.data?.categories?.nodes || []
    };
  } catch (error) {
    console.error('Fetch Error:', error);
    return { posts: [], categories: [] };
  }
}

export const metadata = {
  title: 'GEO Blog – AI & SEO Inzichten 2026',
  description: 'De nieuwste strategieën, inzichten en trends om vindbaar te blijven in ChatGPT, Perplexity en andere AI-zoekmachines.',
  alternates: {
    canonical: '/blog',
  },
  openGraph: {
    title: 'GEO Blog – AI & SEO Inzichten 2026 | Teun.ai',
    description: 'De nieuwste strategieën, inzichten en trends om vindbaar te blijven in ChatGPT, Perplexity en andere AI-zoekmachines.',
    url: 'https://teun.ai/blog',
    siteName: 'Teun.ai',
    locale: 'nl_NL',
    images: [
      {
        url: 'https://teun.ai/GEO-insights-en-AI-SEO.webp',
        width: 1200,
        height: 675,
        alt: 'GEO optimalisatie',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GEO Blog – AI & SEO Inzichten 2026 | Teun.ai',
    description: 'De nieuwste strategieën, inzichten en trends om vindbaar te blijven in ChatGPT, Perplexity en andere AI-zoekmachines.',
    images: ['https://teun.ai/GEO-insights-en-AI-SEO.webp'],
  },
};

export default async function BlogOverview() {
  const { posts, categories } = await getPosts();

  return (
    <>
      {/* ====== HERO + STATS WRAPPER ====== */}
      <div className="relative overflow-hidden">
        {/* Teun Blij - Positioned over hero + stats like homepage pattern */}
        <div className="hidden lg:block absolute right-[5%] xl:right-[8%] z-10 pointer-events-none select-none" style={{ bottom: '0px' }}>
          <Image
            src="/Teun-ai-blij-met-resultaat.png"
            alt="Teun is blij - AI Visibility Blog"
            width={460}
            height={575}
            className="drop-shadow-2xl"
            priority
          />
        </div>

        {/* ====== HERO SECTION ====== */}
        <section className="relative bg-gradient-to-br from-slate-50 via-white to-blue-50">
          {/* Subtle background pattern */}
          <div className="absolute inset-0 opacity-30 pointer-events-none">
            <div className="absolute top-20 left-10 w-72 h-72 bg-blue-100 rounded-full blur-3xl"></div>
            <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-100 rounded-full blur-3xl"></div>
          </div>

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 lg:pt-20">
            <div className="grid lg:grid-cols-5 gap-8 items-end">
              {/* Left: Content - 3 columns */}
              <div className="lg:col-span-3 pb-12 lg:pb-20">
                {/* Badge */}
                <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-white border border-slate-200 rounded-full text-sm text-slate-600 shadow-sm mb-6">
                  <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  GEO & AI-ZICHTBAARHEID
                </span>

                <h1 className="text-4xl md:text-5xl lg:text-[3.2rem] font-bold text-slate-900 leading-tight mb-6">
                  Alles over AI-zichtbaarheid{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                    en GEO
                  </span>
                </h1>
                
                <p className="text-lg text-slate-600 mb-4 max-w-lg">
                  De nieuwste strategieën, inzichten en trends om vindbaar te blijven in ChatGPT, Perplexity en andere AI-zoekmachines.
                </p>

                {/* AI Platform badges - same as homepage */}
                <div className="flex flex-wrap gap-3 mb-8">
                  {['OpenAI', 'Perplexity', 'Gemini', 'Claude'].map((platform) => (
                    <span 
                      key={platform}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-full text-sm text-slate-700 shadow-sm"
                    >
                      <span className="w-2 h-2 rounded-full bg-green-500"></span>
                      {platform}
                    </span>
                  ))}
                </div>

                {/* Mobile Teun - above fold */}
                <div className="lg:hidden flex justify-center">
                  <Image
                    src="/Teun-ai-blij-met-resultaat.png"
                    alt="Teun is blij - AI Visibility Blog"
                    width={200}
                    height={250}
                    className="drop-shadow-xl"
                  />
                </div>
              </div>

              {/* Right: 2 columns - reserved for absolute Teun */}
              <div className="hidden lg:block lg:col-span-2"></div>
            </div>
          </div>
        </section>

        {/* ====== STATS BAR ====== */}
        <section className="bg-gradient-to-r from-[#1E1E3F] via-[#2D2D5F] to-[#1E1E3F] py-8 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
              {[
                { value: '2.847', label: 'Scans uitgevoerd' },
                { value: '94%', label: 'Vindt nieuwe inzichten' },
                { value: '4', label: 'AI-platforms gescand' },
                { value: 'Gratis', label: 'Eerste scan', highlight: true },
              ].map((stat) => (
                <div key={stat.label}>
                  <div className={`text-2xl lg:text-3xl font-bold ${stat.highlight ? 'text-emerald-400' : 'text-white'}`}>
                    {stat.value}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* ====== BLOG POSTS (lichte achtergrond) ====== */}
      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          <h2 className="text-xl lg:text-2xl font-semibold text-slate-900 mb-8">
            All blog posts
          </h2>
          <BlogOverviewClient posts={posts} categories={categories} />
        </div>
      </section>

      {/* ====== FAQ met Teun (licht, zelfde als homepage) ====== */}
      <BlogFAQ />

      {/* ====== FINAL CTA (licht, zodat het niet botst met donkere footer) ====== */}
      <section className="py-16 lg:py-20 bg-gradient-to-br from-slate-50 via-white to-blue-50 relative overflow-hidden">
        {/* Subtle background */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-10 left-1/4 w-72 h-72 bg-blue-100 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-1/4 w-72 h-72 bg-purple-100 rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 mb-4 leading-tight">
            Hoe zichtbaar is jouw merk in{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
              AI-zoekmachines?
            </span>
          </h2>
          <p className="text-slate-600 mb-8 max-w-xl mx-auto">
            Start een gratis scan of lees meer over GEO optimalisatie.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/tools/ai-visibility"
              className="inline-flex items-center justify-center px-7 py-3.5 rounded-xl bg-gradient-to-r from-[#1E1E3F] to-[#2D2D5F] text-white font-semibold text-sm hover:shadow-lg hover:scale-[1.02] transition-all min-w-[180px]"
            >
              Start Gratis Scan →
            </Link>
            <a
              href="https://www.onlinelabs.nl/skills/geo-optimalisatie"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-7 py-3.5 rounded-xl border-2 border-slate-200 text-slate-700 font-semibold text-sm hover:border-slate-300 hover:bg-white transition-all min-w-[180px]"
            >
              GEO Optimalisatie
            </a>
          </div>
        </div>
      </section>
    </>
  );
}

export const revalidate = 86400;
