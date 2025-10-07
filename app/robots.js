export default function robots() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://preview.teun.ai';
  const isPreview = baseUrl.includes('preview');
  
  if (isPreview) {
    // Preview: Block everything
    return {
      rules: {
        userAgent: '*',
        disallow: '/',
      },
      sitemap: null, // No sitemap for preview
    };
  }
  
  // Production: Allow everything
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin/'],
      },
      {
        userAgent: 'GPTBot',
        allow: '/',
      },
      {
        userAgent: 'PerplexityBot',
        allow: '/',
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}