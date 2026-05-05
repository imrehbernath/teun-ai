// app/[locale]/blog/page.js
import { Link } from '@/i18n/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import BlogOverviewClient from './BlogOverviewClient'
import BlogFAQ from './BlogFAQ'

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
    }
  `

  try {
    const res = await fetch(process.env.WORDPRESS_GRAPHQL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
      next: { revalidate: 3600 }
    })

    const json = await res.json()

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
    }))

    return { posts }
  } catch (error) {
    console.error('Fetch Error:', error)
    return { posts: [] }
  }
}

export async function generateMetadata() {
  const locale = await getLocale()
  const isEn = locale === 'en'

  const title = isEn
    ? 'GEO Blog – AI & SEO Insights 2026'
    : 'GEO Blog – AI & SEO Inzichten 2026'
  const description = isEn
    ? 'The latest strategies, insights and trends to stay visible in ChatGPT, Perplexity and other AI search engines.'
    : 'De nieuwste strategieën, inzichten en trends om vindbaar te blijven in ChatGPT, Perplexity en andere AI-zoekmachines.'
  const url = isEn ? 'https://teun.ai/en/blog' : 'https://teun.ai/blog'

  return {
    title,
    description,
    alternates: {
      canonical: 'https://teun.ai/blog',
      languages: {
        nl: 'https://teun.ai/blog',
        'x-default': 'https://teun.ai/blog',
      },
    },
    openGraph: {
      type: 'website',
      title: isEn
        ? 'GEO Blog – AI & SEO Insights 2026 | Teun.ai'
        : 'GEO Blog – AI & SEO Inzichten 2026 | Teun.ai',
      description,
      url,
      siteName: 'Teun.ai',
      locale: isEn ? 'en_GB' : 'nl_NL',
      images: [
        {
          url: 'https://teun.ai/GEO-insights-en-AI-SEO.webp',
          width: 1200,
          height: 675,
          alt: isEn ? 'GEO optimisation' : 'GEO optimalisatie',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: isEn
        ? 'GEO Blog – AI & SEO Insights 2026 | Teun.ai'
        : 'GEO Blog – AI & SEO Inzichten 2026 | Teun.ai',
      description,
      images: ['https://teun.ai/GEO-insights-en-AI-SEO.webp'],
    },
  }
}

export default async function BlogOverview() {
  const { posts } = await getPosts()
  const locale = await getLocale()
  const t = await getTranslations('blog')

  return (
    <div className="tool-page bov-page">

      {/* HERO */}
      <section className="bov-hero">
        <div className="tool-eyebrow">{t('badge')}</div>
        <h1 className="bov-h1">
          {t('heroTitle')} <em>{t('heroTitleHighlight')}</em>
        </h1>
        <p className="bov-hero-sub">{t('heroDescription')}</p>
      </section>

      {/* BLOG GRID */}
      <section className="bov-grid-section">
        <div className="bov-wrap">
          <BlogOverviewClient posts={posts} locale={locale} />
        </div>
      </section>

      {/* CTA */}
      <section className="teun-final" aria-labelledby="bov-cta-heading">
        <div className="wrap">
          <h2 id="bov-cta-heading">
            Lezen is leuk.<br /><em>Meten is beter.</em>
          </h2>
          <p>
            Genoeg theorie. Start een gratis scan en zie binnen een minuut hoe AI jouw merk noemt. Liever hulp? OnlineLabs helpt je met professionele GEO-optimalisatie.
          </p>
          <div className="btns">
            <Link href="/pricing" className="btn-secondary">
              Lite, €29,95/mnd
            </Link>
            <Link href="/pricing" className="btn-primary">
              Pro, €49,95/mnd <span aria-hidden="true">→</span>
            </Link>
          </div>
          <div className="bov-cta-links">
            <Link href="/signup" className="bov-link">
              Gratis account aanmaken <span aria-hidden="true">→</span>
            </Link>
            <a
              href="https://www.onlinelabs.nl/skills/geo-optimalisatie"
              target="_blank"
              rel="noopener noreferrer"
              className="bov-link bov-link-muted"
            >
              GEO door OnlineLabs <span aria-hidden="true">→</span>
            </a>
          </div>
          <p className="bov-cta-meta">
            Geen creditcard nodig voor gratis account. Beide pakketten maandelijks opzegbaar. Prijzen excl. BTW.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <BlogFAQ />
    </div>
  )
}

export const revalidate = 86400
