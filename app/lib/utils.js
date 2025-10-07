// Format date for display
export function formatDate(dateString, locale = 'nl-NL') {
  const date = new Date(dateString);
  return date.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

// Strip HTML tags (for excerpts)
export function stripHtml(html) {
  return html.replace(/<[^>]*>/g, '').trim();
}

// Truncate text
export function truncate(text, length = 160) {
  if (text.length <= length) return text;
  return text.substring(0, length).trim() + '...';
}

// Generate reading time
export function calculateReadingTime(content) {
  const wordsPerMinute = 200;
  const text = stripHtml(content);
  const wordCount = text.split(/\s+/).length;
  const minutes = Math.ceil(wordCount / wordsPerMinute);
  return minutes;
}

// Validate email
export function isValidEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

// SEO: Generate JSON-LD structured data for articles
export function generateArticleSchema(post, siteUrl) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.seo?.metaDesc || post.excerpt,
    image: post.featuredImage?.node?.sourceUrl,
    datePublished: post.date,
    dateModified: post.modified,
    author: {
      '@type': 'Person',
      name: post.author?.node?.name,
      description: post.author?.node?.description,
    },
    publisher: {
      '@type': 'Organization',
      name: process.env.NEXT_PUBLIC_SITE_NAME,
      logo: {
        '@type': 'ImageObject',
        url: `${siteUrl}/logo.png`
      }
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${siteUrl}/blog/${post.slug}`
    }
  };
}

// AI Optimization: Add definition markers for better AI parsing
export function enhanceContentForAI(content) {
  // This would be used server-side to add structured markers
  // that AI engines can better parse
  return content;
}