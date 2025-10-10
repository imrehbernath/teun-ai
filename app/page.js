import ComingSoon from './components/ComingSoon';

export const metadata = {
  title: 'Teun.ai – GEO Audits & AI-SEO Analyse | Live 1 januari 2026',
  description: 'Teun.ai: hét platform voor GEO Audits, AI-SEO analyse & AI-gedreven optimalisatie. Word zichtbaar in ChatGPT, Google AI, Bing AI & meer.',
  keywords: ['GEO audit', 'AI-SEO analyse', 'Generative Engine Optimization', 'ChatGPT SEO', 'Perplexity SEO', 'AI visibility'],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Teun.ai – GEO Audits & AI-SEO Analyse | Live 1 januari 2026',
    description: 'Teun.ai: hét platform voor GEO Audits, AI-SEO analyse & AI-gedreven optimalisatie. Word zichtbaar in ChatGPT, Google AI, Bing AI & meer.',
    images: ['/GEO-insights-en-AI-SEO.webp'],
    type: 'website',
    locale: 'nl_NL',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Teun.ai – GEO Audits & AI-SEO Analyse | Live 1 januari 2026',
    description: 'Teun.ai: hét platform voor GEO Audits, AI-SEO analyse & AI-gedreven optimalisatie. Word zichtbaar in ChatGPT, Google AI, Bing AI & meer.',
    images: ['/GEO-insights-en-AI-SEO.webp'],
  },
};

export default function Home() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://teun.ai';
  
  // Structured Data (JSON-LD)
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://www.onlinelabs.nl/#organization",
        "name": "OnlineLabs",
        "url": "https://www.onlinelabs.nl/",
        "logo": {
          "@type": "ImageObject",
          "@id": "https://www.onlinelabs.nl/#logo",
          "url": "https://cdn.onlinelabs.nl/wp-content/uploads/2025/01/18075444/OnlineLabs-logo.png",
          "contentUrl": "https://cdn.onlinelabs.nl/wp-content/uploads/2025/01/18075444/OnlineLabs-logo.png",
          "caption": "OnlineLabs",
          "inLanguage": "nl-NL",
          "width": "432",
          "height": "432"
        },
        "address": {
          "@type": "PostalAddress",
          "streetAddress": "Herengracht 221",
          "postalCode": "1016 BG",
          "addressLocality": "Amsterdam",
          "addressCountry": "NL"
        },
        "contactPoint": [
          {
            "@type": "ContactPoint",
            "telephone": "+31-20-820-2022",
            "contactType": "customer service",
            "email": "hallo@onlinelabs.nl",
            "areaServed": "NL",
            "availableLanguage": ["nl", "en"]
          }
        ],
        "sameAs": [
          "https://www.linkedin.com/company/onlinelabs"
        ]
      },
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        "name": "teun.ai",
        "url": siteUrl,
        "logo": {
          "@type": "ImageObject",
          "@id": `${siteUrl}/#logo`,
          "url": `${siteUrl}/Teun-ai-logo-light.png`,
          "contentUrl": `${siteUrl}/Teun-ai-logo-light.png`,
          "caption": "Teun.ai",
          "inLanguage": "nl-NL",
          "width": "512",
          "height": "512"
        },
        "parentOrganization": {
          "@id": "https://www.onlinelabs.nl/#organization"
        }
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        "url": siteUrl,
        "name": "Teun.ai",
        "alternateName": "Teun.ai",
        "publisher": {
          "@id": `${siteUrl}/#organization`
        },
        "inLanguage": "nl-NL",
        "potentialAction": {
          "@type": "SearchAction",
          "target": `${siteUrl}/?s={search_term_string}`,
          "query-input": "required name=search_term_string"
        }
      },
      {
        "@type": "ImageObject",
        "@id": `${siteUrl}/GEO-insights-en-AI-SEO.webp`,
        "url": `${siteUrl}/GEO-insights-en-AI-SEO.webp`,
        "width": "1200",
        "height": "675",
        "caption": "GEO insights en AI-SEO",
        "inLanguage": "nl-NL"
      },
      {
        "@type": "WebPage",
        "@id": `${siteUrl}/#webpage`,
        "url": siteUrl,
        "name": "Teun.ai – GEO Audits & AI-SEO Analyse | Live 1 januari 2026",
        "datePublished": "2021-05-24T18:58:15+00:00",
        "dateModified": new Date().toISOString(),
        "about": {
          "@id": `${siteUrl}/#organization`
        },
        "isPartOf": {
          "@id": `${siteUrl}/#website`
        },
        "primaryImageOfPage": {
          "@id": `${siteUrl}/GEO-insights-en-AI-SEO.webp`
        },
        "inLanguage": "nl-NL"
      },
      {
        "@type": "Person",
        "@id": `${siteUrl}/auteur/imre`,
        "name": "Imre Bernáth",
        "description": "Imre Bernáth deelt inzichten over SEO, AI visibility en GEO-optimalisatie. Oprichter van Teun.ai en OnlineLabs. 15+ jaar ervaring in strategische online groei.",
        "url": `${siteUrl}/auteur/imre`,
        "image": {
          "@type": "ImageObject",
          "url": "https://secure.gravatar.com/avatar/af7b2a7481abdf2f7e034af53093a4176c62c4f396da8bfda072e201c18f63d0?s=96&d=mm&r=g",
          "caption": "Imre Bernáth",
          "inLanguage": "nl-NL"
        },
        "sameAs": [siteUrl, "https://nl.linkedin.com/in/imrebernath"],
        "worksFor": {
          "@id": "https://www.onlinelabs.nl/#organization"
        }
      },
      {
        "@type": "Article",
        "headline": "Teun.ai – GEO Audits & AI-SEO Analyse | Live 1 januari 2026",
        "keywords": "GEO audit,AI-SEO analyse",
        "datePublished": "2021-05-24T18:58:15+00:00",
        "dateModified": new Date().toISOString(),
        "author": {
          "@id": `${siteUrl}/auteur/imre`,
          "name": "Imre Bernáth"
        },
        "publisher": {
          "@id": `${siteUrl}/#organization`
        },
        "description": "Teun.ai: hét platform voor GEO Audits, AI-SEO analyse & AI-gedreven optimalisatie. Word zichtbaar in ChatGPT, Google AI, Bing AI & meer.",
        "name": "Teun.ai – GEO Audits & AI-SEO Analyse | Live 1 januari 2026",
        "@id": `${siteUrl}/#richSnippet`,
        "isPartOf": {
          "@id": `${siteUrl}/#webpage`
        },
        "image": {
          "@id": `${siteUrl}/GEO-insights-en-AI-SEO.webp`
        },
        "inLanguage": "nl-NL",
        "mainEntityOfPage": {
          "@id": `${siteUrl}/#webpage`
        }
      }
    ]
  };

  return (
    <>
      {/* Structured Data (JSON-LD) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData)
        }}
      />
      
      <ComingSoon />
    </>
  );
}