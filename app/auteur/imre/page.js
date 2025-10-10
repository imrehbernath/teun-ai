import Link from 'next/link';
import Image from 'next/image';

async function getAuthorPosts() {
  const query = `
    query GetAuthorPosts {
      posts(first: 100, where: { author: 1, orderby: { field: DATE, order: DESC } }) {
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
    return json.data?.posts?.nodes || [];
  } catch (error) {
    console.error('Fetch Error:', error);
    return [];
  }
}

export const metadata = {
  title: 'Imre Bernáth - SEO & AI Visibility Specialist | Teun.ai',
  description: 'Imre Bernáth is SEO- en AI-visibility specialist uit Nederland, oprichter van Teun.ai en eigenaar van OnlineLabs. 15+ jaar ervaring in technische SEO, contentstrategie, structured data en GEO-optimalisatie.',
  alternates: {
    canonical: '/auteur/imre',
  },
  openGraph: {
    title: 'Imre Bernáth - SEO & AI Visibility Specialist | Teun.ai',
    description: 'Imre Bernáth is SEO- en AI-visibility specialist uit Nederland, oprichter van Teun.ai en eigenaar van OnlineLabs. 15+ jaar ervaring in technische SEO, contentstrategie, structured data en GEO-optimalisatie.',
    url: 'https://teun.ai/auteur/imre',
    siteName: 'Teun.ai',
    locale: 'nl_NL',
    images: [
      {
        url: 'https://gravatar.com/avatar/35c26275319f1c247e76cd36518ee34a?size=512',
        width: 512,
        height: 512,
        alt: 'Imre Bernáth',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: 'Imre Bernáth - SEO & AI Visibility Specialist | Teun.ai',
    description: 'Imre Bernáth is SEO- en AI-visibility specialist uit Nederland, oprichter van Teun.ai en eigenaar van OnlineLabs. 15+ jaar ervaring in technische SEO, contentstrategie, structured data en GEO-optimalisatie.',
    images: ['https://gravatar.com/avatar/35c26275319f1c247e76cd36518ee34a?size=512'],
  },
};

export default async function AuthorPage() {
  const posts = await getAuthorPosts();

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ProfilePage",
        "@id": "https://teun.ai/auteur/imre#profilepage",
        "url": "https://teun.ai/auteur/imre",
        "name": "Profiel van Imre Bernáth",
        "mainEntity": { "@id": "https://teun.ai/auteur/imre#person" },
        "primaryImageOfPage": { "@id": "https://teun.ai/auteur/imre#primaryimage" },
        "breadcrumb": { "@id": "https://teun.ai/auteur/imre#breadcrumb" },
        "inLanguage": "nl-NL",
        "potentialAction": [{
          "@type": "ReadAction",
          "target": ["https://teun.ai/auteur/imre"]
        }]
      },
      {
        "@type": "BreadcrumbList",
        "@id": "https://teun.ai/auteur/imre#breadcrumb",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "https://teun.ai/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Imre Bernáth",
            "item": "https://teun.ai/auteur/imre"
          }
        ]
      },
      {
        "@type": "Person",
        "@id": "https://teun.ai/auteur/imre#person",
        "name": "Imre Bernáth",
        "url": "https://teun.ai/auteur/imre",
        "description": "Imre Bernáth is SEO- en AI-visibility specialist uit Nederland, oprichter van Teun.ai en eigenaar van OnlineLabs. 15+ jaar ervaring in technische SEO, contentstrategie, structured data en GEO-optimalisatie.",
        "image": {
          "@type": "ImageObject",
          "@id": "https://teun.ai/auteur/imre#primaryimage",
          "url": "https://gravatar.com/avatar/35c26275319f1c247e76cd36518ee34a?size=512",
          "caption": "Imre Bernáth"
        },
        "jobTitle": "SEO & AI Visibility Specialist",
        "sameAs": [
          "https://nl.linkedin.com/in/imrebernath",
          "https://www.onlinelabs.nl/",
          "https://gravatar.com/imrebernath"
        ],
        "worksFor": [
          { "@id": "https://teun.ai/#organization" },
          { "@id": "https://www.onlinelabs.nl/#organization" }
        ],
        "knowsAbout": [
          "GEO-optimalisatie","SEO","Technische SEO","AI visibility",
          "Contentstrategie","Structured data","ChatGPT",
          "Google AI Overviews","Perplexity","WordPress"
        ],
        "mainEntityOfPage": { "@id": "https://teun.ai/auteur/imre#profilepage" }
      },
      {
        "@type": "WebSite",
        "@id": "https://teun.ai/#website",
        "url": "https://teun.ai/",
        "name": "Teun.ai",
        "publisher": { "@id": "https://teun.ai/#organization" },
        "inLanguage": "nl-NL"
      },
      {
        "@type": "Organization",
        "@id": "https://teun.ai/#organization",
        "name": "Teun.ai",
        "url": "https://teun.ai/",
        "description": "Teun.ai helpt organisaties met GEO-optimalisatie en AI-visibility: audits, contentstrategie en structured data voor zichtbaarheid in AI-antwoorden.",
        "logo": {
          "@type": "ImageObject",
          "url": "https://teun.ai/wp-content/uploads/2025/10/Teun-ai-logo-light.png"
        }
      },
      {
        "@type": "Organization",
        "@id": "https://www.onlinelabs.nl/#organization",
        "name": "OnlineLabs",
        "url": "https://www.onlinelabs.nl/",
        "description": "OnlineLabs is een Nederlands bureau voor SEO, AI-visibility en WordPress.",
        "logo": {
          "@type": "ImageObject",
          "url": "https://cdn.onlinelabs.nl/wp-content/uploads/2024/12/18111213/Onlinelabs-logo.svg"
        }
      }
    ]
  };

  return (
    <>
      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      {/* Hero Section */}
      <section className="relative py-16 lg:py-24 bg-gradient-to-b from-[#001233] via-[#1a0b3d] to-[#2d1654]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
            {/* Author Image */}
            <div className="flex-shrink-0">
              <Image
                src="https://gravatar.com/avatar/35c26275319f1c247e76cd36518ee34a?size=512"
                alt="Imre Bernáth"
                width={200}
                height={200}
                className="rounded-2xl shadow-2xl"
                priority
              />
            </div>

            {/* Author Info */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4">
                Imre Bernáth
              </h1>
              <p className="text-xl text-blue-200 mb-6">
                Eigenaar van OnlineLabs & oprichter van Teun.ai
              </p>
              
              <div className="text-base md:text-lg text-gray-300 leading-relaxed space-y-4">
                <p>
                  Imre Bernáth is een ervaren SEO- en AI-visibility specialist uit Nederland met meer dan 15 jaar bewezen expertise in online marketing, technische SEO en contentstrategie. Hij helpt bedrijven groeien via strategisch advies, duurzame optimalisatie en AI-zichtbaarheid in systemen zoals ChatGPT, Google AI, Gemini en Perplexity.
                </p>
                
                <p>
                  Als oprichter van <a href="https://www.onlinelabs.nl/" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">OnlineLabs</a> en initiatiefnemer van Teun.ai – het eerste Nederlandse platform voor GEO-audits (Generative Engine Optimisation) – ontwikkelt hij strategieën waarmee merken zichtbaar worden in zowel zoekmachines als AI-gegenereerde antwoorden.
                </p>
              </div>

              {/* Social Links */}
              <div className="flex gap-4 mt-6 justify-center md:justify-start">
                <a 
                  href="https://nl.linkedin.com/in/imrebernath" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                  LinkedIn
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Expertise Section */}
      <section className="bg-white py-12 lg:py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">Expertise & Kennis</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-6 border-2 border-purple-200">
              <h3 className="text-xl font-bold text-gray-900 mb-4">🎯 Specialisaties</h3>
              <ul className="space-y-2 text-gray-700">
                <li>• <strong>GEO-optimalisatie</strong> (Generative Engine Optimization)</li>
                <li>• <strong>Technische SEO</strong> & site audits</li>
                <li>• <strong>AI visibility</strong> in ChatGPT, Gemini & Perplexity</li>
                <li>• <strong>Contentstrategie</strong> & E-E-A-T</li>
                <li>• <strong>Structured data</strong> & Schema.org</li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 border-2 border-blue-200">
              <h3 className="text-xl font-bold text-gray-900 mb-4">🚀 Projecten</h3>
              <ul className="space-y-2 text-gray-700">
                <li>• <strong>Teun.ai</strong> - Platform voor GEO-audits</li>
                <li>• <strong>OnlineLabs</strong> - SEO & AI-visibility bureau</li>
                <li>• <strong>150+ organisaties</strong> geholpen met digitale autoriteit</li>
                <li>• Diepgaande kennis van <strong>WordPress, structured data</strong> en <strong>AI-overviews</strong></li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Articles Section */}
      <section className="bg-gray-50 py-12 lg:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">Artikelen van Imre</h2>
          
          {posts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">Binnenkort verschijnen hier artikelen.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {posts.map((post) => (
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
                      <h3 className="text-xl font-bold text-gray-900 mb-4 group-hover:text-purple-600 transition-colors leading-tight">
                        {post.title}
                      </h3>
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

export const revalidate = 3600;