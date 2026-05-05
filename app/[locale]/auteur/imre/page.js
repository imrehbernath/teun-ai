// app/auteur/imre/page.js
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
  title: {
    absolute: 'Imre Bernáth - AI-strateeg & SEO-expert sinds 2008',
  },
  description: 'Imre Bernáth bouwt al 25 jaar aan online zichtbaarheid. Oprichter OnlineLabs (2008), bouwer Teun.ai. 750+ projecten, van SEO-pionier tot AI-strateeg.',
  alternates: {
    canonical: 'https://teun.ai/auteur/imre',
    languages: {
      'nl': 'https://teun.ai/auteur/imre',
      'x-default': 'https://teun.ai/auteur/imre',
    },
  },
  openGraph: {
    type: 'profile',
    title: 'Imre Bernáth - AI-strateeg & SEO-expert sinds 2008',
    description: 'Imre Bernáth bouwt al 25 jaar aan online zichtbaarheid. Oprichter OnlineLabs (2008), bouwer Teun.ai. 750+ projecten, van SEO-pionier tot AI-strateeg.',
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
    title: 'Imre Bernáth - AI-strateeg & SEO-expert sinds 2008',
    description: 'Imre Bernáth bouwt al 25 jaar aan online zichtbaarheid. Oprichter OnlineLabs (2008), bouwer Teun.ai.',
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
    <div className="tool-page aut-page">
      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      {/* HERO */}
      <section className="aut-hero">
        <div className="aut-hero-wrap">
          <div className="aut-hero-grid">
            {/* Author Image */}
            <div className="aut-hero-photo-col">
              <div className="aut-hero-photo">
                <Image
                  src="/Imre-Bernath-oprichter-Teun.ai.webp"
                  alt="Imre Bernáth, oprichter Teun.ai"
                  width={220}
                  height={220}
                  priority
                />
              </div>
            </div>

            {/* Author Info */}
            <div className="aut-hero-body">
              <div className="tool-eyebrow">25 JAAR ERVARING → TEUN.AI</div>
              <h1 className="aut-h1">Imre <em>Bernáth</em></h1>
              <p className="aut-role">Oprichter &amp; AI-strateeg</p>

              <div className="aut-bio">
                <p>
                  Imre begon met SEO toen Google nog in de kinderschoenen stond. Na 17+ jaar SEO-expertise en 750+ projecten zag hij als een van de eersten dat AI-zoekmachines de markt fundamenteel veranderen. Alle kennis uit 25 jaar online marketing zit verwerkt in Teun.ai.
                </p>
                <p>
                  Als oprichter van <a href="https://www.onlinelabs.nl/" target="_blank" rel="noopener noreferrer" className="aut-link">OnlineLabs</a> (2008) en bouwer van <a href="https://teun.ai" className="aut-link">Teun.ai</a> helpt hij bedrijven zichtbaar worden in ChatGPT, Perplexity, Google AI Mode en andere AI-platformen.
                </p>
              </div>

              {/* Social Links */}
              <div className="aut-social">
                <a
                  href="https://nl.linkedin.com/in/imrebernath"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="aut-linkedin-btn"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                  LinkedIn
                </a>
              </div>
            </div>
          </div>

          {/* Stats strip */}
          <div className="aut-stats">
            <div className="aut-stat">
              <div className="aut-stat-num">25+</div>
              <div className="aut-stat-label">jaar online marketing</div>
            </div>
            <div className="aut-stat">
              <div className="aut-stat-num">750+</div>
              <div className="aut-stat-label">projecten opgeleverd</div>
            </div>
            <div className="aut-stat">
              <div className="aut-stat-num">2008</div>
              <div className="aut-stat-label">oprichting OnlineLabs</div>
            </div>
          </div>
        </div>
      </section>

      {/* EXPERTISE */}
      <section className="aut-expertise">
        <div className="aut-expertise-wrap">
          <h2 className="aut-section-h2">
            <em>Expertise</em>
          </h2>

          <div className="aut-expertise-grid">
            {/* Kennis Card */}
            <div className="aut-expertise-card">
              <div className="aut-expertise-head">
                <span className="aut-expertise-emoji">🎯</span>
                <h3 className="aut-expertise-title">Kennis</h3>
              </div>
              <ul className="aut-expertise-list">
                {[
                  ['GEO-optimalisatie', 'Generative Engine Optimization'],
                  ['Technische SEO', '& site audits'],
                  ['AI visibility', 'ChatGPT, Gemini, Perplexity'],
                  ['Contentstrategie', '& E-E-A-T'],
                  ['Structured data', '& Schema.org'],
                ].map(([title, sub], i) => (
                  <li key={i}>
                    <span className="dot" />
                    <div>
                      <span className="aut-expertise-item-title">{title}</span>
                      <span className="aut-expertise-item-sub">{sub}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Projecten Card */}
            <div className="aut-expertise-card">
              <div className="aut-expertise-head">
                <span className="aut-expertise-emoji">🚀</span>
                <h3 className="aut-expertise-title">Projecten</h3>
              </div>
              <ul className="aut-expertise-list">
                {[
                  ['Teun.ai', 'GEO-platform met 6 gratis tools'],
                  ['OnlineLabs', 'SEO & AI-visibility bureau (2008)'],
                  ['750+ projecten', 'voor MKB tot enterprise'],
                  ['WordPress & Next.js', 'headless CMS, structured data'],
                ].map(([title, sub], i) => (
                  <li key={i}>
                    <span className="dot" />
                    <div>
                      <span className="aut-expertise-item-title">{title}</span>
                      <span className="aut-expertise-item-sub">{sub}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Skills */}
          <div className="aut-skills-wrap">
            <p className="aut-skills-eyebrow">SKILLS</p>
            <div className="aut-skills">
              {[
                'GEO-optimalisatie', 'Technische SEO', 'AI visibility', 'Structured data',
                'Google Search Console', 'ChatGPT', 'Google AI Mode', 'SEO-audits',
                'WordPress', 'Next.js', 'Schema.org', 'E-E-A-T',
                'Core Web Vitals', 'Contentstrategie', 'Perplexity', 'Google Analytics'
              ].map((skill, i) => (
                <span key={i} className="aut-skill">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ARTICLES */}
      <section className="aut-articles">
        <div className="aut-articles-wrap">
          <h2 className="aut-section-h2">
            Artikelen van <em>Imre</em>
          </h2>

          {posts.length === 0 ? (
            <div className="aut-articles-empty">
              <p>Binnenkort verschijnen hier artikelen.</p>
            </div>
          ) : (
            <div className="aut-articles-grid">
              {posts.map((post) => (
                <Link
                  key={post.id}
                  href={`/${post.slug}`}
                  className="aut-article"
                >
                  <div className="aut-article-image">
                    {post.featuredImage?.node?.sourceUrl ? (
                      <Image
                        src={post.featuredImage.node.sourceUrl}
                        alt={post.featuredImage.node.altText || post.title}
                        fill
                        className="aut-article-img"
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="aut-article-img-fallback">
                        <svg width="48" height="48" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  <div className="aut-article-body">
                    <div className="aut-article-meta">
                      <time>
                        {new Date(post.date).toLocaleDateString('nl-NL', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </time>
                      <span className="aut-article-arrow" aria-hidden="true">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M17 7H7M17 7v10" />
                        </svg>
                      </span>
                    </div>

                    <h3 className="aut-article-title">{post.title}</h3>

                    <p className="aut-article-excerpt">
                      {post.excerpt?.replace(/<[^>]*>/g, '').replace(/\[&hellip;\]|&hellip;/g, '...').trim()}
                    </p>

                    {post.categories?.nodes?.[0] && (
                      <span className="aut-article-cat">
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
    </div>
  );
}

export const revalidate = 3600;
