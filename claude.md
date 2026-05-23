Je werkt op de Teun.ai codebase voor Imre Bernáth (OnlineLabs). Lees eerst de volgende files voordat je iets doet:

1. Eventuele CLAUDE.md of SKILL.md in deze repo
2. package.json + next.config.mjs voor stack-context
3. lib/beta-config.js voor tier/rate limit configuratie

## Project context

- **Stack:** Next.js 15 + React 19 + Tailwind + Supabase (PostgreSQL + RLS) + Vercel (Hobby plan)
- **i18n:** next-intl, NL op root (/tools/...), EN op /en/. NOOIT /nl/ prefix
- **Taal codebase:** JavaScript (geen TypeScript)
- **Payments:** Stripe (Lite €29,95, Pro €49,95, beide excl. BTW)
- **APIs:** OpenAI gpt-4o-search-preview, Perplexity sonar-pro/sonar, SerpAPI, Anthropic Claude (model: claude-sonnet-4-6), ScraperAPI

## Werkregels (kritiek)

1. **Alleen veranderen wat expliciet gevraagd is.** Geen "creative improvements" buiten scope. Niets verwijderen of veranderen wat niet gevraagd is. Bij twijfel: vraag eerst.

2. **1:1 rule:** Als ik vraag iets letterlijk over te nemen van een bron, kopieer dan letterlijk. Geen class names, helpers, structuur of values aanpassen. Source = truth.

3. **Geen em dashes (—) in code comments, content, of output.** Gebruik komma's, punten, of herschrijf de zin.

4. **Geen "Ontdek" / "Discover" in headings, CTAs, meta descriptions.**

5. **Geen AI filler:** geen "essentieel", "cruciaal", "in een wereld waar...".

6. **Git commands altijd in één code block** zodat ik alles in één keer kan kopiëren:
```
   git add .
   git commit -m "msg"
   git push
```
   NOOIT chainen met `;` of `&&` (ik gebruik PowerShell).

7. **Supabase delete order:** chatgpt_query_results EERST (FK constraint op chatgpt_scans), dan andere tabellen.

8. **Teun.ai blog is Dutch-only.** Geen EN translation keys, geen isNL ternaries, hardcoded Dutch tekst is correct.

9. **Routing:** NL pages op root (e.g., `/tools/ai-prompt-explorer`), EN op `/en/` (e.g., `/en/tools/ai-prompt-explorer`). Nooit `/nl/` prefix.

10. **SEO meta:** Title max 580px, description max 920px mobiel / 944px desktop. Dicht tegen de limiet schrijven, niet veilig.

11. **Bij elke copy/i18n wijziging zowel NL als EN bijwerken in dezelfde edit.**

12. **Lokaal testen voor live:** wijzigingen eerst lokaal door Imre laten testen voor `git push`, tenzij expliciet anders gevraagd.

## Communicatie

- Antwoord in het Nederlands tenzij ik iets anders aangeef
- Korte, directe antwoorden. Geen pluche.
- Als je iets niet zeker weet over de codebase: check eerst, gok niet.
- Bij grotere changes: laat eerst zien wat je gaat doen, dan pas uitvoeren.

## Tier-systeem (actueel)

| Tier | Prijs | Keywords tracker | Auto-scan | GEO prompts | Support |
|---|---|---|---|---|---|
| Free | €0 | 5 handmatig, 2 rank checks/week | Nee | Beperkt | Geen |
| Lite | €29,95/mnd | **20 handmatig** | **Nee** | 10 | E-mail |
| Pro | €49,95/mnd | **50 + automatisch wekelijks** | **Ja (Pro-only)** | Onbeperkt | E-mail + telefonisch |

**Auto-tracking is alleen Pro.** Pricing, FAQ, tool-CTAs en dashboard moeten dit consistent communiceren — Lite NOOIT als "automatisch" framen.

**Stripe webhook** schrijft `subscription_tier` ('lite'|'pro') naar `profiles`. Legacy subscribers (tier null + status active) worden als pro behandeld (zie [lib/beta-config.js:236](lib/beta-config.js#L236)).

**`lib/rank-tracker-tiers.js`** gebruikt keys `free|starter|pro`. Mapping van Stripe-tier: `lite → starter`, `pro → pro`. Pas die mapping toe in [app/api/tracked-keywords/route.js:32-34](app/api/tracked-keywords/route.js#L32).

## Belangrijke shared libs

- **`lib/rank-scanner.js`** — Scanners (scanChatGPT/Perplexity/GoogleAI) + brand matching helpers (matchesBrand, textMentionsBrand, findBrandSnippet) + runLiveScan. **Gedeeld door** `/tools/ai-rank-tracker` (tool-page), `/api/tracked-keywords` (dashboard) en `/api/cron/scan-user` (auto-scan worker). Wijzigingen hier raken alle drie consumers.
- **`lib/keyword-prompt-generator.js`** — `generateKeywordPrompt({ keyword, serviceArea, locale })` async. Claude Sonnet 4.6 met rule-based fallback. Wordt 1x aangeroepen bij keyword add/edit en bij elke tool-page scan.
- **`lib/beta-config.js`** — Rate limits voor AI Visibility + GEO Optimalisatie. Free/Lite/Pro bypass-logica met admin email override.
- **`lib/rank-tracker-tiers.js`** — `RANK_TRACKER_TIERS.{free,starter,pro}` met `maxKeywords`, `maxCompetitors`, `cronEnabled`.

## Brand matching conventies (rank-scanner)

- **`matchesBrand`**: includes-check eerst, dan normalized (strip `&`, `en`, `and`, non-alfanumeriek), dan Levenshtein ≥ 0.9. Lost "Online Labs" vs "OnlineLabs" en "Sinck&Ko" vs "Sinck en Ko" varianten op.
- **`textMentionsBrand`**: zelfde normalize. Bepaalt `found` flag wanneer brand wel in tekst maar niet in ranking.
- **`findBrandSnippet`**: whitespace-flex regex (`\s*` tussen elke char). Voor snippet extractie.
- **`stripMarkdown`** haalt ook backslash-escapes weg (`\(`, `\-` etc.).

Bij scanner-aanpassingen: NIET in tool-page route inline kopiëren, gebruik altijd lib import (duplicate code raakt out-of-sync, zie historische bugs).

## Auto-tracking cron architectuur

Vercel Hobby plan = 60s function limit + dagelijkse crons only. Daarom:

- **`/api/cron/rank-scan`** = coordinator. Dagelijks 04:00 UTC. Filtert Pro users met `auto_scan_enabled=true`, spreidt via `hash(userId) % 7 === UTC-weekdag`, chunkt keywords in batches van 3, fire-and-forget POST naar worker.
- **`/api/cron/scan-user`** = worker. 1 batch (max 3 keywords) parallel via `runLiveScan` → schrijft naar `rank_history`.
- **CRON_SECRET** in `Authorization: Bearer` header (env: zowel `.env.local` als Vercel).
- **NEXT_PUBLIC_SITE_URL** moet correct staan (prod = `https://teun.ai`, dev = `http://localhost:3000`) voor cross-route fetch.
- Schema: `0 4 * * *` UTC (06:00 NL zomertijd) in `vercel.json`.

## DB schema kerntabellen

- **profiles**: `subscription_status` (active|canceling|past_due|canceled), `subscription_tier` (lite|pro|null=legacy), `auto_scan_enabled` BOOLEAN, `stripe_customer_id`
- **tracked_keywords**: `keyword`, `generated_prompt`, `brand_name`, `domain`, `service_area`, `competitors[]`
- **rank_history**: `tracked_keyword_id`, `platform` (chatgpt|perplexity|google_ai), `position`, `found`, `total_results`, `rankings` JSONB, `snippet`, `full_response`, `scanned_at`
- **rank_checks**: tool-page scans (anonymous via ip_address of auth)
- **tool_integrations**: GEO Analyse scans per `company_name`, met `session_token` voor anoniem-naar-user claim
- **prompt_discovery_results**: prompt explorer, session-based + user_id na claim
- **google_ai_scans / google_ai_overview_scans**: GEO Analyse SerpAPI batches met `appendToScanId` voor Pro chunking

## Productie env (al ingesteld)

- `CRON_SECRET` (32 hex)
- `NEXT_PUBLIC_SITE_URL` = `https://teun.ai`
- `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `PERPLEXITY_API_KEY`, `SERPAPI_KEY`, `SCRAPER_API_KEY`
- Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_LITE_MONTHLY/ANNUAL`, `STRIPE_PRICE_PRO_MONTHLY/ANNUAL`
- Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

SQL al gedraaid:
```
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS auto_scan_enabled BOOLEAN DEFAULT false;
```

## Claude API motor (de "motor")

[app/api/ai-visibility-analysis/route.js](app/api/ai-visibility-analysis/route.js) bevat `generatePromptsWithClaude` met een uitgebreide regelset (variatie, vakjargon, anti-marketing-jargon, B2B/B2C, locatie-logica, verboden vraagtypen). Dit is de motor voor commerciële prompts en wordt door Imre apart geoptimaliseerd. **Niet zelf wijzigen tenzij Imre input geeft.** De Rank Tracker gebruikt een afgeleide subset via `lib/keyword-prompt-generator.js`.

## Admin

Admin emails: `imre@onlinelabs.nl`, `hallo@onlinelabs.nl`. Hard-coded check in meerdere routes (bypass voor rate limits, Pro features, etc.).

## Open items (paused)

- **`api_usage_log` tabel + admin kosten-dashboard widget** voor SerpAPI/ScraperAPI/Anthropic/OpenAI/Perplexity. Plan: MVP self-tracking + live SerpAPI/ScraperAPI balance via `/account.json`. Geparkeerd voor later.
- Legacy `tracked_keywords` hebben oude rule-based prompts. Pas bij keyword bewerken krijgen ze de Claude-versie. Optioneel: bulk-regenerate script wanneer Imre hier om vraagt.

## Bevestig dat je dit hebt gelezen en wacht op mijn eerste taak.
