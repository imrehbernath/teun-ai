/* eslint-disable react/no-unescaped-entities */
import styles from '@/styles/legal-page.module.css';

export const metadata = {
  title: 'Privacyverklaring - GEO Tool voor AI Zichtbaarheid',
  description: 'Privacy policy van Teun.ai, dé GEO tool voor AI zichtbaarheid. Lees hoe we je data beschermen en welke rechten je hebt.',
  openGraph: {
    title: 'Privacyverklaring - GEO Tool voor AI Zichtbaarheid | Teun.ai',
    description: 'Privacy policy van Teun.ai, dé GEO tool voor AI zichtbaarheid. Lees hoe we je data beschermen en welke rechten je hebt.',
    url: 'https://teun.ai/privacyverklaring',
    siteName: 'Teun.ai',
    locale: 'nl_NL',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Privacyverklaring - GEO Tool voor AI Zichtbaarheid | Teun.ai',
    description: 'Privacy policy van Teun.ai, dé GEO tool voor AI zichtbaarheid. Lees hoe we je data beschermen en welke rechten je hebt.',
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: 'https://teun.ai/privacyverklaring',
  },
};

export default function PrivacyPolicyPage() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl">
      <header className="mb-12">
        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-[#1A7DFF] to-[#6C3FF2] bg-clip-text text-transparent">
          Privacyverklaring
        </h1>
        <p className="text-gray-600">
          Laatst bijgewerkt: 27 oktober 2025
        </p>
      </header>

      <article className={styles.legalContent}>
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

        <h3>2.1 Contactformulieren & Early Access Aanmeldingen</h3>
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

        <h3>2.2 Online Scans & Tests</h3>
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
            <tr>
              <td>Contactformulier</td>
              <td>Max. 2 jaar</td>
              <td>Voor follow-up en mogelijke samenwerking</td>
            </tr>
            <tr>
              <td>Early Access aanmelding</td>
              <td>Tot product launch + 6 maanden</td>
              <td>Om je op de hoogte te houden</td>
            </tr>
            <tr>
              <td>Online scan resultaten</td>
              <td>Max. 1 jaar</td>
              <td>Voor je eigen referentie</td>
            </tr>
            <tr>
              <td>Chrome extensie scans</td>
              <td>Onbeperkt</td>
              <td>Voor historische data & trends (verwijderbaar op aanvraag)</td>
            </tr>
            <tr>
              <td>Offerteaanvragen</td>
              <td>Max. 2 jaar</td>
              <td>Voor zakelijke administratie</td>
            </tr>
            <tr>
              <td>E-mail correspondentie</td>
              <td>Max. 4 jaar</td>
              <td>Voor zakelijke administratie</td>
            </tr>
            <tr>
              <td>Klantgegevens</td>
              <td>7 jaar</td>
              <td>Wettelijke verplichting (belastingdienst)</td>
            </tr>
            <tr>
              <td>Website analytics</td>
              <td>14 maanden</td>
              <td>Google Analytics standaard</td>
            </tr>
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
        <p>
          De Chrome extensie communiceert met ChatGPT.com om prompts te testen. We delen:
        </p>
        <ul className="checklist">
          <li>De commercial prompts die je wilt testen</li>
          <li><strong>GEEN</strong> persoonlijke gegevens</li>
          <li><strong>GEEN</strong> andere ChatGPT gesprekken</li>
        </ul>
        <p>
          Deze communicatie gebeurt via je eigen browser en ChatGPT account. We hebben geen toegang tot je ChatGPT gesprekken.
        </p>

        <p><strong>We delen je gegevens NIET met:</strong></p>
        <ul className="fail">
          <li>Advertentienetwerken</li>
          <li>Social media platforms (tenzij jij dat zelf doet)</li>
          <li>Datamakelaars of andere derde partijen</li>
        </ul>

        <h2>5. Beveiliging</h2>
        <p>We nemen passende maatregelen om je gegevens te beschermen:</p>
        <ul className="checklist">
          <li><strong>SSL/TLS versleuteling</strong> - Al het verkeer naar onze website is versleuteld (HTTPS)</li>
          <li><strong>Beveiligde opslag</strong> - Formulierdata wordt veilig opgeslagen</li>
          <li><strong>Toegangscontrole</strong> - Alleen geautoriseerd personeel heeft toegang</li>
          <li><strong>Regular updates</strong> - We houden onze systemen up-to-date</li>
          <li><strong>Spam detectie</strong> - We gebruiken IP-adressen om spam te voorkomen</li>
          <li><strong>Lokale token opslag</strong> - Chrome extensie login tokens worden alleen op jouw computer bewaard</li>
        </ul>

        <h2>6. Cookies & Tracking</h2>
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

        <p>
          <strong>IP-anonimisering:</strong> We hebben IP-anonimisering geactiveerd, waardoor je volledige IP-adres niet wordt opgeslagen.
        </p>

        <p>
          <strong>Geen marketing cookies</strong> - We plaatsen geen tracking cookies voor advertenties of retargeting.
        </p>

        <p><strong>Je kunt cookies beheren via:</strong></p>
        <ul>
          <li>Onze cookie banner bij je eerste bezoek</li>
          <li>Je browser instellingen</li>
          <li><a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer">Google Analytics Opt-out Browser Add-on</a></li>
        </ul>

        <h2>7. Jouw rechten</h2>
        <p>Volgens de AVG (Algemene Verordening Gegevensbescherming) heb je de volgende rechten:</p>

        <ol className="emojiOnly">
          <li>
            <strong>Recht op inzage</strong><br />
            Je mag weten welke gegevens we van je hebben
          </li>
          <li>
            <strong>Recht op correctie</strong><br />
            Je mag onjuiste gegevens laten corrigeren
          </li>
          <li>
            <strong>Recht op verwijdering</strong><br />
            Je mag vragen je gegevens te verwijderen
          </li>
          <li>
            <strong>Recht op dataportabiliteit</strong><br />
            Je mag je gegevens in een leesbaar formaat ontvangen
          </li>
          <li>
            <strong>Recht op bezwaar</strong><br />
            Je mag bezwaar maken tegen bepaalde verwerkingen
          </li>
          <li>
            <strong>Recht op beperking</strong><br />
            Je mag vragen de verwerking te beperken
          </li>
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
        <p>
          We horen het natuurlijk liever eerst rechtstreeks van je, zodat we samen naar een oplossing kunnen zoeken.
        </p>

        <h2>9. Wijzigingen in deze privacyverklaring</h2>
        <p>
          We kunnen deze privacyverklaring aanpassen wanneer dit nodig is. De meest recente versie vind je altijd op deze pagina. 
          Bij belangrijke wijzigingen informeren we je via e-mail (als we je e-mailadres hebben).
        </p>
        <p><strong>Laatst bijgewerkt:</strong> 27 oktober 2025</p>

        <h2>10. Vragen?</h2>
        <p>Heb je vragen over deze privacyverklaring of over hoe we met je gegevens omgaan?</p>
        <p>
          <strong>📧 E-mail:</strong> <a href="mailto:hallo@onlinelabs.nl">hallo@onlinelabs.nl</a><br />
          <strong>📞 Telefoon:</strong> <a href="tel:+31208202022">020 820 20 22</a><br />
          <strong>🌐 Website:</strong> <a href="https://teun.ai">teun.ai</a><br />
          <strong>👤 Contactpersoon:</strong> Imre Bernáth
        </p>
        <p>We helpen je graag verder!</p>

        <h2>11. Chrome Extension - ChatGPT Visibility Scanner</h2>
        <p>
          Onze Chrome extensie helpt je om jouw AI visibility in ChatGPT te meten.
        </p>

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
        <ul className="fail">
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
            <tr>
              <td><code>storage</code></td>
              <td>Om je login te onthouden</td>
              <td>Lokale opslag van auth token</td>
            </tr>
            <tr>
              <td><code>activeTab</code></td>
              <td>Om ChatGPT te lezen</td>
              <td>Alleen wanneer je op &quot;Scan&quot; klikt</td>
            </tr>
            <tr>
              <td><code>tabs</code></td>
              <td>Om ChatGPT pagina te openen</td>
              <td>Alleen voor scan functionaliteit</td>
            </tr>
            <tr>
              <td><code>host_permissions</code></td>
              <td>Toegang tot teun.ai en chatgpt.com</td>
              <td>Communicatie met dashboard</td>
            </tr>
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
        <ul className="checklist">
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
        <p>
          De extensie update automatisch via de Chrome Web Store. Bij grote wijzigingen informeren we je via:
        </p>
        <ul>
          <li>Update notificatie in de extensie</li>
          <li>E-mail (indien geregistreerd)</li>
          <li>Changelog op teun.ai/changelog (binnenkort)</li>
        </ul>

        <blockquote>
          <strong>Vragen over de extensie?</strong><br />
          📧 E-mail: <a href="mailto:hallo@onlinelabs.nl">hallo@onlinelabs.nl</a><br />
          📞 Telefoon: <a href="tel:+31208202022">020 820 20 22</a>
        </blockquote>

        <h2>Specifiek voor Early Access & Online Scans</h2>

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
    </div>
  );
}