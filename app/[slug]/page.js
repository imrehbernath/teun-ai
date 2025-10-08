import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import styles from './blog-post.module.css';

async function getPost(slug) {
  const query = `
    query GetPost($slug: ID!) {
      post(id: $slug, idType: SLUG) {
        title
        content
        excerpt
        date
        modified
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
    
    return json.data?.post;
  } catch (error) {
    console.error('Fetch Error:', error);
    return null;
  }
}

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const post = await getPost(resolvedParams.slug);
  
  if (!post) return { title: 'Post niet gevonden' };

  const cleanExcerpt = post.excerpt?.replace(/<[^>]*>/g, '').substring(0, 160) || '';

  return {
    title: post.title,
    description: cleanExcerpt,
    openGraph: {
      title: post.title,
      description: cleanExcerpt,
      images: post.featuredImage?.node?.sourceUrl ? [post.featuredImage.node.sourceUrl] : [],
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
  const contentWithIds = post.content.replace(
    /<h([23])[^>]*>(.*?)<\/h\1>/gi,
    (match, level, text) => {
      const cleanText = text.replace(/<[^>]*>/g, '');
      const id = cleanText
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      
      headings.push({ level: parseInt(level), text: cleanText, id });
      return `<h${level} id="${id}">${text}</h${level}>`;
    }
  );

  return (
    <>
      <div className="bg-gradient-to-br from-purple-700 via-purple-600 to-indigo-700 text-white">
        <div className="container mx-auto px-4 py-16 lg:py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            
            <div>
              <h1 className="text-4xl lg:text-5xl font-bold mb-6 leading-tight">
                {post.title}
              </h1>
              
              <div 
                className="text-lg text-purple-100 mb-8 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: post.excerpt }}
              />

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

            <div className="relative">
              {post.featuredImage?.node?.sourceUrl ? (
                <div className="relative aspect-square rounded-2xl overflow-hidden shadow-2xl">
                  <Image
                    src={post.featuredImage.node.sourceUrl}
                    alt={post.featuredImage.node.altText || post.title}
                    fill
                    className="object-cover"
                    priority
                  />
                </div>
              ) : (
                <div className="aspect-square bg-white/10 backdrop-blur rounded-2xl flex items-center justify-center">
                  <svg className="w-32 h-32 text-white/50" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" />
                  </svg>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      <article className="bg-white">
        <div className="container mx-auto px-4 py-12">
          <div className="grid lg:grid-cols-12 gap-8">

            {headings.length > 0 && (
              <aside className="lg:col-span-3">
                <div className="lg:sticky lg:top-24 bg-gray-50 rounded-xl p-6">
                  <h2 className="font-bold text-lg mb-4 text-gray-900">
                    Inhoudsopgave
                  </h2>
                  <nav className="space-y-2">
                    {headings.map((heading, index) => (
                      <a
                        key={index}
                        href={`#${heading.id}`}
                        className={`block text-sm hover:text-purple-600 transition-colors ${heading.level === 2 ? 'font-medium text-gray-900' : 'pl-4 text-gray-600'}`}
                      >
                        {heading.text}
                      </a>
                    ))}
                  </nav>
                </div>
              </aside>
            )}

            <div className={headings.length > 0 ? 'lg:col-span-9' : 'lg:col-span-12'}>
              
              <div 
                className={styles.blogContent}
                dangerouslySetInnerHTML={{ __html: contentWithIds }}
              />

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