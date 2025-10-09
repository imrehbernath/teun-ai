import Link from 'next/link';
import Image from 'next/image';
import BlogNewsletterSignup from './BlogNewsletterSignup';

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
    return {
      posts: json.data?.posts?.nodes || [],
      categories: json.data?.categories?.nodes || []
    };
  } catch (error) {
    console.error('Fetch Error:', error);
    return { posts: [], categories: [] };
  }
}

export const metadata = {
  title: 'GEO Blog – AI & SEO Inzichten 2025 | Teun.ai',
  description: 'Lees wekelijks nieuwe blogs over GEO, AI-SEO en zichtbaarheid in ChatGPT en Google AI. Praktische inzichten, tips en trends in 2025.',
  openGraph: {
    title: 'GEO Blog – AI & SEO Inzichten 2025 | Teun.ai',
    description: 'Lees wekelijks nieuwe blogs over GEO, AI-SEO en zichtbaarheid in ChatGPT en Google AI. Praktische inzichten, tips en trends in 2025.',
    url: 'https://teun.ai/blog',
    siteName: 'Teun.ai',
    locale: 'nl_NL',
    images: [
      {
        url: '/GEO-insights-en-AI-SEO.webp',
        width: 1200,
        height: 675,
        alt: 'GEO optimalisatie',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GEO Blog – AI & SEO Inzichten 2025 | Teun.ai',
    description: 'Lees wekelijks nieuwe blogs over GEO, AI-SEO en zichtbaarheid in ChatGPT en Google AI. Praktische inzichten, tips en trends in 2025.',
    images: ['/GEO-insights-en-AI-SEO.webp'],
  },
};

export default async function BlogOverview() {
  const { posts, categories } = await getPosts();

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

  return (
    <>
      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/GEO-blog-teun-ai-bg.webp"
            alt=""
            fill
            priority
            className="object-cover"
            quality={90}
          />
          {/* Stronger Overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#001233]/90 via-[#1a0b3d]/85 to-[#2d1654]/90"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center text-white max-w-3xl mx-auto">
            <h1 className="text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              <span className="bg-gradient-to-r from-white via-blue-200 to-purple-200 text-transparent bg-clip-text">
                Insights & Blogs
              </span>
            </h1>
            <p className="text-xl lg:text-2xl text-white/90 leading-relaxed font-light">
              Elke week nieuwe inzichten over GEO, AI & zichtbaarheid
            </p>
          </div>
        </div>
      </section>

      {/* Category Filters */}
      <section className="bg-white py-8 shadow-sm relative z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap gap-3 justify-center items-center">
            {mainCategories.map((category) => {
              const hasContent = category.slug === 'all' || category.slug === 'geo-ai-zichtbaarheid';
              
              if (hasContent) {
                return (
                  <Link
                    key={category.slug}
                    href={`/blog${category.slug === 'all' ? '' : `/category/${category.slug}`}`}
                    className="group flex items-center gap-2.5 px-5 py-3 bg-gray-50 rounded-full border-2 border-gray-200 hover:border-purple-500 hover:bg-purple-50 hover:shadow-lg transition-all font-medium text-sm relative z-10"
                  >
                    <span className="text-xl group-hover:scale-110 transition-transform">{category.icon}</span>
                    <span className="text-gray-700 group-hover:text-purple-700">{category.name}</span>
                  </Link>
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
                  
                  {/* Tooltip - maximum z-index and fully opaque */}
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
          
          {posts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">Nog geen artikelen beschikbaar.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {posts.slice(0, 9).map((post) => (
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

                    {/* Title - Full height */}
                    <Link href={`/${post.slug}`}>
                      <h2 className="text-xl font-bold text-gray-900 mb-4 group-hover:text-purple-600 transition-colors leading-tight">
                        {post.title}
                      </h2>
                    </Link>

                    {/* Excerpt */}
                    <div 
                      className="text-gray-600 text-sm line-clamp-3 mb-6 flex-grow"
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

          {/* Pagination (placeholder) */}
          {posts.length > 9 && (
            <div className="mt-12 flex justify-center gap-2">
              <button className="px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold">
                1
              </button>
              <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300">
                2
              </button>
              <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300">
                3
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Newsletter CTA */}
      <section className="bg-gradient-to-br from-purple-600 via-purple-500 to-indigo-600 py-20 relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
            backgroundSize: '40px 40px'
          }}></div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
            Blijf op de hoogte van GEO-updates
          </h2>
          <p className="text-purple-100 mb-10 text-lg lg:text-xl max-w-2xl mx-auto">
            Ontvang wekelijks de nieuwste inzichten over AI-zichtbaarheid en GEO optimalisatie.
          </p>
          
          <BlogNewsletterSignup />
        </div>
      </section>
    </>
  );
}

export const revalidate = 3600;