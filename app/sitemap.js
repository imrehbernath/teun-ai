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

  // Helper: create alternates for multilingual pages (nl + en)
  const multiLangAlternates = (path) => ({
    languages: {
      nl: `${siteUrl}/nl${path}`,
      en: `${siteUrl}/en${path}`,
      'x-default': `${siteUrl}/nl${path}`,
    },
  });

  // Helper: create alternates for NL-only pages (blog)
  const nlOnlyAlternates = (path) => ({
    languages: {
      nl: `${siteUrl}/nl${path}`,
      'x-default': `${siteUrl}/nl${path}`,
    },
  });

  // Static pages — both languages
  const multiLangPages = [
    { path: '', changeFrequency: 'weekly', priority: 1.0 },
    { path: '/tools/ai-visibility', changeFrequency: 'weekly', priority: 0.8 },
    { path: '/tools/ai-rank-tracker', changeFrequency: 'weekly', priority: 0.8 },
    { path: '/tools/geo-audit', changeFrequency: 'weekly', priority: 0.8 },
    { path: '/login', changeFrequency: 'monthly', priority: 0.4 },
    { path: '/privacyverklaring', changeFrequency: 'monthly', priority: 0.3 },
  ];

  const staticPages = multiLangPages.flatMap((page) => [
    {
      url: `${siteUrl}/nl${page.path}`,
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

  // NL-only static pages (blog, author)
  const nlOnlyPages = [
    {
      url: `${siteUrl}/nl/blog`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
      alternates: nlOnlyAlternates('/blog'),
    },
    {
      url: `${siteUrl}/nl/auteur/imre`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
      alternates: nlOnlyAlternates('/auteur/imre'),
    },
  ];

  // Dynamic blog post pages — NL only
  const blogPages = posts.map((post) => ({
    url: `${siteUrl}/nl/${post.slug}`,
    lastModified: new Date(post.modified),
    changeFrequency: 'weekly',
    priority: 0.8,
    alternates: nlOnlyAlternates(`/${post.slug}`),
  }));

  return [...staticPages, ...nlOnlyPages, ...blogPages];
}
