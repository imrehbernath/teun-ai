import Image from 'next/image';
import BlogNewsletterSignup from './BlogNewsletterSignup';
import BlogOverviewClient from './BlogOverviewClient';

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
        url: 'https://teun.ai/GEO-insights-en-AI-SEO.webp',
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
    images: ['https://teun.ai/GEO-insights-en-AI-SEO.webp'],
  },
};

export default async function BlogOverview() {
  const { posts, categories } = await getPosts();

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

      {/* Client Component with Filtering */}
      <BlogOverviewClient posts={posts} categories={categories} />

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
          <p className="text-purple-100 mb-10 text-base lg:text-xl max-w-2xl mx-auto leading-relaxed">
            Ontvang wekelijks de nieuwste inzichten over AI-zichtbaarheid en GEO optimalisatie.
          </p>
          
          <BlogNewsletterSignup />
        </div>
      </section>
    </>
  );
}

export const revalidate = 3600;