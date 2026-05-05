// app/[locale]/[slug]/page.js
import { notFound } from 'next/navigation'
import Image from 'next/image'
import { Link } from '@/i18n/navigation'
import he from 'he'
import styles from './blog-post.module.css'
import TableOfContents from './TableOfContents'
import FAQAccordion from './FAQAccordion'
import EmailSignup from './EmailSignup'
import ReadingProgressBar from './ReadingProgressBar'
import ReadingTime from './ReadingTime'
import SocialShareButtons from './SocialShareButtons'
import AuthorBio from './AuthorBio'
import GeoAuditCTA from './GeoAuditCTA'
import ServerResponsiveImage from './ServerResponsiveImage'

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
  `

  try {
    const res = await fetch(process.env.WORDPRESS_GRAPHQL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: { slug } }),
      next: { revalidate: 3600 }
    })

    const json = await res.json()

    if (json.errors) {
      console.error('GraphQL Errors:', json.errors)
      return null
    }

    const post = json.data?.post

    if (!post) return null

    if (post.featuredImage?.node?.sourceUrl) {
      post.featuredImage.node.sourceUrl = post.featuredImage.node.sourceUrl.replace(
        'https://wordpress-988065-5905039.cloudwaysapps.com',
        'https://assets.teun.ai'
      )
    }

    if (post.mobileImageData?.sourceUrl) {
      post.mobileImageData.sourceUrl = post.mobileImageData.sourceUrl.replace(
        'https://wordpress-988065-5905039.cloudwaysapps.com',
        'https://assets.teun.ai'
      )
    }

    if (post.author?.node?.avatar?.url) {
      post.author.node.avatar.url = post.author.node.avatar.url.replace(
        'https://wordpress-988065-5905039.cloudwaysapps.com',
        'https://assets.teun.ai'
      )
    }

    const siteUrl = 'https://assets.teun.ai'
    const postUrl = `${siteUrl}${post.uri}`

    try {
      const rankMathRes = await fetch(
        `${siteUrl}/wp-json/rankmath/v1/getHead?url=${encodeURIComponent(postUrl)}`,
        { next: { revalidate: 3600 } }
      )

      const rankMathData = await rankMathRes.json()

      if (rankMathData.success && rankMathData.head) {
        post.rankMathHead = rankMathData.head
      }
    } catch (error) {
      console.error('Rank Math API Error:', error)
    }

    return post
  } catch (error) {
    console.error('Fetch Error:', error)
    return null
  }
}

export async function generateMetadata({ params }) {
  const resolvedParams = await params
  const post = await getPost(resolvedParams.slug)

  if (!post) return { title: 'Post niet gevonden' }

  let title = post.title
  let description = post.excerpt?.replace(/<[^>]*>/g, '').substring(0, 160) || ''
  let ogImage = post.featuredImage?.node?.sourceUrl

  if (post.rankMathHead) {
    const titleMatch = post.rankMathHead.match(/<meta property="og:title" content="([^"]*)"/)
      || post.rankMathHead.match(/<title>([^<]*)<\/title>/)
    if (titleMatch) {
      title = he.decode(titleMatch[1])
    }

    const descMatch = post.rankMathHead.match(/<meta name="description" content="([^"]*)"/)
    if (descMatch) {
      description = he.decode(descMatch[1])
    }

    const ogImageMatch = post.rankMathHead.match(/<meta property="og:image" content="([^"]*)"/)
    if (ogImageMatch) {
      ogImage = ogImageMatch[1].replace(
        'https://wordpress-988065-5905039.cloudwaysapps.com',
        'https://assets.teun.ai'
      )
    }
  }

  return {
    title: { absolute: title },
    description,
    alternates: {
      canonical: `https://teun.ai/${resolvedParams.slug}`,
      languages: {
        'nl': `https://teun.ai/${resolvedParams.slug}`,
        'x-default': `https://teun.ai/${resolvedParams.slug}`,
      },
    },
    openGraph: {
      type: 'article',
      locale: 'nl_NL',
      siteName: 'Teun.ai',
      url: `https://teun.ai/${resolvedParams.slug}`,
      title,
      description,
      images: ogImage ? [ogImage] : [],
    },
  }
}

export default async function BlogPost({ params }) {
  const resolvedParams = await params
  const post = await getPost(resolvedParams.slug)

  if (!post) {
    notFound()
  }

  const headings = []
  let faqs = []

  if (post.rankMathHead) {
    const scriptRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
    const scripts = [...post.rankMathHead.matchAll(scriptRegex)]

    for (let i = 0; i < scripts.length; i++) {
      const jsonContent = scripts[i][1].trim()

      try {
        const schema = JSON.parse(jsonContent)

        if (schema['@graph']) {
          for (const item of schema['@graph']) {
            if (item['@type'] === 'FAQPage' && item.mainEntity) {
              faqs = item.mainEntity.map(q => ({
                question: q.name,
                answer: q.acceptedAnswer?.text || ''
              }))
              break
            }

            if (item.subjectOf) {
              for (const subject of item.subjectOf) {
                if (subject['@type'] === 'FAQPage' && subject.mainEntity) {
                  faqs = subject.mainEntity.map(q => ({
                    question: q.name,
                    answer: q.acceptedAnswer?.text || ''
                  }))
                  break
                }
              }
            }

            if (faqs.length > 0) break
          }
        }
        else if (schema['@type'] === 'FAQPage' && schema.mainEntity) {
          faqs = schema.mainEntity.map(q => ({
            question: q.name,
            answer: q.acceptedAnswer?.text || ''
          }))
        }

        if (faqs.length > 0) break

      } catch (e) {
        console.log(`JSON parse error in script ${i}:`, e.message)
      }
    }
  }

  const contentWithIds = post.content.replace(
    /<h([23])[^>]*>(.*?)<\/h\1>/gi,
    (match, level, text) => {
      const cleanText = text.replace(/<[^>]*>/g, '')
      const id = cleanText
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')

      if (parseInt(level) === 2 && !cleanText.includes('?')) {
        headings.push({ level: parseInt(level), text: cleanText, id })
      }

      return `<h${level} id="${id}">${text}</h${level}>`
    }
  )

  const cleanExcerpt = he.decode(post.excerpt?.replace(/<[^>]*>/g, '') || '')

  const transformedContent = contentWithIds.replace(
    /https:\/\/wordpress-988065-5905039\.cloudwaysapps\.com/g,
    'https://assets.teun.ai'
  )

  const currentUrl = `https://teun.ai/${resolvedParams.slug}`

  return (
    <div className="tool-page bp-page">
      <ReadingProgressBar />

      {/* HERO - 2-koloms */}
      <header className="bp-hero">
        <div className="bp-hero-grid">
          <div className="bp-hero-card">
            <div className="bp-hero-eyebrow">BLOG</div>
            <h1 className="bp-hero-title">{post.title}</h1>
            <p className="bp-hero-excerpt">{cleanExcerpt}</p>

            <div className="bp-hero-meta">
              {post.author?.node?.avatar && (
                <Link href="/auteur/imre" className="bp-meta-author">
                  <Image
                    src={post.author.node.avatar.url}
                    alt={`Foto van ${post.author.node.name}, auteur van dit artikel`}
                    width={28}
                    height={28}
                    className="bp-meta-avatar"
                    loading="lazy"
                  />
                  <span>{post.author.node.name}</span>
                </Link>
              )}

              <span className="bp-meta-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
                  <line x1="16" x2="16" y1="2" y2="6"/>
                  <line x1="8" x2="8" y1="2" y2="6"/>
                  <line x1="3" x2="21" y1="10" y2="10"/>
                </svg>
                <time dateTime={post.date}>
                  {new Date(post.date).toLocaleDateString('nl-NL', {
                    day: 'numeric', month: 'long', year: 'numeric'
                  })}
                </time>
              </span>

              {post.modified && new Date(post.modified).getTime() !== new Date(post.date).getTime() && (
                <span
                  className="bp-meta-updated"
                  title={`Laatst bijgewerkt: ${new Date(post.modified).toLocaleDateString('nl-NL', {
                    day: 'numeric', month: 'long', year: 'numeric'
                  })}`}
                >
                  ↻ Bijgewerkt {new Date(post.modified).toLocaleDateString('nl-NL', {
                    day: 'numeric', month: 'short', year: 'numeric'
                  })}
                </span>
              )}

              <ReadingTime content={post.content} />
            </div>
          </div>

          <div className="bp-hero-image">
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
      </header>

      {/* CONTENT */}
      <article className="bp-article">
        <div className="bp-article-wrap">
          <div className="bp-article-grid">

            {headings.length > 0 && (
              <aside className="bp-aside">
                <div className="bp-aside-sticky">
                  <TableOfContents headings={headings} />

                  <div className="bp-aside-newsletter">
                    <EmailSignup
                      title="Blijf op de hoogte van GEO-updates"
                      compact={true}
                    />
                  </div>
                </div>
              </aside>
            )}

            <div className={`bp-content-col ${headings.length > 0 ? '' : 'bp-content-col-full'}`}>

              <div
                className={styles.blogContent}
                dangerouslySetInnerHTML={{ __html: transformedContent }}
              />

              <FAQAccordion faqs={faqs} />

              <AuthorBio />

              <div className="bp-share-row">
                <p className="bp-share-row-text">Vond je dit artikel nuttig?</p>
                <SocialShareButtons title={post.title} url={currentUrl} />
              </div>

              <div className="bp-mobile-newsletter">
                <EmailSignup
                  title="Blijf op de hoogte van GEO-updates"
                  compact={false}
                />
              </div>

              <div className="bp-back-link">
                <Link href="/blog" className="bp-link">
                  <span aria-hidden="true">←</span> Terug naar blogoverzicht
                </Link>
              </div>

            </div>

          </div>
        </div>
      </article>

      <GeoAuditCTA />

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
              ...(faqs.length > 0 ? [{
                '@type': 'FAQPage',
                '@id': `https://teun.ai/${resolvedParams.slug}#faq`,
                'mainEntity': faqs.map(faq => ({
                  '@type': 'Question',
                  'name': faq.question,
                  'acceptedAnswer': {
                    '@type': 'Answer',
                    'text': faq.answer.replace(/<[^>]*>/g, '')
                  }
                }))
              }] : [])
            ]
          })
        }}
      />
    </div>
  )
}

export const revalidate = 86400
