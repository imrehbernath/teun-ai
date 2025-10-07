export default async function sitemap() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://preview.teun.ai';
  
  // Static pages
  const routes = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    // Add more static pages later:
    // {
    //   url: `${baseUrl}/tools`,
    //   lastModified: new Date(),
    //   changeFrequency: 'weekly',
    //   priority: 0.8,
    // },
  ];

  // Later: Add dynamic blog posts from WordPress
  // const posts = await getPosts();
  // const postUrls = posts.map((post) => ({
  //   url: `${baseUrl}/blog/${post.slug}`,
  //   lastModified: new Date(post.modified),
  //   changeFrequency: 'weekly',
  //   priority: 0.7,
  // }));

  return routes;
}