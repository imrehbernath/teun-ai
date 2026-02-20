import Homepage from './components/Homepage';

export const metadata = {
  title: 'Teun.ai | Word jij genoemd in ChatGPT? Check het gratis',
  description: 'Gratis GEO analyse: zie wie AI aanbeveelt in jouw branche + krijg advies om hoger te scoren. Scan ChatGPT, Perplexity & Claude in 30 sec.',
  keywords: ['AI zichtbaarheid', 'GEO audit', 'AI-SEO analyse', 'Generative Engine Optimization', 'ChatGPT SEO', 'Perplexity SEO', 'AI visibility scanner'],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Teun.ai | Word jij genoemd in ChatGPT? Check het gratis',
    description: 'Gratis GEO analyse: zie wie AI aanbeveelt in jouw branche + krijg advies om hoger te scoren. Scan ChatGPT, Perplexity & Claude in 30 sec.',
    images: ['/og-image-teun-ai.webp'],
    type: 'website',
    locale: 'nl_NL',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Teun.ai | Word jij genoemd in ChatGPT? Check het gratis',
    description: 'Gratis GEO analyse: zie wie AI aanbeveelt in jouw branche + krijg advies om hoger te scoren. Scan ChatGPT, Perplexity & Claude in 30 sec.',
    images: ['/og-image-teun-ai.webp'],
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
        "name": "Teun.ai",
        "url": siteUrl,
        "description": "Teun.ai is de eerste AI visibility scanner voor de Nederlandse markt. Ontdek hoe zichtbaar jouw bedrijf is in ChatGPT, Perplexity, Claude en Gemini.",
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
        },
        "sameAs": [
          "https://profiles.wordpress.org/teunai/",
          "https://chromewebstore.google.com/detail/teunai-chatgpt-visibility/jjhjnmkanlmjhmobcgemjakkjdbkkfmk"
        ]
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        "url": siteUrl,
        "name": "Teun.ai",
        "alternateName": "Teun.ai - AI Zichtbaarheidsanalyse",
        "publisher": {
          "@id": `${siteUrl}/#organization`
        },
        "inLanguage": "nl-NL",
        "potentialAction": {
          "@type": "SearchAction",
          "target": `${siteUrl}/search?q={search_term_string}`,
          "query-input": "required name=search_term_string"
        }
      },
      {
        "@type": "WebPage",
        "@id": `${siteUrl}/#webpage`,
        "url": siteUrl,
        "name": "Teun.ai | Word jij genoemd in ChatGPT? Check het gratis",
        "datePublished": "2025-10-01T00:00:00+00:00",
        "dateModified": new Date().toISOString(),
        "about": {
          "@id": `${siteUrl}/#organization`
        },
        "isPartOf": {
          "@id": `${siteUrl}/#website`
        },
        "inLanguage": "nl-NL"
      },
      {
        "@type": "SoftwareApplication",
        "name": "Teun.ai AI Visibility Scanner",
        "applicationCategory": "BusinessApplication",
        "operatingSystem": "Web",
        "url": `${siteUrl}`,
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "EUR",
          "description": "2 gratis scans per maand"
        },
        "description": "Scan hoe zichtbaar jouw bedrijf is in AI-zoekmachines zoals ChatGPT, Perplexity, Claude en Gemini.",
        "provider": {
          "@id": `${siteUrl}/#organization`
        }
      },
      {
        "@type": "SoftwareApplication",
        "name": "Teun.ai ChatGPT Visibility Checker",
        "applicationCategory": "BrowserApplication",
        "operatingSystem": "Chrome",
        "url": "https://chromewebstore.google.com/detail/teunai-chatgpt-visibility/jjhjnmkanlmjhmobcgemjakkjdbkkfmk",
        "installUrl": "https://chromewebstore.google.com/detail/teunai-chatgpt-visibility/jjhjnmkanlmjhmobcgemjakkjdbkkfmk",
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "EUR"
        },
        "description": "Chrome extensie die direct in ChatGPT laat zien of jouw bedrijf wordt genoemd in AI-antwoorden.",
        "provider": {
          "@id": `${siteUrl}/#organization`
        }
      },
      {
        "@type": "SoftwareApplication",
        "name": "Teun.ai GEO — AI Visibility Optimizer",
        "applicationCategory": "BusinessApplication",
        "operatingSystem": "WordPress",
        "url": "https://profiles.wordpress.org/teunai/",
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "EUR"
        },
        "description": "WordPress plugin voor GEO-analyse. Meet hoe AI-klaar je pagina's zijn voor ChatGPT, Perplexity en Google AI Overviews.",
        "provider": {
          "@id": `${siteUrl}/#organization`
        }
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
      
      <Homepage />
    </>
  );
}

// Static caching - homepage verandert zelden
export const revalidate = 3600; // 1 uur cache
