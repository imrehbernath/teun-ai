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

  // Static pages — both NL + EN (same slug)
  const multiLangPages = [
    { path: '', changeFrequency: 'weekly', priority: 1.0 },
    { path: '/tools', changeFrequency: 'weekly', priority: 0.8 },
    { path: '/tools/ai-visibility', changeFrequency: 'weekly', priority: 0.8 },
    { path: '/tools/ai-rank-tracker', changeFrequency: 'weekly', priority: 0.8 },
    { path: '/tools/geo-audit', changeFrequency: 'weekly', priority: 0.8 },
    { path: '/tools/brand-check', changeFrequency: 'weekly', priority: 0.8 },
    { path: '/tools/ai-prompt-explorer', changeFrequency: 'weekly', priority: 0.8 },
    { path: '/tools/ai-prompt-discovery', changeFrequency: 'weekly', priority: 0.8 },
    { path: '/wordpress-plugin', changeFrequency: 'monthly', priority: 0.7 },
    { path: '/pricing', changeFrequency: 'weekly', priority: 0.7 },
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

  // Pages with different NL/EN slugs
  const differentSlugPages = [
    {
      nl: '/privacyverklaring',
      en: '/en/privacy',
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      nl: '/over-ons',
      en: '/en/about-us',
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];

  const diffSlugEntries = differentSlugPages.flatMap((page) => {
    const alternates = {
      languages: {
        nl: `${siteUrl}${page.nl}`,
        en: `${siteUrl}${page.en}`,
        'x-default': `${siteUrl}${page.nl}`,
      },
    };
    return [
      {
        url: `${siteUrl}${page.nl}`,
        lastModified: new Date(),
        changeFrequency: page.changeFrequency,
        priority: page.priority,
        alternates,
      },
      {
        url: `${siteUrl}${page.en}`,
        lastModified: new Date(),
        changeFrequency: page.changeFrequency,
        priority: page.priority,
        alternates,
      },
    ];
  });

  // NL-only static pages (blog, author, GEO info page)
  const nlOnlyPages = [
    {
      url: `${siteUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
      alternates: nlOnlyAlternates('/blog'),
    },
    {
      url: `${siteUrl}/wat-is-generative-engine-optimisation-geo`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
      alternates: nlOnlyAlternates('/wat-is-generative-engine-optimisation-geo'),
    },
    {
      url: `${siteUrl}/auteur/imre`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
      alternates: nlOnlyAlternates('/auteur/imre'),
    },
  ];

  // Dynamic blog post pages — NL only
  const blogPages = posts.map((post) => ({
    url: `${siteUrl}/${post.slug}`,
    lastModified: new Date(post.modified),
    changeFrequency: 'weekly',
    priority: 0.8,
    alternates: nlOnlyAlternates(`/${post.slug}`),
  }));

  return [...staticPages, ...diffSlugEntries, ...nlOnlyPages, ...blogPages];
}
