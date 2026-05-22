/* eslint-disable react/no-unescaped-entities */
import { getLocale } from 'next-intl/server';
import { updates } from './updates-data';

export async function generateMetadata() {
  const locale = await getLocale();
  const isEn = locale === 'en';

  const title = isEn
    ? 'Product updates and changelog | Teun.ai'
    : 'Productupdates en changelog | Teun.ai';
  const description = isEn
    ? 'See all Teun.ai updates by month: new features, improvements and fixes for AI visibility and GEO. Continuously evolving and in active development.'
    : 'Bekijk alle updates van Teun.ai per maand: nieuwe features, verbeteringen en opgeloste issues voor AI-zichtbaarheid en GEO. Continu in ontwikkeling.';
  const url = isEn ? 'https://teun.ai/en/updates' : 'https://teun.ai/updates';

  return {
    title: { absolute: title },
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: 'Teun.ai',
      locale: isEn ? 'en_GB' : 'nl_NL',
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
    robots: { index: true, follow: true },
    alternates: {
      canonical: url,
      languages: {
        nl: 'https://teun.ai/updates',
        en: 'https://teun.ai/en/updates',
      },
    },
  };
}

// ============================================
// HELPERS
// ============================================
const CATEGORY_LABELS = {
  nl: { nieuw: 'Nieuw', verbeterd: 'Verbeterd', opgelost: 'Opgelost' },
  en: { nieuw: 'New', verbeterd: 'Improved', opgelost: 'Fixed' },
};

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatDate(dateStr, locale) {
  const d = new Date(dateStr);
  const formatter = new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'nl-NL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return formatter.format(d);
}

function formatMonth(dateStr, locale) {
  const d = new Date(dateStr);
  const formatter = new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'nl-NL', {
    month: 'long',
    year: 'numeric',
  });
  return capitalize(formatter.format(d));
}

function groupByMonth(items, locale) {
  const sorted = [...items].sort((a, b) => b.date.localeCompare(a.date));
  const groups = [];
  let currentKey = null;
  for (const item of sorted) {
    const key = item.date.slice(0, 7);
    if (key !== currentKey) {
      groups.push({ key, label: formatMonth(item.date, locale), items: [] });
      currentKey = key;
    }
    groups[groups.length - 1].items.push(item);
  }
  return groups;
}

// ============================================
// PAGE-LEVEL CONTENT
// ============================================
const PAGE_CONTENT = {
  nl: {
    eyebrow: 'TEUN.AI UPDATES',
    h1Lead: 'Teun.ai',
    h1Em: 'updates',
    intro:
      'Teun.ai wordt continu doorontwikkeld. Hieronder een overzicht van de nieuwste verbeteringen, nieuwe features en opgeloste issues, per maand op een rij.',
  },
  en: {
    eyebrow: 'TEUN.AI UPDATES',
    h1Lead: 'Teun.ai',
    h1Em: 'updates',
    intro:
      'Teun.ai is continuously evolving. Below is an overview of the latest improvements, new features and fixes, grouped per month.',
  },
};

// ============================================
// SHARED RENDER
// ============================================
function UpdatesContent({ locale }) {
  const isEn = locale === 'en';
  const labels = CATEGORY_LABELS[isEn ? 'en' : 'nl'];
  const content = PAGE_CONTENT[isEn ? 'en' : 'nl'];
  const groups = groupByMonth(updates, locale);

  return (
    <>
      <header className="upd-header">
        <div className="tool-eyebrow">{content.eyebrow}</div>
        <h1 className="upd-h1">
          {content.h1Lead} <em>{content.h1Em}</em>
        </h1>
        <p className="upd-intro">{content.intro}</p>
      </header>

      <div className="upd-timeline">
        {groups.map((group) => (
          <section key={group.key} className="upd-month">
            <h2 className="upd-month-title">{group.label}</h2>
            <ul className="upd-list">
              {group.items.map((item, idx) => {
                const title = isEn ? item.title_en : item.title_nl;
                const description = isEn ? item.description_en : item.description_nl;
                const dateLabel = formatDate(item.date, locale);
                const categoryLabel = labels[item.category] || item.category;
                const cardClass = item.highlight ? 'upd-card upd-card-h' : 'upd-card upd-card-c';

                return (
                  <li key={`${item.date}-${idx}`} className={cardClass}>
                    <div className="upd-meta">
                      <time dateTime={item.date} className="upd-date">
                        {dateLabel}
                      </time>
                      <span className={`upd-pill upd-pill-${item.category}`}>
                        {categoryLabel}
                      </span>
                    </div>
                    <div className="upd-body">
                      <h3 className="upd-title">{title}</h3>
                      {item.highlight && description ? (
                        <p className="upd-desc">{description}</p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}

// ============================================
// MAIN PAGE
// ============================================
export default async function UpdatesPage() {
  const locale = await getLocale();

  return (
    <div className="tool-page upd-page">
      <div className="upd-wrap">
        <UpdatesContent locale={locale} />

        {/* Scoped styles — cream/Lora/spark themed, matches privacyverklaring */}
        <style>{`
          .upd-page {
            background: var(--bg);
            min-height: 100vh;
          }
          .upd-wrap {
            max-width: 880px;
            margin: 0 auto;
            padding: 72px 24px 96px;
          }
          .upd-header {
            margin-bottom: 56px;
          }
          .tool-eyebrow {
            font-family: var(--font-mono), monospace;
            font-size: 11px;
            font-weight: 600;
            letter-spacing: 0.16em;
            color: var(--spark);
            margin-bottom: 14px;
          }
          .upd-h1 {
            font-family: var(--font-lora), serif;
            font-weight: 500;
            font-size: clamp(34px, 5vw, 48px);
            line-height: 1.1;
            letter-spacing: -0.02em;
            color: var(--ink);
            margin: 0 0 18px;
          }
          .upd-h1 em {
            font-style: italic;
            color: var(--navy);
            background-image: linear-gradient(
              transparent 78%,
              var(--spark-soft) 78%,
              var(--spark-soft) 92%,
              transparent 92%
            );
            padding: 0 4px;
          }
          .upd-intro {
            font-size: 16.5px;
            line-height: 1.65;
            color: var(--ink-2);
            max-width: 640px;
            margin: 0;
          }

          .upd-timeline {
            display: flex;
            flex-direction: column;
            gap: 48px;
          }
          .upd-month {
            display: flex;
            flex-direction: column;
            gap: 16px;
          }
          .upd-month-title {
            font-family: var(--font-lora), serif;
            font-weight: 500;
            font-size: clamp(22px, 2.6vw, 26px);
            letter-spacing: -0.01em;
            color: var(--ink);
            margin: 0 0 6px;
            padding-bottom: 12px;
            border-bottom: 1px solid var(--line);
          }
          .upd-list {
            list-style: none;
            padding: 0;
            margin: 0;
            display: flex;
            flex-direction: column;
            gap: 14px;
          }
          .upd-card {
            background: #fff;
            border: 1px solid var(--line);
            border-radius: 14px;
            padding: 22px 24px;
            transition: border-color 0.15s, box-shadow 0.15s;
          }
          .upd-card:hover {
            border-color: var(--line-2);
            box-shadow: 0 6px 20px rgba(15, 23, 48, 0.05);
          }
          .upd-card-c {
            padding: 14px 20px;
          }

          .upd-meta {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 10px;
            flex-wrap: wrap;
          }
          .upd-card-c .upd-meta {
            margin-bottom: 0;
            display: inline-flex;
            margin-right: 14px;
          }
          .upd-date {
            font-family: var(--font-mono), monospace;
            font-size: 11.5px;
            font-weight: 500;
            letter-spacing: 0.04em;
            color: var(--ink-3);
            text-transform: uppercase;
          }
          .upd-pill {
            font-family: var(--font-poppins), sans-serif;
            font-size: 10px;
            font-weight: 600;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            padding: 3px 9px;
            border-radius: 999px;
            line-height: 1.4;
          }
          .upd-pill-nieuw {
            background: rgba(232, 98, 58, 0.12);
            color: var(--spark);
          }
          .upd-pill-verbeterd {
            background: rgba(26, 43, 94, 0.1);
            color: var(--navy);
          }
          .upd-pill-opgelost {
            background: rgba(107, 115, 145, 0.14);
            color: var(--ink-3);
          }

          .upd-card-c .upd-body {
            display: inline;
          }
          .upd-title {
            font-family: var(--font-lora), serif;
            font-weight: 500;
            font-size: 19px;
            letter-spacing: -0.005em;
            color: var(--ink);
            margin: 0 0 8px;
            line-height: 1.35;
          }
          .upd-card-c .upd-title {
            font-family: var(--font-poppins), sans-serif;
            font-weight: 500;
            font-size: 14.5px;
            color: var(--ink);
            margin: 0;
            display: inline;
            line-height: 1.5;
          }
          .upd-desc {
            font-size: 15px;
            line-height: 1.65;
            color: var(--ink-2);
            margin: 0;
          }

          @media (max-width: 640px) {
            .upd-wrap {
              padding: 56px 20px 72px;
            }
            .upd-card {
              padding: 18px 18px;
            }
            .upd-card-c {
              padding: 14px 16px;
            }
            .upd-card-c .upd-meta {
              display: flex;
              margin-right: 0;
              margin-bottom: 6px;
            }
            .upd-card-c .upd-body,
            .upd-card-c .upd-title {
              display: block;
            }
          }
        `}</style>
      </div>
    </div>
  );
}
