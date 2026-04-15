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

    return posts;
  } catch (error) {
    console.error('Fetch Error:', error);
    return [];
  }
}

export const metadata = {
  title: 'Imre Bernáth - AI-strateeg & oprichter Teun.ai',
  description: 'Imre Bernáth bouwt al 25 jaar aan online zichtbaarheid. Oprichter van OnlineLabs (2008) en bouwer van Teun.ai, het eerste Nederlandse GEO-platform. 750+ projecten, van SEO-pionier tot AI-strateeg.',
  alternates: {
    canonical: 'https://teun.ai/auteur/imre',
    languages: {
      'nl': 'https://teun.ai/auteur/imre',
      'x-default': 'https://teun.ai/auteur/imre',
    },
  },
  openGraph: {
    type: 'profile',
    title: 'Imre Bernáth - AI-strateeg & oprichter Teun.ai',
    description: 'Imre Bernáth bouwt al 25 jaar aan online zichtbaarheid. Oprichter van OnlineLabs (2008) en bouwer van Teun.ai, het eerste Nederlandse GEO-platform.',
    url: 'https://teun.ai/auteur/imre',
    siteName: 'Teun.ai',
    locale: 'nl_NL',
    images: [
      {
        url: 'https://teun.ai/Imre-Bernath-oprichter-Teun.ai.webp',
        width: 512,
        height: 512,
        alt: 'Imre Bernáth',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: 'Imre Bernáth - AI-strateeg & oprichter Teun.ai',
    description: 'Imre Bernáth bouwt al 25 jaar aan online zichtbaarheid. Oprichter van OnlineLabs (2008) en bouwer van Teun.ai.',
    images: ['https://teun.ai/Imre-Bernath-oprichter-Teun.ai.webp'],
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
          { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://teun.ai/" },
          { "@type": "ListItem", "position": 2, "name": "Imre Bernáth", "item": "https://teun.ai/auteur/imre" }
        ]
      },
      {
        "@type": "Person",
        "@id": "https://teun.ai/auteur/imre#person",
        "name": "Imre Bernáth",
        "url": "https://teun.ai/auteur/imre",
        "description": "Imre Bernáth bouwt al 25 jaar aan online zichtbaarheid. Oprichter van OnlineLabs (2008) en bouwer van Teun.ai. 750+ projecten, van SEO-pionier tot AI-strateeg.",
        "image": {
          "@type": "ImageObject",
          "@id": "https://teun.ai/auteur/imre#primaryimage",
          "url": "https://teun.ai/Imre-Bernath-oprichter-Teun.ai.webp",
          "caption": "Imre Bernáth"
        },
        "jobTitle": "Oprichter & AI-strateeg",
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
          "Google AI Mode","Perplexity","WordPress","Next.js"
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
        "description": "Teun.ai helpt organisaties met GEO-optimalisatie en AI-visibility.",
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
        "description": "OnlineLabs is een Nederlands bureau voor SEO, AI-visibility en webdevelopment.",
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

      {/* Hero Section - Clean white */}
      <section className="bg-white pt-16 lg:pt-24 pb-12 lg:pb-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row gap-10 items-center md:items-start">
            {/* Author Image */}
            <div className="flex-shrink-0">
              <Image
                src="/Imre-Bernath-oprichter-Teun.ai.webp"
                alt="Imre Bernáth, oprichter Teun.ai"
                width={200}
                height={200}
                className="rounded-2xl shadow-lg"
                priority
              />
            </div>

            {/* Author Info */}
            <div className="flex-1 text-center md:text-left">
              <p className="text-sm font-medium text-blue-600 mb-2">25 jaar ervaring → Teun.ai</p>
              <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-3">
                Imre Bernáth
              </h1>
              <p className="text-xl text-slate-500 mb-6">
                Oprichter & AI-strateeg
              </p>
              
              <div className="text-base md:text-lg text-slate-600 leading-relaxed space-y-4">
                <p>
                  Imre begon met SEO toen Google nog in de kinderschoenen stond. Na 17+ jaar SEO-expertise en 750+ projecten zag hij als een van de eersten dat AI-zoekmachines de markt fundamenteel veranderen. Alle kennis uit 25 jaar online marketing zit verwerkt in Teun.ai.
                </p>
                <p>
                  Als oprichter van <a href="https://www.onlinelabs.nl/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">OnlineLabs</a> (2008) en bouwer van <a href="https://teun.ai" className="text-blue-600 hover:underline font-medium">Teun.ai</a> helpt hij bedrijven zichtbaar worden in ChatGPT, Perplexity, Google AI Mode en andere AI-platformen.
                </p>
              </div>

              {/* Social Links */}
              <div className="flex gap-4 mt-8 justify-center md:justify-start">
                <a 
                  href="https://nl.linkedin.com/in/imrebernath" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#0A66C2] hover:bg-[#004182] text-white font-semibold rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                  LinkedIn
                </a>
              </div>
            </div>
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-3 gap-6 mt-12 pt-10 border-t border-slate-200">
            <div className="text-center">
              <div className="text-3xl font-bold text-slate-900">25+</div>
              <div className="text-sm text-slate-500 mt-1">jaar online marketing</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-slate-900">750+</div>
              <div className="text-sm text-slate-500 mt-1">projecten opgeleverd</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-slate-900">2008</div>
              <div className="text-sm text-slate-500 mt-1">oprichting OnlineLabs</div>
            </div>
          </div>
        </div>
      </section>

      {/* Expertise Section */}
      <section className="bg-slate-50 py-12 lg:py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-8">Expertise</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Ervaring Card */}
            <div className="bg-white rounded-xl p-6 border border-slate-200">
              <div className="flex items-center gap-2 mb-5">
                <span className="text-xl">🎯</span>
                <h3 className="text-lg font-bold text-slate-900">Kennis</h3>
              </div>
              <ul className="space-y-3">
                {[
                  ['GEO-optimalisatie', 'Generative Engine Optimization'],
                  ['Technische SEO', '& site audits'],
                  ['AI visibility', 'ChatGPT, Gemini, Perplexity'],
                  ['Contentstrategie', '& E-E-A-T'],
                  ['Structured data', '& Schema.org'],
                ].map(([title, sub], i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="text-blue-600 font-bold mt-0.5">•</span>
                    <div>
                      <span className="font-semibold text-slate-900">{title}</span>
                      <span className="block text-slate-500 text-sm">{sub}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Projecten Card */}
            <div className="bg-white rounded-xl p-6 border border-slate-200">
              <div className="flex items-center gap-2 mb-5">
                <span className="text-xl">🚀</span>
                <h3 className="text-lg font-bold text-slate-900">Projecten</h3>
              </div>
              <ul className="space-y-3">
                {[
                  ['Teun.ai', 'GEO-platform met 6 gratis tools'],
                  ['OnlineLabs', 'SEO & AI-visibility bureau (2008)'],
                  ['750+ projecten', 'voor MKB tot enterprise'],
                  ['WordPress & Next.js', 'headless CMS, structured data'],
                ].map(([title, sub], i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="text-blue-600 font-bold mt-0.5">•</span>
                    <div>
                      <span className="font-semibold text-slate-900">{title}</span>
                      <span className="block text-slate-500 text-sm">{sub}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          
          {/* Skills */}
          <div className="mt-8">
            <div className="flex flex-wrap gap-2">
              {[
                'GEO-optimalisatie', 'Technische SEO', 'AI visibility', 'Structured data',
                'Google Search Console', 'ChatGPT', 'Google AI Mode', 'SEO-audits',
                'WordPress', 'Next.js', 'Schema.org', 'E-E-A-T',
                'Core Web Vitals', 'Contentstrategie', 'Perplexity', 'Google Analytics'
              ].map((skill, i) => (
                <span 
                  key={i}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-full text-sm text-slate-700 font-medium"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Articles Section */}
      <section className="bg-white py-12 lg:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-8">Artikelen van Imre</h2>
          
          {posts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-500 text-lg">Binnenkort verschijnen hier artikelen.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-7">
              {posts.map((post) => (
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
                    <div className="flex items-center justify-between mb-2.5">
                      <time className="text-xs text-slate-400 font-medium">
                        {new Date(post.date).toLocaleDateString('nl-NL', {
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

                    <h3 className="text-base lg:text-[17px] font-semibold text-slate-900 leading-snug mb-2 group-hover:text-slate-700 transition-colors line-clamp-2">
                      {post.title}
                    </h3>

                    <p className="text-sm text-slate-500 leading-relaxed line-clamp-2 mb-4 flex-grow">
                      {post.excerpt?.replace(/<[^>]*>/g, '').replace(/\[&hellip;\]|&hellip;/g, '...').trim()}
                    </p>

                    {post.categories?.nodes?.[0] && (
                      <span className="inline-block text-xs font-medium text-slate-500 bg-slate-100 rounded-full px-3 py-1 self-start">
                        {post.categories.nodes[0].name}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

export const revalidate = 3600;
