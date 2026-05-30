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
- **`lib/prompt-engine.js`** — Motor-functies geëxtraheerd uit `/api/ai-visibility-analysis`: `scrapeWebsite` (3-staps ScraperAPI Ultra fallback), `parseHtmlContent`, `analyzeWebsiteForKeywords` (Claude website-analyse), `generatePromptsWithClaude` (10 commerciële prompts met 14 strenge regels), en nieuwe `estimatePromptVolumes` (per prompt AI-volume + trend + difficulty). 1:1 uit motor, geen logica-wijziging. **Gedeeld door** `/api/ai-visibility-analysis` (motor) en `/api/prompt-explorer` (nieuwe Prompt Explorer-backend).
- **`lib/keyword-prompt-generator.js`** — `generateKeywordPrompt({ keyword, serviceArea, locale })` async. Claude Sonnet 4.6 met rule-based fallback. Wordt 1x aangeroepen bij keyword add/edit en bij elke tool-page scan.
- **`lib/beta-config.js`** — Rate limits voor AI Visibility + GEO Optimalisatie. Free/Lite/Pro bypass-logica met admin email override.
- **`lib/rank-tracker-tiers.js`** — `RANK_TRACKER_TIERS.{free,starter,pro}` met `maxKeywords`, `maxCompetitors`, `cronEnabled`.
- **`lib/competitor-extract.js`** — Gedeelde competitor-extractie voor LLM-output (ChatGPT, Perplexity, AI Mode). Exports: `cleanCompetitorName`, `isValidCompetitorName`, `COMPETITOR_EXCLUDE_LIST`, `extractCompetitorsFromChatGPT`, `extractCompetitorsFromPerplexity`, `getPerplexityCompetitorSystemPrompt`, `stripCompetitorBlock`. Filtert section-headers/labels/blog-titels en bevat brede excludeList (platforms, steden, service-termen). Gedeeld door `/api/scan-selected-prompts` (ChatGPT+Perplexity) en `/api/scan-google-ai` (text-based extractie). `/api/ai-visibility-analysis` heeft eigen inline-versie en wordt nog niet via deze lib gerouteerd (motor-clausule).
- **`lib/session-token.js`** — `getOrCreateSessionToken()` zet httpOnly cookie `teun_session_token` (30 dagen). `claimSessionData(supabase, userId, fallbackToken, opts)` claimt scans bij signup: bij `opts.scanIds` / `opts.discoveryIds` selective claim (alleen specifieke rows), anders legacy mode (alles met matching cookie). Zie sectie "Selective claim".

## Brand matching conventies (rank-scanner)

- **`matchesBrand`**: includes-check eerst, dan normalized (strip `&`, `en`, `and`, non-alfanumeriek), dan Levenshtein ≥ 0.9. Lost "Online Labs" vs "OnlineLabs" en "Sinck&Ko" vs "Sinck en Ko" varianten op.
- **`textMentionsBrand`**: zelfde normalize. Bepaalt `found` flag wanneer brand wel in tekst maar niet in ranking.
- **`findBrandSnippet`**: whitespace-flex regex (`\s*` tussen elke char). Voor snippet extractie.
- **`stripMarkdown`** haalt ook backslash-escapes weg (`\(`, `\-` etc.).

Bij scanner-aanpassingen: NIET in tool-page route inline kopiëren, gebruik altijd lib import (duplicate code raakt out-of-sync, zie historische bugs).

## Auto-tracking cron architectuur

Vercel Hobby plan = 60s function limit + dagelijkse crons only. Daarom:

- **`/api/cron/rank-scan`** = coordinator. Dagelijks 04:00 UTC.
  - **Rank Tracker-deel** filtert op `profiles.auto_scan_enabled=true` (per-user), spreidt via `hash(userId) % 7 === UTC-weekdag`, chunkt keywords in batches van 3, fire-and-forget POST naar `/api/cron/scan-user`.
  - **AI Visibility-deel** filtert op `tool_integrations.auto_scan_enabled=true` (per-bedrijf), join naar `profiles` voor Pro-check, dag-spreiding op user-id zodat alle bedrijven van 1 user op dezelfde dag draaien. Per integration: fire-and-forget POST naar `/api/scan-selected-prompts`, `/api/scan-google-ai` en `/api/scan-google-ai-overview` (alle drie met `writeHistory:true`).
- **`/api/cron/scan-user`** = worker (alleen Rank Tracker). 1 batch (max 3 keywords) parallel via `runLiveScan` → schrijft naar `rank_history`.
- **CRON_SECRET** in `Authorization: Bearer` header (env: zowel `.env.local` als Vercel).
- **NEXT_PUBLIC_SITE_URL** moet correct staan (prod = `https://teun.ai`, dev = `http://localhost:3000`) voor cross-route fetch.
- Schema: `0 4 * * *` UTC (06:00 NL zomertijd) in `vercel.json`.

## DB schema kerntabellen

- **profiles**: `subscription_status` (active|canceling|past_due|canceled), `subscription_tier` (lite|pro|null=legacy), `auto_scan_enabled` BOOLEAN (Rank Tracker only, NIET AI Visibility), `stripe_customer_id`
- **tracked_keywords**: `keyword`, `generated_prompt`, `brand_name`, `domain`, `service_area`, `competitors[]`
- **rank_history**: `tracked_keyword_id`, `platform` (chatgpt|perplexity|google_ai), `position`, `found`, `total_results`, `rankings` JSONB, `snippet`, `full_response`, `scanned_at`
- **rank_checks**: tool-page scans (anonymous via ip_address of auth)
- **tool_integrations**: GEO Analyse scans per `company_name`, met `session_token` voor anoniem-naar-user claim, `auto_scan_enabled` BOOLEAN (per-bedrijf AI Visibility auto-scan toggle)
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
ALTER TABLE tool_integrations ADD COLUMN IF NOT EXISTS auto_scan_enabled BOOLEAN DEFAULT false;
```

## AI Visibility scan architectuur

Vier platforms worden gescand voor commerciële prompts uit `tool_integrations.commercial_prompts`:

### Routes
- **`/api/scan-selected-prompts`** = ChatGPT (gpt-4o-search-preview) + Perplexity (sonar-pro). Schrijft `tool_integrations.results` + `visibility_history` rows. Incremental mode: nee (scant altijd alle prompts).
- **`/api/scan-google-ai`** = Google AI Mode via SerpAPI (`engine=google_ai_mode`). Werkt prima voor NL queries met `gl=nl, hl=nl`. Schrijft `google_ai_scans` + `visibility_history`.
- **`/api/scan-google-ai-overview`** = Google AI Overview via SerpAPI (twee-traps: `engine=google` → `page_token` → `engine=google_ai_overview`). Schrijft `google_ai_overview_scans` + `visibility_history`.

### Bedrijfsnamen-extractie via ===BEDRIJVEN===-blok
ChatGPT en Perplexity krijgen via de system prompt een verplicht afsluitend blok afgedwongen:
```
===BEDRIJVEN===
1. Bedrijfsnaam
2. Bedrijfsnaam
===EINDE BEDRIJVEN===
```
Parser leest dit blok primair via `extractCompetitorsFromChatGPT` / `extractCompetitorsFromPerplexity`. Bij ≥3 namen uit het blok worden de regex-fallback patterns overgeslagen. Snippet voor UI wordt gestript via `stripCompetitorBlock`.

Google AI Mode kan dit blok NIET afdwingen (we bellen niet de LLM, we bellen SerpAPI). Daar gebruikt extractie alleen de regex-patterns + `isValidCompetitorName` filter op tekst + `cleanCompetitorName` op source-titels.

### Google AI Overview NL-beperking
SerpAPI's AIO retrieval werkt structureel niet voor NL queries (`gl=nl/hl=nl` geeft wel een `ai_overview`-stub met `page_token`, maar de `engine=google_ai_overview`-call faalt 100% met "Google hasn't returned any results"). Bevestigd door SerpAPI docs: AIO is alleen voor `hl=en` + beperkte landen.

**Huidige workaround in `/api/scan-google-ai-overview`:**
- `gl=us, hl=en, google_domain=google.com` hardcoded (NIET via `lang`).
- Claude transform genereert EN search queries (`'en'` system prompt).
- **organic_results fallback**: bij `present_with_token` (AIO-stub zonder text_blocks) gebruiken we de `organic_results` als sources + voor company-mention detection. Status `aioStatus='present_with_token'` blijft, `hasAiResponse=false`, maar `companyMentioned=true` als de company in organic SERP staat.
- **Fragment fallback**: `aiOverviewText` wordt gevuld met top 3 organic snippets als AIO geen tekst gaf, zodat UI iets toont.
- SerpAPI params: `engine=google` ZONDER `no_cache` of `json_restrictor` (beide gaven 100% page_token-fail in tests).
- Follow-up: gebruik `aiOverview.serpapi_link` als primair, page_token-fallback. 20s timeout.

### Dashboard trend-window
`processGoogleAiResults` in `/api/dashboard` kiest als "vorige scan" de eerste die ≥12u eerder is dan de meest recente. Voorkomt dat trend-pijlen "stable" tonen bij meerdere rescans dezelfde dag.

## Dashboard state (DashboardClient.jsx)

- **Actief bedrijf wordt gepersist** in `localStorage['teun-ai:lastCompany']`. Bij page-load: lees uit localStorage. Bij elke `setSelectedCompany`: schrijf naar localStorage. Voorkomt dat de UI bij refresh terugvalt naar `uniqueCompanies[0]` (vaak het laatst toegevoegde, niet wat de gebruiker het meest bezoekt).
- **ScanInProgress poll** moet ALTIJD `company` param meegeven, anders haalt server data van een ander bedrijf op (historisch Hostnet-leak bij OnlineLabs view).
- **Layout overview-tab**: Row 1 = Speelveld + Per platform (gelijke hoogte `items-stretch`). Row 2 = Quick Wins + GEO USP-card (`items-start`, USP niet uitgerekt). Banner "Wat is je GEO score?" hoog op pagina wanneer `!geoAnalyseResults`.

## Claude API motor (de "motor")

[app/api/ai-visibility-analysis/route.js](app/api/ai-visibility-analysis/route.js) is de motor voor commerciële prompts. Sinds mei 2026 zijn de helpers (`scrapeWebsite`, `parseHtmlContent`, `analyzeWebsiteForKeywords`, `generatePromptsWithClaude`) verplaatst naar `lib/prompt-engine.js` (1:1 refactor, geen logica-wijziging). De motor importeert ze daar nu vandaan. **Logica van de motor niet zelf wijzigen tenzij Imre input geeft.** De Rank Tracker gebruikt een afgeleide subset via `lib/keyword-prompt-generator.js`. De Prompt Explorer (`/api/prompt-explorer`) gebruikt nu dezelfde motor-functies via de lib.

Motor-respons bevat `integrationId` (= row id van de zojuist aangemaakte `tool_integrations`-row), zodat frontend dat in sessionStorage kan opslaan voor selective claim na signup.

## Prompt Explorer architectuur (sinds mei 2026)

De Prompt Explorer is omgebouwd naar een **motor-driven funnel-instap**:

- **`/tools/ai-prompt-explorer`**: URL + bedrijfsnaam verplicht (geen keyword-mode meer, mode-toggle weg). Output: 10 commerciële AI zoekvragen met volumes via de motor.
- **`/api/prompt-explorer/route.js`** (NIEUW, niet beschermd): Pipeline `scrapeWebsite → analyzeWebsiteForKeywords → generatePromptsWithClaude → estimatePromptVolumes`, save in `prompt_discovery_results` met `source='prompt-explorer'` en `meta.engine='motor-v1'`. Returnt `discoveryId` voor sessionStorage-tracking.
- **`/api/prompt-discovery/route.js`** blijft bestaan voor de oude Prompt Discovery-tool, maar wordt vanuit Prompt Explorer niet meer aangeroepen. Nog steeds beschermd.

Funnel: Explorer toont 10 prompts → primaire CTA **"Start gratis AI Visibility Scan"** schrijft 10 prompts naar `sessionStorage['teun_custom_prompts']` + `router.push('/tools/ai-visibility?customPrompts=true&company=...&website=...&ref=prompt-explorer')` → Visibility-pagina detecteert customPrompts URL-flag, vult formData uit URL-params, leest prompts uit sessionStorage, springt naar step 3.

Secundaire CTA in Explorer: tekstlink naar Rank Tracker.

## Selective claim van anonieme scans (sinds mei 2026)

**Probleem dat we hebben opgelost:** `teun_session_token` cookie leeft 30 dagen en is gedeeld over alle anonieme gebruikers in dezelfde browser. Autoclaim met alleen-cookie-match liet test2's signup test1's eerdere anonieme scans onbedoeld claimen.

**Oplossing:** scan-id tracking via `sessionStorage['teun_my_scans']` (per browser-tab, niet gedeeld).

Format:
```js
{ integrationIds: ['uuid', ...], discoveryIds: ['uuid', ...] }
```

Flow:
1. Na elke scan (Explorer + Visibility) schrijft frontend de zojuist gemaakte `integrationId` / `discoveryId` naar sessionStorage.
2. Signup-pagina ([app/[locale]/signup/page.jsx](app/[locale]/signup/page.jsx)) leest sessionStorage en geeft `my_scan_ids` + `my_discovery_ids` mee in `user_metadata` (voor cross-browser fallback).
3. `/auth/confirm` doet GEEN claim meer (alleen email-verify + redirect).
4. Dashboard-load roept `/api/auth/claim-session` aan met body `{ scanIds, discoveryIds, sessionToken }` uit sessionStorage. Server merget met `user_metadata.my_scan_ids` / `my_discovery_ids`.
5. `claimSessionData` updateet alleen rows met `WHERE id IN (scanIds) AND session_token = cookie/fallback AND user_id IS NULL`.
6. Na succesvolle claim wordt sessionStorage gewist (voorkomt dubbele claims bij refresh).

**Cross-contamination is voorkomen** voor verschillende browser-sessies (verschillende tabs of incognito-vensters). Edge case "zelfde tab, twee mensen achter elkaar zonder logout" wordt niet 100% geblokt maar komt in productie niet voor.

**Backwards-compat:** als `scanIds` en `discoveryIds` beide leeg zijn valt `claimSessionData` terug naar legacy mode (alle rows met matching cookie). Dat kan in een edge-case cross-contaminatie opleveren (zie hierboven), dus alleen aanroepen vanuit het dashboard waar we expliciet de scan-ids meegeven.

## Funnel-werk status (open items, mei 2026)

**Klaar en live:**
- Stap A: Prompt Explorer motor-driven, mega-menu copy, "scan zonder zoekwoorden"-banner weg, back-nav-restore Visibility-resultaten, cross-sell weg uit Explorer (commit `87c1116`).
- Selective claim fix met sessionStorage scan-ids (commit `19e9c57`).

**Open (in volgorde):**
- **Stap B** (Visibility-pagina UX): pre-fill banner *"Dit zijn jouw 10 zoekvragen uit de Prompt Explorer"*, prompts bewerkbaar (edit + verwijder + toevoegen max 10), drielaagse fallback (sessionStorage → DB-fetch via nieuw `GET /api/prompt-discovery/latest` → foutbanner met alternatieve flow), tab-title dynamisch (`Scannen [bedrijf]...`), bedrijfsnaam in-page tijdens scan, `noKeywordsBanner` onderdrukken bij funnel-context. **`cancelCustom`-knop** in step 3 herzien (verwijderen of hernoemen).
- **Stap C**: Visibility resultatenpagina copy aanpassen *"Bewaar je scan en maak een gratis account aan..."* (geen Pro-pitch, geen herontwerp).
- **Stap D**: D1+D2 GEO optimalisatie DIY herpositioneren (Search Console + per-pagina advies + ChatGPT-prompt), D3 alle 8 Prompt Discovery-belofteplekken weghalen (mega-menu, schema, pricing-tabel, homepage tools-grid, /tools/-landing card, EN FAQ-referentie). Tool-page `/tools/ai-prompt-discovery` blijft live.
- **Firewall-fallback Prompt Explorer**: bij scrape-fail tonen we manuele keyword-input + motor zonder website-data ("Site niet bereikbaar — vul je belangrijkste keywords in").
- **Mini-fix Dashboard render**: wacht expliciet op claim+fetch voordat eerste render plaatsvindt (voorkomt stale state na signup).
- **Follow-up**: admin-bypass in claim-session voor `imre@onlinelabs.nl` / `hallo@onlinelabs.nl` (geen autoclaim voor admin-accounts).

## Admin

Admin emails: `imre@onlinelabs.nl`, `hallo@onlinelabs.nl`. Hard-coded check in meerdere routes (bypass voor rate limits, Pro features, etc.).

## Open items (paused)

- **`api_usage_log` tabel + admin kosten-dashboard widget** voor SerpAPI/ScraperAPI/Anthropic/OpenAI/Perplexity. Plan: MVP self-tracking + live SerpAPI/ScraperAPI balance via `/account.json`. Geparkeerd voor later.
- Legacy `tracked_keywords` hebben oude rule-based prompts. Pas bij keyword bewerken krijgen ze de Claude-versie. Optioneel: bulk-regenerate script wanneer Imre hier om vraagt.

## GEO Optimalisatie DIY (juni 2026 update)

De dashboard-wizard `/dashboard/geo-analyse` is omgedoopt en omgebouwd. Gebruikersgerichte naam overal: **GEO Optimalisatie DIY** (NL) / **GEO Optimization DIY** (EN). Let op: de dashboard-tab heet nog "GEO Optimalisatie" (de GEO-score-tab, ander ding dan de DIY-wizard).

- **Naamgeving**: i18n + componenten hernoemd van "GEO Analyse" naar "GEO Optimalisatie DIY". Bewust gelaten: "GEO Analyse Dashboard" (dashboard-product), de bredere AI-Visibility geoCta (569), changelog, code-comments en interne admin-keys (`scan.tool === 'GEO Analyse'`).
- **Toegang**: GEO DIY is **Lite + Pro** (niet Pro-only). Server-side gate op `/api/geo-scan-page` via `lib/geo-access.js` (`resolveGeoAccessTier`, `geoAccessAllowed`, `GEO_LITE_PROMPT_CAP=10`). Free/anoniem -> 403. Lite-promptcap (10) server-side afgedwongen in `/api/scan-google-ai` en `/api/scan-google-ai-overview` (alleen frontend-pad, tier `lite`; cron/anon ongemoeid). `ProGateWrapper` checkt alleen `subscription_status` (elke betaalde sub mag erin).
- **Inbedding**: wizard zit in de dashboard-shell via `app/[locale]/dashboard/DashboardSidebar.jsx` (dedicated, navy/slate; DashboardClient-sidebar was te verweven om te delen). Tabs zijn deep-linkbaar via `?tab=` (DashboardClient leest dat op mount).
- **Search Console**: periode = laatste **28 dagen** (`/api/search-console/queries`). Property-picker is doorzoekbaar met permissieniveau per property (geverifieerde bovenaan). 403 = account niet geverifieerd op die property-variant. Waarschuwing in stap 2 tegen oude/301-URLs (ScraperAPI volgt redirect niet -> score 0). Fouten worden nu zichtbaar getoond i.p.v. stil.
- **Scan-UX**: incrementeel opslaan per pagina (upsert in `geo_audit_results`), `beforeunload`-waarschuwing tijdens scan, en een globale `ScanProgressBanner.jsx` (localStorage `teun_geo_scan` + event `teun-geo-scan`) die door het hele dashboard meereist.
- **Koppelingen bewerkbaar**: in het rapport per pagina de gekoppelde prompt(s) volledig zichtbaar met verwijder-X (`removeReportMatch`).
- **GSC-sectie in de optimalisatie-prompt** (`lib/generateOptimizationPrompt.js`) is conditioneel: `instructionBody` is nu een functie `(hasGsc) =>`, kop "Search Console signalen" alleen bij echte queries.

### Perplexity-scan stabilisatie (af, juni 2026)
In `app/api/ai-visibility-analysis/route.js` (`analyzeWithPerplexity`): partial-output bij abort wordt gered en geparsed, 1 retry + timeout 32s, en de per-prompt resultaten krijgen `scan_status: 'completed' | 'failed'` (+ `failure_reason`). Oude rijen zonder veld = completed; oude omgevallen scans herkenbaar aan snippet "Analyse timeout". UI toont een omgevallen Perplexity-scan met een **"Opnieuw scannen"-knop** die 1 prompt herscant via `/api/geo-analyse/rescan-prompt` (niet-destructief gemerged, hergebruikt `lib/competitor-extract`).

### Concurrenten-extractie (OPEN, nog te doen: B0/B2/B3/A/B1/C)
Zie `concurrenten-extractie-bevindingen.md`. De motor heeft een eigen, zwakkere inline-kopie van de extractie naast de gedeelde `lib/competitor-extract.js`. Drie defecten: criteria als concurrent (blocklist i.p.v. positieve check; Perplexity-`addName` valideert niet), afkapping op haakjes (onbalans in cleanup), HTML/unicode-entiteiten niet gedecodeerd. Besloten richting: B0 strikte/gelijke `===BEDRIJVEN===`-blokinstructie + vuldwang weg, B2 centrale `decodeEntities`, B3 haakjes balanceren, A motor door de gedeelde lib, B1 semantische extractie via Claude Haiku 4.5 (lege lijst geldig), C herscan bestaande data. Model-noot: ChatGPT-scan draait op `gpt-5-search-api` (niet `gpt-4o-search-preview`).

## Bevestig dat je dit hebt gelezen en wacht op mijn eerste taak.
