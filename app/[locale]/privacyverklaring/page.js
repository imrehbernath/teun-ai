/* eslint-disable react/no-unescaped-entities */
import { getTranslations, getLocale } from 'next-intl/server';

export async function generateMetadata() {
  const locale = await getLocale();
  const isEn = locale === 'en';

  const title = isEn
    ? 'Privacy Policy - GEO Tool for AI Visibility'
    : 'Privacyverklaring - GEO Tool voor AI Zichtbaarheid';
  const description = isEn
    ? 'Privacy policy of Teun.ai, the GEO tool for AI visibility. Learn how we protect your data and what your rights are.'
    : 'Privacy policy van Teun.ai, dé GEO tool voor AI zichtbaarheid. Lees hoe we je data beschermen en welke rechten je hebt.';
  const url = isEn ? 'https://teun.ai/en/privacy' : 'https://teun.ai/privacyverklaring';

  return {
    title,
    description,
    openGraph: {
      title: `${title} | Teun.ai`,
      description,
      url,
      siteName: 'Teun.ai',
      locale: isEn ? 'en_GB' : 'nl_NL',
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title: `${title} | Teun.ai`,
      description,
    },
    robots: { index: true, follow: true },
    alternates: {
      canonical: url,
      languages: {
        nl: 'https://teun.ai/privacyverklaring',
        en: 'https://teun.ai/en/privacy',
      },
    },
  };
}

// ============================================
// NL CONTENT
// ============================================
function PrivacyNL() {
  return (
    <>
      <header className="mb-12">
        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-[#1A7DFF] to-[#6C3FF2] bg-clip-text text-transparent">
          Privacyverklaring
        </h1>
        <p className="text-gray-600">Laatst bijgewerkt: 27 oktober 2025</p>
      </header>

      <article className="legal-content">
        <p>
          Teun.ai (onderdeel van OnlineLabs) respecteert je privacy en gaat zorgvuldig om met je persoonsgegevens.
          In deze privacyverklaring leggen we uit welke gegevens we verzamelen, waarom we dat doen en wat je rechten zijn.
        </p>

        <h2>1. Wie zijn wij?</h2>
        <p>
          <strong>OnlineLabs</strong><br />
          Herengracht 221<br />
          1016 BG Amsterdam<br />
          <br />
          <strong>KvK nummer:</strong> 34368510<br />
          <strong>E-mail:</strong> <a href="mailto:hallo@onlinelabs.nl">hallo@onlinelabs.nl</a><br />
          <strong>Telefoon:</strong> <a href="tel:+31208202022">020 820 20 22</a><br />
          <strong>Contactpersoon:</strong> Imre Bernáth
        </p>
        <p>
          Wij zijn verantwoordelijk voor de verwerking van persoonsgegevens zoals beschreven in deze privacyverklaring.
        </p>

        <h2>2. Welke gegevens verzamelen we?</h2>

        <h3>2.1 Contactformulieren &amp; Early Access Aanmeldingen</h3>
        <p>Wanneer je een formulier invult op onze website, verzamelen we:</p>
        <ul>
          <li>Naam</li>
          <li>E-mailadres</li>
          <li>Telefoonnummer (indien opgegeven)</li>
          <li>Bedrijfsnaam (indien opgegeven)</li>
          <li>Je bericht of vraag</li>
          <li>IP-adres (voor spam-detectie)</li>
          <li>Datum en tijd van het verzoek</li>
        </ul>
        <p><strong>Doel:</strong> Om contact met je op te nemen en je vraag te beantwoorden.</p>

        <h3>2.2 Online Scans &amp; Tests</h3>
        <p>Wanneer je een online scan of test invult, verzamelen we:</p>
        <ul>
          <li>De antwoorden die je geeft in de scan</li>
          <li>Je e-mailadres (indien je resultaten wilt ontvangen)</li>
          <li>Datum en tijd van de scan</li>
        </ul>
        <p><strong>Doel:</strong> Om je de resultaten van de scan te kunnen tonen en te e-mailen.</p>

        <h3>2.3 Website Analytics (Google Analytics)</h3>
        <p>We gebruiken Google Analytics om te begrijpen hoe bezoekers onze website gebruiken. We verzamelen:</p>
        <ul>
          <li>Pagina&apos;s die je bezoekt</li>
          <li>Hoe lang je op pagina&apos;s blijft</li>
          <li>Hoe je op onze site bent gekomen (bijvoorbeeld via Google)</li>
          <li>Anonieme locatiedata (land/stad niveau)</li>
          <li>Type apparaat en browser</li>
          <li>Geanonimiseerd IP-adres (laatste cijfers worden verwijderd)</li>
        </ul>
        <p>
          <strong>Doel:</strong> Om onze website te verbeteren en te begrijpen welke content het meest waardevol is.<br />
          <strong>Bewaartermijn:</strong> 14 maanden<br />
          <strong>Opt-out:</strong> Je kunt analytische cookies weigeren via onze cookie banner.
        </p>

        <h3>2.4 Chrome Extension Scans</h3>
        <p>Wanneer je onze Chrome extensie gebruikt, verzamelen we:</p>
        <ul>
          <li>ChatGPT scan resultaten (welke prompts jouw bedrijf noemen)</li>
          <li>Positie van vermeldingen in ChatGPT antwoorden</li>
          <li>Text snippets van relevante antwoorden</li>
          <li>Timestamp en gebruikers-ID van de scan</li>
          <li>Je inloggegevens (Supabase authenticatie token - alleen lokaal opgeslagen)</li>
        </ul>
        <p>
          <strong>Doel:</strong> Om jouw AI visibility te meten en te tonen in je dashboard.<br />
          <strong>Bewaartermijn:</strong> Onbeperkt (tenzij je verwijdering aanvraagt)<br />
          <strong>Lokale opslag:</strong> Login tokens worden alleen op jouw computer opgeslagen, niet op onze servers.
        </p>

        <h2>3. Bewaartermijnen</h2>
        <p>We bewaren je gegevens niet langer dan nodig:</p>

        <table>
          <thead>
            <tr>
              <th>Type gegevens</th>
              <th>Bewaartermijn</th>
              <th>Reden</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Contactformulier</td><td>Max. 2 jaar</td><td>Voor follow-up en mogelijke samenwerking</td></tr>
            <tr><td>Early Access aanmelding</td><td>Tot product launch + 6 maanden</td><td>Om je op de hoogte te houden</td></tr>
            <tr><td>Online scan resultaten</td><td>Max. 1 jaar</td><td>Voor je eigen referentie</td></tr>
            <tr><td>Chrome extensie scans</td><td>Onbeperkt</td><td>Voor historische data &amp; trends (verwijderbaar op aanvraag)</td></tr>
            <tr><td>Offerteaanvragen</td><td>Max. 2 jaar</td><td>Voor zakelijke administratie</td></tr>
            <tr><td>E-mail correspondentie</td><td>Max. 4 jaar</td><td>Voor zakelijke administratie</td></tr>
            <tr><td>Klantgegevens</td><td>7 jaar</td><td>Wettelijke verplichting (belastingdienst)</td></tr>
            <tr><td>Website analytics</td><td>14 maanden</td><td>Google Analytics standaard</td></tr>
          </tbody>
        </table>

        <h2>4. Met wie delen we je gegevens?</h2>
        <p>We delen je gegevens alleen met:</p>

        <h3>4.1 Google Analytics</h3>
        <p>
          Voor website statistieken. Google verwerkt deze data in overeenstemming met hun Privacy Policy.
          We hebben een verwerkersovereenkomst met Google en IP-anonimisering staat aan.
        </p>

        <h3>4.2 Hostingpartner</h3>
        <p>
          Onze website wordt gehost op betrouwbare servers. De hostingpartner heeft toegang tot serverdata
          maar verwerkt geen persoonsgegevens actief.
        </p>

        <h3>4.3 OpenAI (ChatGPT)</h3>
        <p>De Chrome extensie communiceert met ChatGPT.com om prompts te testen. We delen:</p>
        <ul className="list-check">
          <li>De commercial prompts die je wilt testen</li>
          <li><strong>GEEN</strong> persoonlijke gegevens</li>
          <li><strong>GEEN</strong> andere ChatGPT gesprekken</li>
        </ul>
        <p>
          Deze communicatie gebeurt via je eigen browser en ChatGPT account. We hebben geen toegang tot je ChatGPT gesprekken.
        </p>

        <p><strong>We delen je gegevens NIET met:</strong></p>
        <ul className="list-cross">
          <li>Advertentienetwerken</li>
          <li>Social media platforms (tenzij jij dat zelf doet)</li>
          <li>Datamakelaars of andere derde partijen</li>
        </ul>

        <h2>5. Beveiliging</h2>
        <p>We nemen passende maatregelen om je gegevens te beschermen:</p>
        <ul className="list-check">
          <li><strong>SSL/TLS versleuteling</strong> - Al het verkeer naar onze website is versleuteld (HTTPS)</li>
          <li><strong>Beveiligde opslag</strong> - Formulierdata wordt veilig opgeslagen</li>
          <li><strong>Toegangscontrole</strong> - Alleen geautoriseerd personeel heeft toegang</li>
          <li><strong>Regular updates</strong> - We houden onze systemen up-to-date</li>
          <li><strong>Spam detectie</strong> - We gebruiken IP-adressen om spam te voorkomen</li>
          <li><strong>Lokale token opslag</strong> - Chrome extensie login tokens worden alleen op jouw computer bewaard</li>
        </ul>

        <h2>6. Cookies &amp; Tracking</h2>
        <p>Deze website gebruikt alleen functionele en analytische cookies.</p>

        <h3>6.1 Functionele cookies (altijd actief)</h3>
        <p>Deze cookies zijn noodzakelijk voor de werking van de website:</p>
        <ul>
          <li><strong>Cookiebot consent</strong> - Onthoudt je cookie voorkeuren (1 jaar)</li>
        </ul>

        <h3>6.2 Analytische cookies (optioneel - vereist toestemming)</h3>
        <ul>
          <li><strong>Google Analytics</strong> - Meet websitegebruik (14 maanden)</li>
          <li><strong>_ga</strong> - Onderscheidt gebruikers (2 jaar)</li>
          <li><strong>_ga_*</strong> - Houdt sessie status bij (2 jaar)</li>
          <li><strong>_gid</strong> - Onderscheidt gebruikers (24 uur)</li>
        </ul>

        <p><strong>IP-anonimisering:</strong> We hebben IP-anonimisering geactiveerd, waardoor je volledige IP-adres niet wordt opgeslagen.</p>
        <p><strong>Geen marketing cookies</strong> - We plaatsen geen tracking cookies voor advertenties of retargeting.</p>

        <p><strong>Je kunt cookies beheren via:</strong></p>
        <ul>
          <li>Onze cookie banner bij je eerste bezoek</li>
          <li>Je browser instellingen</li>
          <li><a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer">Google Analytics Opt-out Browser Add-on</a></li>
        </ul>

        <h2>7. Jouw rechten</h2>
        <p>Volgens de AVG (Algemene Verordening Gegevensbescherming) heb je de volgende rechten:</p>

        <ol>
          <li><strong>Recht op inzage</strong><br />Je mag weten welke gegevens we van je hebben</li>
          <li><strong>Recht op correctie</strong><br />Je mag onjuiste gegevens laten corrigeren</li>
          <li><strong>Recht op verwijdering</strong><br />Je mag vragen je gegevens te verwijderen</li>
          <li><strong>Recht op dataportabiliteit</strong><br />Je mag je gegevens in een leesbaar formaat ontvangen</li>
          <li><strong>Recht op bezwaar</strong><br />Je mag bezwaar maken tegen bepaalde verwerkingen</li>
          <li><strong>Recht op beperking</strong><br />Je mag vragen de verwerking te beperken</li>
        </ol>

        <p><strong>Een verzoek indienen?</strong></p>
        <p>
          <strong>E-mail:</strong> <a href="mailto:hallo@onlinelabs.nl">hallo@onlinelabs.nl</a><br />
          <strong>Telefoon:</strong> <a href="tel:+31208202022">020 820 20 22</a><br />
          <strong>Contactpersoon:</strong> Imre Bernáth
        </p>
        <p>We reageren binnen 1 maand op je verzoek.</p>

        <h2>8. Klachten</h2>
        <p>
          Ben je niet tevreden over hoe we met je gegevens omgaan? Je hebt het recht een klacht in te dienen bij de toezichthouder:
        </p>
        <p>
          <strong>Autoriteit Persoonsgegevens</strong><br />
          Postbus 93374<br />
          2509 AJ Den Haag<br />
          <strong>Telefoon:</strong> <a href="tel:+31708888500">(+31) - (0)70 - 888 85 00</a><br />
          <strong>Website:</strong> <a href="https://autoriteitpersoonsgegevens.nl" target="_blank" rel="noopener noreferrer">autoriteitpersoonsgegevens.nl</a>
        </p>
        <p>We horen het natuurlijk liever eerst rechtstreeks van je, zodat we samen naar een oplossing kunnen zoeken.</p>

        <h2>9. Wijzigingen in deze privacyverklaring</h2>
        <p>
          We kunnen deze privacyverklaring aanpassen wanneer dit nodig is. De meest recente versie vind je altijd op deze pagina.
          Bij belangrijke wijzigingen informeren we je via e-mail (als we je e-mailadres hebben).
        </p>
        <p><strong>Laatst bijgewerkt:</strong> 27 oktober 2025</p>

        <h2>10. Vragen?</h2>
        <p>Heb je vragen over deze privacyverklaring of over hoe we met je gegevens omgaan?</p>
        <p>
          <strong>E-mail:</strong> <a href="mailto:hallo@onlinelabs.nl">hallo@onlinelabs.nl</a><br />
          <strong>Telefoon:</strong> <a href="tel:+31208202022">020 820 20 22</a><br />
          <strong>Website:</strong> <a href="https://teun.ai">teun.ai</a><br />
          <strong>Contactpersoon:</strong> Imre Bernáth
        </p>
        <p>We helpen je graag verder!</p>

        <h2>11. Chrome Extension - ChatGPT Visibility Scanner</h2>
        <p>Onze Chrome extensie helpt je om jouw AI visibility in ChatGPT te meten.</p>

        <h3>11.1 Welke gegevens verzamelt de extensie?</h3>

        <p><strong>Lokale opslag (alleen op jouw computer):</strong></p>
        <ul>
          <li>Je inloggegevens (Supabase authenticatie token)</li>
          <li>De commercial prompts die je wilt testen</li>
          <li>Tijdelijke scan resultaten</li>
        </ul>

        <p><strong>Naar onze servers verzonden:</strong></p>
        <ul>
          <li>ChatGPT scan resultaten (welke prompts jouw bedrijf vermelden)</li>
          <li>Positie van vermeldingen in ChatGPT antwoorden</li>
          <li>Text snippets van ChatGPT antwoorden</li>
          <li>Timestamp van scans</li>
        </ul>

        <p><strong>NIET verzameld:</strong></p>
        <ul className="list-cross">
          <li>Je ChatGPT gesprekken</li>
          <li>Persoonlijke ChatGPT data</li>
          <li>Andere websites die je bezoekt</li>
          <li>Toetsaanslagen of wachtwoorden</li>
        </ul>

        <h3>11.2 Permissions uitleg</h3>
        <p>De extensie vraagt de volgende Chrome permissions:</p>

        <table>
          <thead>
            <tr>
              <th>Permission</th>
              <th>Waarom nodig?</th>
              <th>Wat doen we ermee?</th>
            </tr>
          </thead>
          <tbody>
            <tr><td><code>storage</code></td><td>Om je login te onthouden</td><td>Lokale opslag van auth token</td></tr>
            <tr><td><code>activeTab</code></td><td>Om ChatGPT te lezen</td><td>Alleen wanneer je op &quot;Scan&quot; klikt</td></tr>
            <tr><td><code>tabs</code></td><td>Om ChatGPT pagina te openen</td><td>Alleen voor scan functionaliteit</td></tr>
            <tr><td><code>host_permissions</code></td><td>Toegang tot teun.ai en chatgpt.com</td><td>Communicatie met dashboard</td></tr>
          </tbody>
        </table>

        <h3>11.3 Hoe werkt de extensie?</h3>
        <ol>
          <li>Je logt in via onze website (teun.ai/dashboard)</li>
          <li>Extensie haalt jouw commercial prompts op van het dashboard</li>
          <li>Je klikt op &quot;Start Scan&quot; in de extensie</li>
          <li>Extensie opent ChatGPT en voert prompts uit</li>
          <li>Resultaten worden opgeslagen in je dashboard</li>
          <li>Je kunt resultaten bekijken op teun.ai/dashboard</li>
        </ol>

        <h3>11.4 Beveiliging</h3>
        <ul className="list-check">
          <li><strong>End-to-end versleuteling:</strong> Communicatie tussen extensie en dashboard is versleuteld (HTTPS)</li>
          <li><strong>Lokale opslag:</strong> Je login token wordt alleen lokaal opgeslagen, niet gedeeld</li>
          <li><strong>Geen tracking:</strong> We tracken niet wat je buiten de scan functie doet</li>
          <li><strong>Transparant:</strong> De extensie code is transparant en controleerbaar</li>
        </ul>

        <h3>11.5 Verwijderen van data</h3>
        <p>Je kunt je extensie data verwijderen door:</p>
        <ol>
          <li>De extensie te deïnstalleren via Chrome</li>
          <li>Je account te verwijderen op teun.ai/dashboard</li>
          <li>Een verzoek te sturen naar <a href="mailto:hallo@onlinelabs.nl">hallo@onlinelabs.nl</a></li>
        </ol>

        <h3>11.6 Updates</h3>
        <p>De extensie update automatisch via de Chrome Web Store. Bij grote wijzigingen informeren we je via:</p>
        <ul>
          <li>Update notificatie in de extensie</li>
          <li>E-mail (indien geregistreerd)</li>
          <li>Changelog op teun.ai/changelog (binnenkort)</li>
        </ul>

        <blockquote>
          <strong>Vragen over de extensie?</strong><br />
          E-mail: <a href="mailto:hallo@onlinelabs.nl">hallo@onlinelabs.nl</a><br />
          Telefoon: <a href="tel:+31208202022">020 820 20 22</a>
        </blockquote>

        <h2>Specifiek voor Early Access &amp; Online Scans</h2>

        <h3>Early Access Programma</h3>
        <p>Als je je aanmeldt voor early access:</p>
        <ul>
          <li>Gebruiken we je e-mail alleen om je op de hoogte te houden van de product launch</li>
          <li>Krijg je maximaal 1x per maand een update (geen spam)</li>
          <li>Kun je je op elk moment afmelden via de link in de e-mail</li>
          <li>Bewaren we je gegevens tot 6 maanden na de product launch</li>
          <li>Delen we je gegevens nooit met derden</li>
        </ul>

        <h3>Online Scans</h3>
        <p>Als je een online scan of test invult:</p>
        <ul>
          <li>Zijn de resultaten alleen voor jou zichtbaar</li>
          <li>Slaan we je antwoorden op voor max. 1 jaar</li>
          <li>Gebruiken we geanonimiseerde data om onze scans te verbeteren</li>
          <li>Kun je je resultaten per e-mail ontvangen (optioneel)</li>
          <li>Kun je verwijdering van je scan resultaten aanvragen</li>
        </ul>

        <blockquote>
          <strong>Nog vragen?</strong> Neem gerust contact op via{' '}
          <a href="mailto:hallo@onlinelabs.nl">hallo@onlinelabs.nl</a> of bel{' '}
          <a href="tel:+31208202022">020 820 20 22</a>
        </blockquote>
      </article>
    </>
  );
}

// ============================================
// EN CONTENT
// ============================================
function PrivacyEN() {
  return (
    <>
      <header className="mb-12">
        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-[#1A7DFF] to-[#6C3FF2] bg-clip-text text-transparent">
          Privacy Policy
        </h1>
        <p className="text-gray-600">Last updated: 27 October 2025</p>
      </header>

      <article className="legal-content">
        <p>
          Teun.ai (part of OnlineLabs) respects your privacy and handles your personal data with care.
          In this privacy policy, we explain what data we collect, why we do so and what your rights are.
        </p>

        <h2>1. Who are we?</h2>
        <p>
          <strong>OnlineLabs</strong><br />
          Herengracht 221<br />
          1016 BG Amsterdam, The Netherlands<br />
          <br />
          <strong>Chamber of Commerce:</strong> 34368510<br />
          <strong>Email:</strong> <a href="mailto:hallo@onlinelabs.nl">hallo@onlinelabs.nl</a><br />
          <strong>Phone:</strong> <a href="tel:+31208202022">+31 20 820 20 22</a><br />
          <strong>Contact person:</strong> Imre Bernáth
        </p>
        <p>
          We are responsible for the processing of personal data as described in this privacy policy.
        </p>

        <h2>2. What data do we collect?</h2>

        <h3>2.1 Contact forms &amp; Early Access sign-ups</h3>
        <p>When you fill out a form on our website, we collect:</p>
        <ul>
          <li>Name</li>
          <li>Email address</li>
          <li>Phone number (if provided)</li>
          <li>Company name (if provided)</li>
          <li>Your message or question</li>
          <li>IP address (for spam detection)</li>
          <li>Date and time of the request</li>
        </ul>
        <p><strong>Purpose:</strong> To contact you and answer your question.</p>

        <h3>2.2 Online Scans &amp; Tests</h3>
        <p>When you complete an online scan or test, we collect:</p>
        <ul>
          <li>The answers you provide in the scan</li>
          <li>Your email address (if you want to receive results)</li>
          <li>Date and time of the scan</li>
        </ul>
        <p><strong>Purpose:</strong> To show you the scan results and send them by email.</p>

        <h3>2.3 Website Analytics (Google Analytics)</h3>
        <p>We use Google Analytics to understand how visitors use our website. We collect:</p>
        <ul>
          <li>Pages you visit</li>
          <li>How long you stay on pages</li>
          <li>How you found our site (e.g. via Google)</li>
          <li>Anonymous location data (country/city level)</li>
          <li>Device type and browser</li>
          <li>Anonymised IP address (last digits are removed)</li>
        </ul>
        <p>
          <strong>Purpose:</strong> To improve our website and understand which content is most valuable.<br />
          <strong>Retention:</strong> 14 months<br />
          <strong>Opt-out:</strong> You can refuse analytics cookies via our cookie banner.
        </p>

        <h3>2.4 Chrome Extension Scans</h3>
        <p>When you use our Chrome extension, we collect:</p>
        <ul>
          <li>ChatGPT scan results (which prompts mention your company)</li>
          <li>Position of mentions in ChatGPT responses</li>
          <li>Text snippets of relevant responses</li>
          <li>Timestamp and user ID of the scan</li>
          <li>Your login credentials (Supabase authentication token — stored locally only)</li>
        </ul>
        <p>
          <strong>Purpose:</strong> To measure and display your AI visibility in your dashboard.<br />
          <strong>Retention:</strong> Indefinite (unless you request deletion)<br />
          <strong>Local storage:</strong> Login tokens are stored only on your computer, not on our servers.
        </p>

        <h2>3. Retention periods</h2>
        <p>We do not retain your data longer than necessary:</p>

        <table>
          <thead>
            <tr>
              <th>Data type</th>
              <th>Retention period</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Contact form</td><td>Max. 2 years</td><td>For follow-up and potential collaboration</td></tr>
            <tr><td>Early Access sign-up</td><td>Until product launch + 6 months</td><td>To keep you informed</td></tr>
            <tr><td>Online scan results</td><td>Max. 1 year</td><td>For your own reference</td></tr>
            <tr><td>Chrome extension scans</td><td>Indefinite</td><td>For historical data &amp; trends (deletable on request)</td></tr>
            <tr><td>Quote requests</td><td>Max. 2 years</td><td>For business administration</td></tr>
            <tr><td>Email correspondence</td><td>Max. 4 years</td><td>For business administration</td></tr>
            <tr><td>Customer data</td><td>7 years</td><td>Legal obligation (tax authorities)</td></tr>
            <tr><td>Website analytics</td><td>14 months</td><td>Google Analytics default</td></tr>
          </tbody>
        </table>

        <h2>4. Who do we share your data with?</h2>
        <p>We only share your data with:</p>

        <h3>4.1 Google Analytics</h3>
        <p>
          For website statistics. Google processes this data in accordance with their Privacy Policy.
          We have a data processing agreement with Google and IP anonymisation is enabled.
        </p>

        <h3>4.2 Hosting partner</h3>
        <p>
          Our website is hosted on reliable servers. The hosting partner has access to server data
          but does not actively process personal data.
        </p>

        <h3>4.3 OpenAI (ChatGPT)</h3>
        <p>The Chrome extension communicates with ChatGPT.com to test prompts. We share:</p>
        <ul className="list-check">
          <li>The commercial prompts you want to test</li>
          <li><strong>NO</strong> personal data</li>
          <li><strong>NO</strong> other ChatGPT conversations</li>
        </ul>
        <p>
          This communication happens through your own browser and ChatGPT account. We have no access to your ChatGPT conversations.
        </p>

        <p><strong>We do NOT share your data with:</strong></p>
        <ul className="list-cross">
          <li>Advertising networks</li>
          <li>Social media platforms (unless you do so yourself)</li>
          <li>Data brokers or other third parties</li>
        </ul>

        <h2>5. Security</h2>
        <p>We take appropriate measures to protect your data:</p>
        <ul className="list-check">
          <li><strong>SSL/TLS encryption</strong> — All traffic to our website is encrypted (HTTPS)</li>
          <li><strong>Secure storage</strong> — Form data is stored securely</li>
          <li><strong>Access control</strong> — Only authorised personnel have access</li>
          <li><strong>Regular updates</strong> — We keep our systems up to date</li>
          <li><strong>Spam detection</strong> — We use IP addresses to prevent spam</li>
          <li><strong>Local token storage</strong> — Chrome extension login tokens are stored on your computer only</li>
        </ul>

        <h2>6. Cookies &amp; Tracking</h2>
        <p>This website uses only functional and analytical cookies.</p>

        <h3>6.1 Functional cookies (always active)</h3>
        <p>These cookies are necessary for the website to function:</p>
        <ul>
          <li><strong>Cookiebot consent</strong> — Remembers your cookie preferences (1 year)</li>
        </ul>

        <h3>6.2 Analytical cookies (optional — requires consent)</h3>
        <ul>
          <li><strong>Google Analytics</strong> — Measures website usage (14 months)</li>
          <li><strong>_ga</strong> — Distinguishes users (2 years)</li>
          <li><strong>_ga_*</strong> — Maintains session state (2 years)</li>
          <li><strong>_gid</strong> — Distinguishes users (24 hours)</li>
        </ul>

        <p><strong>IP anonymisation:</strong> We have activated IP anonymisation, so your full IP address is not stored.</p>
        <p><strong>No marketing cookies</strong> — We do not place tracking cookies for advertising or retargeting.</p>

        <p><strong>You can manage cookies via:</strong></p>
        <ul>
          <li>Our cookie banner on your first visit</li>
          <li>Your browser settings</li>
          <li><a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer">Google Analytics Opt-out Browser Add-on</a></li>
        </ul>

        <h2>7. Your rights</h2>
        <p>Under the GDPR (General Data Protection Regulation) you have the following rights:</p>

        <ol>
          <li><strong>Right of access</strong><br />You may request to see what data we hold about you</li>
          <li><strong>Right to rectification</strong><br />You may have inaccurate data corrected</li>
          <li><strong>Right to erasure</strong><br />You may request deletion of your data</li>
          <li><strong>Right to data portability</strong><br />You may receive your data in a readable format</li>
          <li><strong>Right to object</strong><br />You may object to certain processing</li>
          <li><strong>Right to restriction</strong><br />You may request that processing be restricted</li>
        </ol>

        <p><strong>Submit a request?</strong></p>
        <p>
          <strong>Email:</strong> <a href="mailto:hallo@onlinelabs.nl">hallo@onlinelabs.nl</a><br />
          <strong>Phone:</strong> <a href="tel:+31208202022">+31 20 820 20 22</a><br />
          <strong>Contact person:</strong> Imre Bernáth
        </p>
        <p>We will respond to your request within 1 month.</p>

        <h2>8. Complaints</h2>
        <p>
          Not satisfied with how we handle your data? You have the right to file a complaint with the supervisory authority:
        </p>
        <p>
          <strong>Autoriteit Persoonsgegevens</strong> (Dutch Data Protection Authority)<br />
          PO Box 93374<br />
          2509 AJ The Hague, The Netherlands<br />
          <strong>Phone:</strong> <a href="tel:+31708888500">+31 70 888 85 00</a><br />
          <strong>Website:</strong> <a href="https://autoriteitpersoonsgegevens.nl" target="_blank" rel="noopener noreferrer">autoriteitpersoonsgegevens.nl</a>
        </p>
        <p>We would of course prefer to hear from you directly first, so we can find a solution together.</p>

        <h2>9. Changes to this privacy policy</h2>
        <p>
          We may update this privacy policy when necessary. The most recent version is always available on this page.
          For significant changes, we will notify you by email (if we have your email address).
        </p>
        <p><strong>Last updated:</strong> 27 October 2025</p>

        <h2>10. Questions?</h2>
        <p>Do you have questions about this privacy policy or how we handle your data?</p>
        <p>
          <strong>Email:</strong> <a href="mailto:hallo@onlinelabs.nl">hallo@onlinelabs.nl</a><br />
          <strong>Phone:</strong> <a href="tel:+31208202022">+31 20 820 20 22</a><br />
          <strong>Website:</strong> <a href="https://teun.ai">teun.ai</a><br />
          <strong>Contact person:</strong> Imre Bernáth
        </p>
        <p>We are happy to help!</p>

        <h2>11. Chrome Extension — ChatGPT Visibility Scanner</h2>
        <p>Our Chrome extension helps you measure your AI visibility in ChatGPT.</p>

        <h3>11.1 What data does the extension collect?</h3>

        <p><strong>Local storage (on your computer only):</strong></p>
        <ul>
          <li>Your login credentials (Supabase authentication token)</li>
          <li>The commercial prompts you want to test</li>
          <li>Temporary scan results</li>
        </ul>

        <p><strong>Sent to our servers:</strong></p>
        <ul>
          <li>ChatGPT scan results (which prompts mention your company)</li>
          <li>Position of mentions in ChatGPT responses</li>
          <li>Text snippets of ChatGPT responses</li>
          <li>Timestamp of scans</li>
        </ul>

        <p><strong>NOT collected:</strong></p>
        <ul className="list-cross">
          <li>Your ChatGPT conversations</li>
          <li>Personal ChatGPT data</li>
          <li>Other websites you visit</li>
          <li>Keystrokes or passwords</li>
        </ul>

        <h3>11.2 Permissions explained</h3>
        <p>The extension requests the following Chrome permissions:</p>

        <table>
          <thead>
            <tr>
              <th>Permission</th>
              <th>Why needed?</th>
              <th>What do we do with it?</th>
            </tr>
          </thead>
          <tbody>
            <tr><td><code>storage</code></td><td>To remember your login</td><td>Local storage of auth token</td></tr>
            <tr><td><code>activeTab</code></td><td>To read ChatGPT</td><td>Only when you click &quot;Scan&quot;</td></tr>
            <tr><td><code>tabs</code></td><td>To open ChatGPT page</td><td>Only for scan functionality</td></tr>
            <tr><td><code>host_permissions</code></td><td>Access to teun.ai and chatgpt.com</td><td>Communication with dashboard</td></tr>
          </tbody>
        </table>

        <h3>11.3 How does the extension work?</h3>
        <ol>
          <li>You log in via our website (teun.ai/dashboard)</li>
          <li>The extension retrieves your commercial prompts from the dashboard</li>
          <li>You click &quot;Start Scan&quot; in the extension</li>
          <li>The extension opens ChatGPT and runs the prompts</li>
          <li>Results are saved in your dashboard</li>
          <li>You can view results at teun.ai/dashboard</li>
        </ol>

        <h3>11.4 Security</h3>
        <ul className="list-check">
          <li><strong>End-to-end encryption:</strong> Communication between extension and dashboard is encrypted (HTTPS)</li>
          <li><strong>Local storage:</strong> Your login token is stored locally only, not shared</li>
          <li><strong>No tracking:</strong> We do not track what you do outside the scan function</li>
          <li><strong>Transparent:</strong> The extension code is transparent and auditable</li>
        </ul>

        <h3>11.5 Deleting data</h3>
        <p>You can delete your extension data by:</p>
        <ol>
          <li>Uninstalling the extension via Chrome</li>
          <li>Deleting your account at teun.ai/dashboard</li>
          <li>Sending a request to <a href="mailto:hallo@onlinelabs.nl">hallo@onlinelabs.nl</a></li>
        </ol>

        <h3>11.6 Updates</h3>
        <p>The extension updates automatically via the Chrome Web Store. For major changes we will notify you via:</p>
        <ul>
          <li>Update notification in the extension</li>
          <li>Email (if registered)</li>
          <li>Changelog at teun.ai/changelog (coming soon)</li>
        </ul>

        <blockquote>
          <strong>Questions about the extension?</strong><br />
          Email: <a href="mailto:hallo@onlinelabs.nl">hallo@onlinelabs.nl</a><br />
          Phone: <a href="tel:+31208202022">+31 20 820 20 22</a>
        </blockquote>

        <h2>Specifically for Early Access &amp; Online Scans</h2>

        <h3>Early Access Programme</h3>
        <p>If you sign up for early access:</p>
        <ul>
          <li>We use your email only to keep you informed about the product launch</li>
          <li>You will receive a maximum of 1 update per month (no spam)</li>
          <li>You can unsubscribe at any time via the link in the email</li>
          <li>We retain your data until 6 months after product launch</li>
          <li>We never share your data with third parties</li>
        </ul>

        <h3>Online Scans</h3>
        <p>If you complete an online scan or test:</p>
        <ul>
          <li>The results are only visible to you</li>
          <li>We store your answers for a maximum of 1 year</li>
          <li>We use anonymised data to improve our scans</li>
          <li>You can receive your results by email (optional)</li>
          <li>You can request deletion of your scan results</li>
        </ul>

        <blockquote>
          <strong>More questions?</strong> Feel free to contact us at{' '}
          <a href="mailto:hallo@onlinelabs.nl">hallo@onlinelabs.nl</a> or call{' '}
          <a href="tel:+31208202022">+31 20 820 20 22</a>
        </blockquote>
      </article>
    </>
  );
}

// ============================================
// MAIN PAGE
// ============================================
export default async function PrivacyPolicyPage() {
  const locale = await getLocale();

  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl">
      {locale === 'en' ? <PrivacyEN /> : <PrivacyNL />}

      {/* Scoped styles for legal content — replaces the broken CSS module */}
      <style>{`
        .legal-content h2 {
          font-size: 1.5rem;
          font-weight: 700;
          margin-top: 2.5rem;
          margin-bottom: 1rem;
          color: #1e293b;
          padding-bottom: 0.5rem;
          border-bottom: 2px solid #e2e8f0;
        }
        .legal-content h3 {
          font-size: 1.2rem;
          font-weight: 600;
          margin-top: 1.75rem;
          margin-bottom: 0.75rem;
          color: #334155;
        }
        .legal-content p {
          margin-bottom: 1rem;
          line-height: 1.7;
          color: #475569;
        }
        .legal-content a {
          color: #1A7DFF;
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        .legal-content a:hover {
          color: #6C3FF2;
        }
        .legal-content ul,
        .legal-content ol {
          margin-bottom: 1rem;
          padding-left: 1.5rem;
        }
        .legal-content ul {
          list-style-type: disc;
        }
        .legal-content ol {
          list-style-type: decimal;
        }
        .legal-content li {
          margin-bottom: 0.5rem;
          line-height: 1.6;
          color: #475569;
        }
        .legal-content ul.list-check {
          list-style: none;
          padding-left: 0;
        }
        .legal-content ul.list-check li::before {
          content: "✅ ";
        }
        .legal-content ul.list-cross {
          list-style: none;
          padding-left: 0;
        }
        .legal-content ul.list-cross li::before {
          content: "❌ ";
        }
        .legal-content table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 1.5rem;
          font-size: 0.9rem;
        }
        .legal-content th {
          background: #f1f5f9;
          padding: 0.75rem 1rem;
          text-align: left;
          font-weight: 600;
          color: #1e293b;
          border-bottom: 2px solid #e2e8f0;
        }
        .legal-content td {
          padding: 0.75rem 1rem;
          border-bottom: 1px solid #e2e8f0;
          color: #475569;
        }
        .legal-content code {
          background: #f1f5f9;
          padding: 0.15rem 0.4rem;
          border-radius: 0.25rem;
          font-size: 0.85em;
          color: #6C3FF2;
        }
        .legal-content blockquote {
          margin: 1.5rem 0;
          padding: 1.25rem 1.5rem;
          background: linear-gradient(135deg, #f0f4ff 0%, #f5f0ff 100%);
          border-left: 4px solid #6C3FF2;
          border-radius: 0 0.75rem 0.75rem 0;
          color: #334155;
        }
        .legal-content blockquote a {
          color: #6C3FF2;
        }
        .legal-content strong {
          color: #1e293b;
        }
      `}</style>
    </div>
  );
}
