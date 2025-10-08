import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import styles from './blog-post.module.css';
import TableOfContents from './TableOfContents';
import FAQAccordion from './FAQAccordion';
import EmailSignup from './EmailSignup';  // ← Relatieve import, net als de anderen!

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
    
    // Fetch Rank Math SEO data via REST API
    const siteUrl = 'https://wordpress-988065-5905039.cloudwaysapps.com';
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
    if (ogImageMatch) ogImage = ogImageMatch[1];
  }

  return {
    title: {
      absolute: title
    },
    description,
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
  
  // Extract FAQs from Rank Math JSON-LD schema (in rankMathHead)
  if (post.rankMathHead) {
    console.log('Has rankMathHead, checking for FAQPage...');
    
    // Use regex to find all script tags with JSON-LD
    const scriptRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    const scripts = [...post.rankMathHead.matchAll(scriptRegex)];
    
    console.log('Found scripts with regex:', scripts.length);
    
    for (let i = 0; i < scripts.length; i++) {
      const jsonContent = scripts[i][1].trim();
      
      try {
        const schema = JSON.parse(jsonContent);
        
        // Handle @graph structure (Rank Math uses this)
        if (schema['@graph']) {
          console.log('Found @graph with', schema['@graph'].length, 'items');
          
          for (const item of schema['@graph']) {
            // Check direct FAQPage
            if (item['@type'] === 'FAQPage' && item.mainEntity) {
              faqs = item.mainEntity.map(q => ({
                question: q.name,
                answer: q.acceptedAnswer?.text || ''
              }));
              console.log(`✅ Found ${faqs.length} FAQs in @graph!`);
              break;
            }
            
            // Check subjectOf (nested FAQPage in BlogPosting)
            if (item.subjectOf) {
              for (const subject of item.subjectOf) {
                if (subject['@type'] === 'FAQPage' && subject.mainEntity) {
                  faqs = subject.mainEntity.map(q => ({
                    question: q.name,
                    answer: q.acceptedAnswer?.text || ''
                  }));
                  console.log(`✅ Found ${faqs.length} FAQs in subjectOf!`);
                  break;
                }
              }
            }
            
            if (faqs.length > 0) break;
          }
        }
        // Direct FAQPage (for other schema structures)
        else if (schema['@type'] === 'FAQPage' && schema.mainEntity) {
          faqs = schema.mainEntity.map(q => ({
            question: q.name,
            answer: q.acceptedAnswer?.text || ''
          }));
          console.log(`✅ Found ${faqs.length} FAQs direct!`);
        }
        
        if (faqs.length > 0) break;
        
      } catch (e) {
        console.log(`JSON parse error in script ${i}:`, e.message);
      }
    }
  } else {
    console.log('❌ No rankMathHead available');
  }
  
  console.log(`Final FAQ count: ${faqs.length}`);
  
  // Process content for TOC (filter out FAQ questions)
  const contentWithIds = post.content.replace(
    /<h([23])[^>]*>(.*?)<\/h\1>/gi,
    (match, level, text) => {
      const cleanText = text.replace(/<[^>]*>/g, '');
      const id = cleanText
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      
      // Skip FAQ questions (they end with ?)
      if (!cleanText.includes('?')) {
        headings.push({ level: parseInt(level), text: cleanText, id });
      }
      
      return `<h${level} id="${id}">${text}</h${level}>`;
    }
  );

  return (
    <>
      {/* Hero Section - 100% width met padding voor cards */}
      <div className="bg-white py-16 lg:py-24 px-4 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-8 max-w-[1400px] mx-auto">
          
          {/* Links: Titel + Intro Card */}
          <div className="bg-gradient-to-br from-purple-700 via-purple-600 to-indigo-700 text-white rounded-3xl p-8 lg:p-12">
            <h1 className="text-3xl lg:text-4xl font-bold mb-6 leading-tight">
              {post.title}
            </h1>
            
            <div 
              className="text-lg text-purple-100 mb-8 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: post.excerpt }}
            />

            {/* Meta info */}
            <div className="flex items-center gap-6 text-sm text-purple-200">
              {post.author?.node?.avatar && (
                <div className="flex items-center gap-2">
                  <img 
                    src={post.author.node.avatar.url} 
                    alt={post.author.node.name}
                    className="w-8 h-8 rounded-full"
                  />
                  <span>{post.author.node.name}</span>
                </div>
              )}
              <time dateTime={post.date}>
                {new Date(post.date).toLocaleDateString('nl-NL', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </time>
            </div>
          </div>

          {/* Rechts: Featured Image Card - afbeelding vult hele vlak */}
          <div className="bg-gradient-to-br from-indigo-900 via-blue-900 to-indigo-800 rounded-3xl overflow-hidden">
            {post.featuredImage?.node?.sourceUrl ? (
              <div className="relative w-full h-full min-h-[400px]">
                <Image
                  src={post.featuredImage.node.sourceUrl}
                  alt={post.featuredImage.node.altText || post.title}
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            ) : (
              <div className="w-full h-full min-h-[400px] bg-white/10 backdrop-blur flex items-center justify-center">
                <svg className="w-32 h-32 text-white/50" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" />
                </svg>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Main Content - 1200px container met 30% / 70% verdeling */}
      <article className="bg-white">
        <div className="mx-auto px-4 py-12" style={{ maxWidth: '1200px' }}>
          <div className="grid grid-cols-12 gap-12">

            {headings.length > 0 && (
              <div className="col-span-12 lg:col-span-4">
                <div className="sticky top-24">
                  <TableOfContents headings={headings} />
                  
                  {/* EMAIL SIGNUP ONDER TOC */}
                  <EmailSignup 
                    title="Blijf op de hoogte van GEO-updates"
                    compact={true}
                  />
                </div>
              </div>
            )}

            <div className={headings.length > 0 ? 'col-span-12 lg:col-span-8' : 'col-span-12'}>
              
              <div 
                className={styles.blogContent}
                dangerouslySetInnerHTML={{ __html: contentWithIds }}
              />

              {/* FAQ Accordion */}
              <FAQAccordion faqs={faqs} />

              <div className="mt-16 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl p-8 text-center text-white">
                <h3 className="text-2xl font-bold mb-4">
                  Klaar om je GEO te verbeteren?
                </h3>
                <p className="text-purple-100 mb-6 text-lg">
                  Start vandaag nog met een gratis GEO audit en ontdek hoe zichtbaar jouw merk is in AI-antwoorden.
                </p>
                <Link 
                  href="/geo-audit"
                  className="inline-block bg-white text-purple-600 px-8 py-4 rounded-lg font-bold text-lg hover:bg-gray-100 transition shadow-lg"
                >
                  Start Gratis GEO Audit
                </Link>
              </div>

              <div className="mt-12 text-center">
                <Link 
                  href="/"
                  className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 font-semibold text-lg group"
                >
                  <span className="group-hover:-translate-x-1 transition-transform">←</span>
                  Terug naar home
                </Link>
              </div>

            </div>

          </div>
        </div>
      </article>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: post.title,
            description: post.excerpt?.replace(/<[^>]*>/g, '').substring(0, 160),
            image: post.featuredImage?.node?.sourceUrl,
            datePublished: post.date,
            dateModified: post.modified,
            author: {
              '@type': 'Person',
              name: post.author?.node?.name,
            },
            publisher: {
              '@type': 'Organization',
              name: 'Teun.ai',
            },
          }),
        }}
      />
    </>
  );
}

export const revalidate = 3600;