/* eslint-disable react/no-unescaped-entities */
import styles from '@/styles/legal-page.module.css';

export const metadata = {
  title: 'Privacyverklaring - Jouw gegevens beschermen | OnlineLabs',
  description: 'Lees hoe OnlineLabs jouw gegevens verwerkt en beschermt. Alles over cookies, beveiliging en jouw rechten op privacy overzichtelijk uitgelegd.',
  openGraph: {
    title: 'Privacyverklaring - Jouw gegevens beschermen | OnlineLabs',
    description: 'Lees hoe OnlineLabs jouw gegevens verwerkt en beschermt. Alles over cookies, beveiliging en jouw rechten op privacy overzichtelijk uitgelegd.',
    url: 'https://teun.ai/privacy-policy',
    siteName: 'Teun.ai',
    locale: 'nl_NL',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Privacyverklaring - Jouw gegevens beschermen | OnlineLabs',
    description: 'Lees hoe OnlineLabs jouw gegevens verwerkt en beschermt. Alles over cookies, beveiliging en jouw rechten op privacy overzichtelijk uitgelegd.',
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: 'https://teun.ai/privacy-policy',
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
          Laatst bijgewerkt: 17 oktober 2025
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
        <p><strong>Laatst bijgewerkt:</strong> 17 oktober 2025</p>

        <h2>10. Vragen?</h2>
        <p>Heb je vragen over deze privacyverklaring of over hoe we met je gegevens omgaan?</p>
        <p>
          <strong>📧 E-mail:</strong> <a href="mailto:hallo@onlinelabs.nl">hallo@onlinelabs.nl</a><br />
          <strong>📞 Telefoon:</strong> <a href="tel:+31208202022">020 820 20 22</a><br />
          <strong>🌐 Website:</strong> <a href="https://teun.ai">teun.ai</a><br />
          <strong>👤 Contactpersoon:</strong> Imre Bernáth
        </p>
        <p>We helpen je graag verder!</p>

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