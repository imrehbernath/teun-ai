export default async function sitemap() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://teun.ai';

  // Fetch all blog posts from WordPress
  const query = `
    query GetAllPosts {
      posts(first: 1000, where: { orderby: { field: DATE, order: DESC } }) {
        nodes {
          slug
          modified
        }
      }
    }
  `;

  let posts = [];

  try {
    const res = await fetch(process.env.WORDPRESS_GRAPHQL_URL || 'https://assets.teun.ai/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
      next: { revalidate: 3600 }
    });

    const json = await res.json();
    posts = json.data?.posts?.nodes || [];
  } catch (error) {
    console.error('Sitemap fetch error:', error);
  }

  // Helper: alternates for multilingual pages (NL in root, EN under /en/)
  const multiLangAlternates = (path) => ({
    languages: {
      nl: `${siteUrl}${path}`,
      en: `${siteUrl}/en${path}`,
      'x-default': `${siteUrl}${path}`,
    },
  });

  // Helper: alternates for NL-only pages (blog)
  const nlOnlyAlternates = (path) => ({
    languages: {
      nl: `${siteUrl}${path}`,
      'x-default': `${siteUrl}${path}`,
    },
  });

  // Static pages — both languages
  const multiLangPages = [
    { path: '', changeFrequency: 'weekly', priority: 1.0 },
    { path: '/tools/ai-visibility', changeFrequency: 'weekly', priority: 0.8 },
    { path: '/tools/ai-rank-tracker', changeFrequency: 'weekly', priority: 0.8 },
    { path: '/tools/geo-audit', changeFrequency: 'weekly', priority: 0.8 },
    { path: '/tools/brand-check', changeFrequency: 'weekly', priority: 0.8 },
  ];

  // Privacy page has different slugs per language
  const privacyPages = [
    {
      url: `${siteUrl}/privacyverklaring`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
      alternates: {
        languages: {
          nl: `${siteUrl}/privacyverklaring`,
          en: `${siteUrl}/en/privacy`,
          'x-default': `${siteUrl}/privacyverklaring`,
        },
      },
    },
    {
      url: `${siteUrl}/en/privacy`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
      alternates: {
        languages: {
          nl: `${siteUrl}/privacyverklaring`,
          en: `${siteUrl}/en/privacy`,
          'x-default': `${siteUrl}/privacyverklaring`,
        },
      },
    },
  ];

  const staticPages = multiLangPages.flatMap((page) => [
    {
      url: `${siteUrl}${page.path}`,
      lastModified: new Date(),
      changeFrequency: page.changeFrequency,
      priority: page.priority,
      alternates: multiLangAlternates(page.path),
    },
    {
      url: `${siteUrl}/en${page.path}`,
      lastModified: new Date(),
      changeFrequency: page.changeFrequency,
      priority: page.priority,
      alternates: multiLangAlternates(page.path),
    },
  ]);

  // NL-only static pages (blog, author) — in root
  const nlOnlyPages = [
    {
      url: `${siteUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
      alternates: nlOnlyAlternates('/blog'),
    },
    {
      url: `${siteUrl}/auteur/imre`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
      alternates: nlOnlyAlternates('/auteur/imre'),
    },
  ];

  // Dynamic blog post pages — NL only, in root
  const blogPages = posts.map((post) => ({
    url: `${siteUrl}/${post.slug}`,
    lastModified: new Date(post.modified),
    changeFrequency: 'weekly',
    priority: 0.8,
    alternates: nlOnlyAlternates(`/${post.slug}`),
  }));

  return [...staticPages, ...privacyPages, ...nlOnlyPages, ...blogPages];
}
