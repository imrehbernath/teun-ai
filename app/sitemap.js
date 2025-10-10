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
    const res = await fetch(process.env.WORDPRESS_GRAPHQL_URL, {
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

  // Static pages
  const staticPages = [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${siteUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${siteUrl}/auteur/imre`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
  ];

  // Dynamic blog post pages
  const blogPages = posts.map((post) => ({
    url: `${siteUrl}/${post.slug}`,
    lastModified: new Date(post.modified),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  return [...staticPages, ...blogPages];
}