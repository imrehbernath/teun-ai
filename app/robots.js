export default function robots() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://teun.ai';
  
  // Check if NOT on production (any Vercel preview URL or non-production domain)
  const isProduction = baseUrl === 'https://teun.ai';
  
  if (!isProduction) {
    // Preview/Staging: Block everything
    return {
      rules: {
        userAgent: '*',
        disallow: '/',
      },
      sitemap: null,
    };
  }
  
  // Production: Allow everything with special AI bot rules
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin/'],
      },
      // OpenAI Bots
      {
        userAgent: 'GPTBot',
        allow: '/',
      },
      {
        userAgent: 'ChatGPT-User',
        allow: '/',
      },
      // Google AI
      {
        userAgent: 'Google-Extended',
        allow: '/',
      },
      {
        userAgent: 'GoogleOther',
        allow: '/',
      },
      // Anthropic Claude
      {
        userAgent: 'Claude-Web',
        allow: '/',
      },
      {
        userAgent: 'anthropic-ai',
        allow: '/',
      },
      // Perplexity
      {
        userAgent: 'PerplexityBot',
        allow: '/',
      },
      // Meta AI
      {
        userAgent: 'FacebookBot',
        allow: '/',
      },
      // Bing/Microsoft
      {
        userAgent: 'Bingbot',
        allow: '/',
      },
      // Common Crawl (for AI training)
      {
        userAgent: 'CCBot',
        allow: '/',
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}