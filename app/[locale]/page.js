// app/[locale]/page.js
import { setRequestLocale } from 'next-intl/server';
import { getHreflangAlternates } from '../components/Hreflang';
import Homepage from '../components/Homepage';

// Locale-aware metadata
export async function generateMetadata({ params }) {
  const { locale } = await params;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://teun.ai';

  if (locale === 'en') {
    return {
      title: 'Teun.ai | Is your business mentioned in ChatGPT? Check for free',
      description: 'Free GEO analysis: see who AI recommends in your industry + get tips to rank higher. Scan ChatGPT, Perplexity & Claude in 30 sec.',
      alternates: {
        canonical: `${siteUrl}/en`,
        languages: {
          'nl': siteUrl,
          'en': `${siteUrl}/en`,
          'x-default': siteUrl,
        },
      },
      openGraph: {
        title: 'Teun.ai | Is your business mentioned in ChatGPT? Check for free',
        description: 'Free GEO analysis: see who AI recommends in your industry + get tips to rank higher. Scan ChatGPT, Perplexity & Claude in 30 sec.',
        images: ['/og-image-teun-ai.webp'],
        type: 'website',
        locale: 'en_US',
        alternateLocale: 'nl_NL',
      },
    };
  }

  // Nederlands (default)
  return {
    title: 'Teun.ai | Word jij genoemd in ChatGPT? Check het gratis',
    description: 'Gratis GEO analyse: zie wie AI aanbeveelt in jouw branche + krijg advies om hoger te scoren. Scan ChatGPT, Perplexity & Claude in 30 sec.',
    alternates: {
      canonical: siteUrl,
      languages: {
        'nl': siteUrl,
        'en': `${siteUrl}/en`,
        'x-default': siteUrl,
      },
    },
    openGraph: {
      title: 'Teun.ai | Word jij genoemd in ChatGPT? Check het gratis',
      description: 'Gratis GEO analyse: zie wie AI aanbeveelt in jouw branche + krijg advies om hoger te scoren. Scan ChatGPT, Perplexity & Claude in 30 sec.',
      images: ['/og-image-teun-ai.webp'],
      type: 'website',
      locale: 'nl_NL',
      alternateLocale: 'en_US',
    },
  };
}

export default async function Home({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://teun.ai';
  
  // Structured Data (JSON-LD) — taal-aware
  const inLanguage = locale === 'nl' ? 'nl-NL' : 'en-US';
  const description = locale === 'nl'
    ? 'Teun.ai is de eerste AI visibility scanner voor de Nederlandse markt. Ontdek hoe zichtbaar jouw bedrijf is in ChatGPT, Perplexity, Claude en Gemini.'
    : 'Teun.ai is the first AI visibility scanner. Discover how visible your business is in ChatGPT, Perplexity, Claude, and Gemini.';

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
            "areaServed": ["NL", "Worldwide"],
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
        "description": description,
        "logo": {
          "@type": "ImageObject",
          "@id": `${siteUrl}/#logo`,
          "url": `${siteUrl}/Teun-ai-logo-light.png`,
          "contentUrl": `${siteUrl}/Teun-ai-logo-light.png`,
          "caption": "Teun.ai",
          "inLanguage": inLanguage,
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
        "alternateName": locale === 'nl' 
          ? "Teun.ai - AI Zichtbaarheidsanalyse"
          : "Teun.ai - AI Visibility Analysis",
        "publisher": {
          "@id": `${siteUrl}/#organization`
        },
        "inLanguage": [inLanguage, locale === 'nl' ? 'en-US' : 'nl-NL'],
        "potentialAction": {
          "@type": "SearchAction",
          "target": `${siteUrl}/search?q={search_term_string}`,
          "query-input": "required name=search_term_string"
        }
      },
      {
        "@type": "WebPage",
        "@id": `${siteUrl}/#webpage`,
        "url": locale === 'en' ? `${siteUrl}/en` : siteUrl,
        "name": locale === 'nl'
          ? "Teun.ai | Word jij genoemd in ChatGPT? Check het gratis"
          : "Teun.ai | Is your business mentioned in ChatGPT? Check for free",
        "datePublished": "2025-10-01T00:00:00+00:00",
        "dateModified": new Date().toISOString(),
        "about": { "@id": `${siteUrl}/#organization` },
        "isPartOf": { "@id": `${siteUrl}/#website` },
        "inLanguage": inLanguage
      },
      {
        "@type": "SoftwareApplication",
        "name": locale === 'nl' ? "Teun.ai AI Zichtbaarheid Scanner" : "Teun.ai AI Visibility Scanner",
        "applicationCategory": "BusinessApplication",
        "operatingSystem": "Web",
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "EUR",
          "description": locale === 'nl' 
            ? "2 gratis scans per maand"
            : "2 free scans per month"
        },
        "description": locale === 'nl'
          ? "Scan hoe zichtbaar jouw bedrijf is in AI-zoekmachines zoals ChatGPT, Perplexity, Claude en Gemini."
          : "Scan how visible your business is in AI search engines like ChatGPT, Perplexity, Claude, and Gemini.",
        "provider": { "@id": `${siteUrl}/#organization` }
      },
      {
        "@type": "SoftwareApplication",
        "name": locale === 'nl' ? "Teun.ai ChatGPT Zichtbaarheid Checker" : "Teun.ai ChatGPT Visibility Checker",
        "applicationCategory": "BrowserApplication",
        "operatingSystem": "Chrome",
        "url": "https://chromewebstore.google.com/detail/teunai-chatgpt-visibility/jjhjnmkanlmjhmobcgemjakkjdbkkfmk",
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "EUR"
        },
        "description": locale === 'nl'
          ? "Chrome extensie om direct je AI-zichtbaarheid te checken in ChatGPT en andere AI-zoekmachines."
          : "Chrome extension to instantly check your AI visibility in ChatGPT and other AI search engines.",
        "provider": { "@id": `${siteUrl}/#organization` }
      },
      {
        "@type": "SoftwareApplication",
        "name": locale === 'nl' ? "Teun.ai GEO — AI Zichtbaarheid Optimizer" : "Teun.ai GEO — AI Visibility Optimizer",
        "applicationCategory": "BusinessApplication",
        "operatingSystem": "WordPress",
        "url": "https://profiles.wordpress.org/teunai/",
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "EUR"
        },
        "description": locale === 'nl'
          ? "WordPress plugin voor GEO-analyse en AI-zichtbaarheidsoptimalisatie direct vanuit je WordPress dashboard."
          : "WordPress plugin for GEO analysis and AI visibility optimization directly from your WordPress dashboard.",
        "provider": { "@id": `${siteUrl}/#organization` }
      },
      {
        "@type": "Person",
        "@id": `${siteUrl}/auteur/imre`,
        "name": "Imre Bernáth",
        "description": locale === 'nl'
          ? "Imre Bernáth deelt inzichten over SEO, AI visibility en GEO-optimalisatie. Oprichter van Teun.ai en OnlineLabs. 15+ jaar ervaring in strategische online groei."
          : "Imre Bernáth shares insights on SEO, AI visibility, and GEO optimization. Founder of Teun.ai and OnlineLabs. 15+ years of experience in strategic online growth.",
        "url": `${siteUrl}/auteur/imre`,
        "image": {
          "@type": "ImageObject",
          "url": "https://secure.gravatar.com/avatar/af7b2a7481abdf2f7e034af53093a4176c62c4f396da8bfda072e201c18f63d0?s=96&d=mm&r=g",
          "caption": "Imre Bernáth",
          "inLanguage": inLanguage
        },
        "sameAs": [siteUrl, "https://nl.linkedin.com/in/imrebernath"],
        "worksFor": { "@id": "https://www.onlinelabs.nl/#organization" }
      }
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData)
        }}
      />
      
      {/* TODO: Maak een Engelse Homepage component of maak Homepage locale-aware */}
      <Homepage />
    </>
  );
}

export const revalidate = 3600;
