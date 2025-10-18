import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import styles from './blog-post.module.css';
import TableOfContents from './TableOfContents';
import FAQAccordion from './FAQAccordion';
import EmailSignup from './EmailSignup';
import ReadingProgressBar from './ReadingProgressBar';
import ReadingTime from './ReadingTime';
import SocialShareButtons from './SocialShareButtons';
import AuthorBio from './AuthorBio';
import GeoAuditCTA from './GeoAuditCTA';
import ServerResponsiveImage from './ServerResponsiveImage';

async function getPost(slug) {
  const query = `
    query GetPost($slug: ID!) {
      post(id: $slug, idType: SLUG) {
        title
        content
        excerpt
        date
        modified
        uri
        featuredImage {
          node {
            sourceUrl
            altText
            mediaDetails {
              width
              height
            }
          }
        }
        mobileImageData {
          sourceUrl
          altText
          mediaDetails {
            width
            height
          }
        }
        author {
          node {
            name
            avatar {
              url
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
      body: JSON.stringify({ query, variables: { slug } }),
      next: { revalidate: 3600 }
    });

    const json = await res.json();
    
    if (json.errors) {
      console.error('GraphQL Errors:', json.errors);
      return null;
    }
    
    const post = json.data?.post;
    
    if (!post) return null;
    
    // Transform featured image URL to assets.teun.ai
    if (post.featuredImage?.node?.sourceUrl) {
      post.featuredImage.node.sourceUrl = post.featuredImage.node.sourceUrl.replace(
        'https://wordpress-988065-5905039.cloudwaysapps.com',
        'https://assets.teun.ai'
      );
    }
    
    // Transform mobile image URL to assets.teun.ai
    if (post.mobileImageData?.sourceUrl) {
      post.mobileImageData.sourceUrl = post.mobileImageData.sourceUrl.replace(
        'https://wordpress-988065-5905039.cloudwaysapps.com',
        'https://assets.teun.ai'
      );
    }
    
    // Transform author avatar URL to assets.teun.ai
    if (post.author?.node?.avatar?.url) {
      post.author.node.avatar.url = post.author.node.avatar.url.replace(
        'https://wordpress-988065-5905039.cloudwaysapps.com',
        'https://assets.teun.ai'
      );
    }
    
    // Fetch Rank Math SEO data via REST API
    const siteUrl = 'https://assets.teun.ai';
    const postUrl = `${siteUrl}${post.uri}`;
    
    try {
      const rankMathRes = await fetch(
        `${siteUrl}/wp-json/rankmath/v1/getHead?url=${encodeURIComponent(postUrl)}`,
        { next: { revalidate: 3600 } }
      );
      
      const rankMathData = await rankMathRes.json();
      
      if (rankMathData.success && rankMathData.head) {
        post.rankMathHead = rankMathData.head;
      }
    } catch (error) {
      console.error('Rank Math API Error:', error);
    }
    
    return post;
  } catch (error) {
    console.error('Fetch Error:', error);
    return null;
  }
}

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const post = await getPost(resolvedParams.slug);
  
  if (!post) return { title: 'Post niet gevonden' };

  // Extract metadata from Rank Math
  let title = post.title;
  let description = post.excerpt?.replace(/<[^>]*>/g, '').substring(0, 160) || '';
  let ogImage = post.featuredImage?.node?.sourceUrl;
  
  if (post.rankMathHead) {
    // Extract title
    const titleMatch = post.rankMathHead.match(/<meta property="og:title" content="([^"]*)"/)
      || post.rankMathHead.match(/<title>([^<]*)<\/title>/);
    if (titleMatch) title = titleMatch[1];
    
    // Extract description
    const descMatch = post.rankMathHead.match(/<meta name="description" content="([^"]*)"/);
    if (descMatch) description = descMatch[1];
    
    // Extract OG image
    const ogImageMatch = post.rankMathHead.match(/<meta property="og:image" content="([^"]*)"/);
    if (ogImageMatch) {
      ogImage = ogImageMatch[1].replace(
        'https://wordpress-988065-5905039.cloudwaysapps.com',
        'https://assets.teun.ai'
      );
    }
  }

  return {
    title: {
      absolute: title
    },
    description,
    alternates: {
      canonical: `/${resolvedParams.slug}`,
    },
    openGraph: {
      title,
      description,
      images: ogImage ? [ogImage] : [],
    },
  };
}

export default async function BlogPost({ params }) {
  const resolvedParams = await params;
  const post = await getPost(resolvedParams.slug);

  if (!post) {
    notFound();
  }

  const headings = [];
  let faqs = [];
  
  // Extract FAQs from Rank Math JSON-LD schema
  if (post.rankMathHead) {
    const scriptRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    const scripts = [...post.rankMathHead.matchAll(scriptRegex)];
    
    for (let i = 0; i < scripts.length; i++) {
      const jsonContent = scripts[i][1].trim();
      
      try {
        const schema = JSON.parse(jsonContent);
        
        if (schema['@graph']) {
          for (const item of schema['@graph']) {
            if (item['@type'] === 'FAQPage' && item.mainEntity) {
              faqs = item.mainEntity.map(q => ({
                question: q.name,
                answer: q.acceptedAnswer?.text || ''
              }));
              break;
            }
            
            if (item.subjectOf) {
              for (const subject of item.subjectOf) {
                if (subject['@type'] === 'FAQPage' && subject.mainEntity) {
                  faqs = subject.mainEntity.map(q => ({
                    question: q.name,
                    answer: q.acceptedAnswer?.text || ''
                  }));
                  break;
                }
              }
            }
            
            if (faqs.length > 0) break;
          }
        }
        else if (schema['@type'] === 'FAQPage' && schema.mainEntity) {
          faqs = schema.mainEntity.map(q => ({
            question: q.name,
            answer: q.acceptedAnswer?.text || ''
          }));
        }
        
        if (faqs.length > 0) break;
        
      } catch (e) {
        console.log(`JSON parse error in script ${i}:`, e.message);
      }
    }
  }
  
  // Process content for TOC - ALLEEN H2 headings
  const contentWithIds = post.content.replace(
    /<h([23])[^>]*>(.*?)<\/h\1>/gi,
    (match, level, text) => {
      const cleanText = text.replace(/<[^>]*>/g, '');
      const id = cleanText
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      
      // Alleen H2 toevoegen aan TOC (skip FAQ questions en H3)
      if (parseInt(level) === 2 && !cleanText.includes('?')) {
        headings.push({ level: parseInt(level), text: cleanText, id });
      }
      
      return `<h${level} id="${id}">${text}</h${level}>`;
    }
  );

  // Clean excerpt for display
  const cleanExcerpt = post.excerpt?.replace(/<[^>]*>/g, '') || '';

  // Transform all WordPress URLs to assets.teun.ai in content
  const transformedContent = contentWithIds.replace(
    /https:\/\/wordpress-988065-5905039\.cloudwaysapps\.com/g,
    'https://assets.teun.ai'
  );

  // Current URL for sharing
  const currentUrl = `https://teun.ai/${resolvedParams.slug}`;

  return (
    <>
      {/* Reading Progress Bar - Fixed at top */}
      <ReadingProgressBar />

      {/* Hero Section */}
      <div className="bg-white py-16 lg:py-24 px-4 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-8 max-w-[1400px] mx-auto">
          
          {/* Links: Titel + Intro Card */}
          <div className="bg-gradient-to-br from-purple-700 via-purple-600 to-indigo-700 text-white rounded-3xl p-8 lg:p-12">
            <h1 className="text-3xl lg:text-4xl font-bold mb-6 leading-tight">
              {post.title}
            </h1>
            
            <div className="text-lg text-purple-100 mb-8 leading-relaxed">
              {cleanExcerpt}
            </div>

           {/* Meta info met Reading Time */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-purple-200 mb-6">
                {post.author?.node?.avatar && (
                  <Link 
                    href="/auteur/imre" 
                    className="flex items-center gap-2 hover:text-white transition-colors"
                  >
                    <Image
                      src={post.author.node.avatar.url}
                      alt={`Foto van ${post.author.node.name}, auteur van dit artikel`}
                      width={32}
                      height={32}
                      className="rounded-full"
                      loading="lazy"
                    />
                    <span>{post.author.node.name}</span>
                  </Link>
                )}
                
                {/* Published date */}
                <time dateTime={post.date}>
                  {new Date(post.date).toLocaleDateString('nl-NL', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </time>

                {/* Modified date - ZICHTBAAR met volledige datum */}
                {post.modified && new Date(post.modified).getTime() !== new Date(post.date).getTime() && (
                  <span className="text-xs text-white bg-white/25 px-3 py-1 rounded-full font-semibold">
                    <time 
                      dateTime={post.modified}
                      title={`Laatst bijgewerkt: ${new Date(post.modified).toLocaleDateString('nl-NL', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}`}
                    >
                      ↻ Bijgewerkt {new Date(post.modified).toLocaleDateString('nl-NL', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </time>
                  </span>
                )}

                <ReadingTime content={post.content} />
              </div>

            {/* Social Share Buttons */}
            <div className="pt-6 border-t border-purple-400/30">
              <SocialShareButtons 
                title={post.title}
                url={currentUrl}
              />
            </div>
          </div>

          {/* Rechts: Featured Image Card - RESPONSIVE met fetchPriority */}
          <div className="bg-gradient-to-br from-indigo-900 via-blue-900 to-indigo-800 rounded-3xl overflow-hidden">
            <ServerResponsiveImage
              desktopImage={post.featuredImage?.node}
              mobileImage={post.mobileImageData}
              alt={post.featuredImage?.node?.altText || post.title}
              priority={true}
              fetchPriority="high"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>

        </div>
      </div>

      {/* Main Content */}
      <article className="bg-white">
        <div className="mx-auto px-4 pt-6 pb-12 lg:pt-12 max-w-[1200px]">
          <div className="grid grid-cols-12 gap-6 lg:gap-12">

            {headings.length > 0 && (
              <div className="col-span-12 lg:col-span-4">
                <div className="lg:sticky lg:top-24 lg:pb-28">
                  <TableOfContents headings={headings} />
                  
                  <div className="hidden lg:block">
                    <EmailSignup 
                      title="Blijf op de hoogte van GEO-updates"
                      compact={true}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className={headings.length > 0 ? 'col-span-12 lg:col-span-8' : 'col-span-12'}>
              
              <div 
                className={styles.blogContent}
                dangerouslySetInnerHTML={{ __html: transformedContent }}
              />

              <FAQAccordion faqs={faqs} />

              {/* Author Bio */}
              <AuthorBio />

              {/* Share buttons ook onderaan artikel */}
              <div className="mt-12 pt-8 border-t border-gray-200">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <p className="text-gray-600 font-medium">Vond je dit artikel nuttig?</p>
                  <SocialShareButtons 
                    title={post.title}
                    url={currentUrl}
                  />
                </div>
              </div>

              <div className="lg:hidden mt-8">
                <EmailSignup 
                  title="Blijf op de hoogte van GEO-updates"
                  compact={false}
                />
              </div>

              {/* GEO Audit CTA met popup */}
              <GeoAuditCTA />

              <div className="mt-12 text-center">
                <Link 
                  href="/blog"
                  className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 font-semibold text-lg group"
                >
                  <span className="group-hover:-translate-x-1 transition-transform">←</span>
                  Terug naar blogoverzicht
                </Link>
              </div>

            </div>

          </div>
        </div>
      </article>

      {/* Schema.org structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@graph': [
                {
                  '@type': 'Organization',
                  '@id': 'https://teun.ai/#organization',
                  'name': 'teun.ai',
                  'logo': {
                    '@type': 'ImageObject',
                    '@id': 'https://teun.ai/#logo',
                    'url': 'https://teun.ai/wp-content/uploads/2025/10/Teun-ai-logo-light.png',
                    'contentUrl': 'https://teun.ai/wp-content/uploads/2025/10/Teun-ai-logo-light.png',
                    'caption': 'Teun.ai',
                    'inLanguage': 'nl-NL',
                    'width': '512',
                    'height': '512'
                  }
                },
                {
                  '@type': 'WebSite',
                  '@id': 'https://teun.ai/#website',
                  'url': 'https://teun.ai',
                  'name': 'Teun.ai',
                  'alternateName': 'Teun.ai',
                  'publisher': { '@id': 'https://teun.ai/#organization' },
                  'inLanguage': 'nl-NL'
                },
                {
                  '@type': 'ImageObject',
                  '@id': post.featuredImage?.node?.sourceUrl || 'https://teun.ai/default-image.webp',
                  'url': post.featuredImage?.node?.sourceUrl || 'https://teun.ai/default-image.webp',
                  'width': '1200',
                  'height': '675',
                  'caption': post.featuredImage?.node?.altText || post.title,
                  'inLanguage': 'nl-NL'
                },
                {
                  '@type': 'WebPage',
                  '@id': `https://teun.ai/${resolvedParams.slug}#webpage`,
                  'url': `https://teun.ai/${resolvedParams.slug}`,
                  'name': post.title,
                  'datePublished': new Date(post.date).toISOString(),
                  'dateModified': new Date(post.modified).toISOString(),
                  'isPartOf': { '@id': 'https://teun.ai/#website' },
                  'primaryImageOfPage': { '@id': post.featuredImage?.node?.sourceUrl || 'https://teun.ai/default-image.webp' },
                  'inLanguage': 'nl-NL'
                },
                {
                  '@type': 'Person',
                  '@id': 'https://teun.ai/auteur/imre',
                  'name': 'Imre Bernáth',
                  'description': 'Imre Bernáth deelt inzichten over SEO, AI visibility en GEO-optimalisatie. Oprichter van Teun.ai en OnlineLabs. 15+ jaar ervaring in strategische online groei.',
                  'url': 'https://teun.ai/auteur/imre',
                  'image': {
                    '@type': 'ImageObject',
                    '@id': post.author?.node?.avatar?.url || 'https://gravatar.com/avatar/35c26275319f1c247e76cd36518ee34a?size=96',
                    'url': post.author?.node?.avatar?.url || 'https://gravatar.com/avatar/35c26275319f1c247e76cd36518ee34a?size=96',
                    'caption': 'Imre Bernáth',
                    'inLanguage': 'nl-NL'
                  },
                  'sameAs': ['https://teun.ai', 'https://nl.linkedin.com/in/imrebernath'],
                  'worksFor': { '@id': 'https://teun.ai/#organization' }
                },
                {
                  '@type': 'BlogPosting',
                  'headline': post.title,
                  'datePublished': new Date(post.date).toISOString(),
                  'dateModified': new Date(post.modified).toISOString(),
                  'author': {
                    '@id': 'https://teun.ai/auteur/imre',
                    'name': 'Imre Bernáth'
                  },
                  'publisher': { '@id': 'https://teun.ai/#organization' },
                  'description': cleanExcerpt.substring(0, 160),
                  'name': post.title,
                  '@id': `https://teun.ai/${resolvedParams.slug}#richSnippet`,
                  'isPartOf': { '@id': `https://teun.ai/${resolvedParams.slug}#webpage` },
                  'image': { '@id': post.featuredImage?.node?.sourceUrl || 'https://teun.ai/default-image.webp' },
                  'inLanguage': 'nl-NL',
                  'mainEntityOfPage': { '@id': `https://teun.ai/${resolvedParams.slug}#webpage` }
                },
                // 🆕 FAQ SCHEMA - Alleen als er FAQs zijn
                ...(faqs.length > 0 ? [{
                  '@type': 'FAQPage',
                  '@id': `https://teun.ai/${resolvedParams.slug}#faq`,
                  'mainEntity': faqs.map(faq => ({
                    '@type': 'Question',
                    'name': faq.question,
                    'acceptedAnswer': {
                      '@type': 'Answer',
                      'text': faq.answer.replace(/<[^>]*>/g, '') // Strip HTML for schema
                    }
                  }))
                }] : [])
              ]
            })
          }}
        />
    </>
  );
}

export const revalidate = 86400; // 24 uur cache