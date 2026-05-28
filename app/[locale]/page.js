// app/[locale]/page.js
import Homepage from '../components/Homepage';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import Script from 'next/script';

// Statische rendering aanzetten voor maximale CWV/LCP
export async function generateStaticParams() {
  return [{ locale: 'nl' }, { locale: 'en' }];
}

export default async function HomePage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Translations ophalen voor JSON-LD (server-side)
  const t = await getTranslations({ locale, namespace: 'home' });

  const isNl = locale === 'nl';
  const siteUrl = 'https://teun.ai';
  const pageUrl = isNl ? siteUrl : `${siteUrl}/en`;

  // === FAQPage schema ===
  // Strip HTML tags voor schema (Google wil plain text)
  const stripHtml = (html) => {
    if (!html) return '';
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${pageUrl}#faq`,
    "mainEntity": Array.from({ length: 9 }, (_, i) => i + 1).map((n) => ({
      "@type": "Question",
      "name": t(`faq.q${n}`),
      "acceptedAnswer": {
        "@type": "Answer",
        "text": stripHtml(t.raw(`faq.a${n}`))
      }
    }))
  };

  // === SoftwareApplication schema ===
  const softwareSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `${siteUrl}#software`,
    "name": "Teun.ai",
    "applicationCategory": "BusinessApplication",
    "applicationSubCategory": "SEO Software",
    "operatingSystem": "Web",
    "description": isNl
      ? "GEO-platform dat meet hoe ChatGPT, Perplexity, Google AI Overview en Google AI Mode jouw merk vermelden."
      : "GEO platform that measures how ChatGPT, Perplexity, Google AI Overview and Google AI Mode mention your brand.",
    "url": pageUrl,
    "offers": [
      {
        "@type": "Offer",
        "name": isNl ? "Gratis scan" : "Free scan",
        "price": "0",
        "priceCurrency": "EUR",
        "description": isNl
          ? "10 commerciële prompts op 4 AI-platformen, geen account vereist"
          : "10 commercial prompts on 4 AI platforms, no account required"
      },
      {
        "@type": "Offer",
        "name": "Lite",
        "price": "29.95",
        "priceCurrency": "EUR",
        "priceSpecification": {
          "@type": "UnitPriceSpecification",
          "price": "29.95",
          "priceCurrency": "EUR",
          "unitCode": "MON",
          "billingDuration": "P1M"
        }
      },
      {
        "@type": "Offer",
        "name": "Pro",
        "price": "49.95",
        "priceCurrency": "EUR",
        "priceSpecification": {
          "@type": "UnitPriceSpecification",
          "price": "49.95",
          "priceCurrency": "EUR",
          "unitCode": "MON",
          "billingDuration": "P1M"
        }
      }
    ],
    "creator": {
      "@id": `${siteUrl}/#organization`
    },
    "featureList": isNl ? [
      "AI Zichtbaarheid Scan op 4 platformen",
      "AI Rank Tracker",
      "AI Brand Check met sentiment-analyse",
      "GEO Audit met 42 checks",
      "AI Prompt Explorer met zoekvolumes"
    ] : [
      "AI Visibility Scan across 4 platforms",
      "AI Rank Tracker",
      "AI Brand Check with sentiment analysis",
      "GEO Audit with 42 checks",
      "AI Prompt Explorer with search volumes"
    ],
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "reviewCount": "47",
      "bestRating": "5"
    }
  };

  // === BreadcrumbList ===
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": pageUrl
      }
    ]
  };

  // === WebPage schema (specifiek voor homepage) ===
  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${pageUrl}#webpage`,
    "url": pageUrl,
    "name": isNl
      ? "Teun.ai | Word jij genoemd in ChatGPT? Check het gratis"
      : "Teun.ai | Is your business mentioned in ChatGPT? Check for free",
    "description": isNl
      ? "Gratis GEO analyse: zie wie AI aanbeveelt in jouw branche + krijg advies om hoger te scoren. Scan ChatGPT, Perplexity & Google AI in 2 min."
      : "Free GEO analysis: see who AI recommends in your industry + get tips to rank higher. Scan ChatGPT, Perplexity & Google AI in 2 min.",
    "inLanguage": isNl ? 'nl-NL' : 'en-US',
    "isPartOf": {
      "@id": `${siteUrl}/#website`
    },
    "primaryImageOfPage": {
      "@type": "ImageObject",
      "url": `${siteUrl}/GEO-insights-en-AI-SEO.webp`,
      "width": 1200,
      "height": 630
    },
    "datePublished": "2024-09-01T00:00:00+02:00",
    "dateModified": new Date().toISOString(),
    "breadcrumb": breadcrumbSchema,
    "mainEntity": {
      "@id": `${siteUrl}#software`
    }
  };

  return (
    <>
      <Script
        id="schema-faq"
        type="application/ld+json"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <Script
        id="schema-software"
        type="application/ld+json"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
      />
      <Script
        id="schema-webpage"
        type="application/ld+json"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }}
      />
      <Homepage />
    </>
  );
}
