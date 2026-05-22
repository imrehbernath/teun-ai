// lib/rank-scanner.js
// Shared scan helpers voor AI Rank Tracker (handmatig + cron).
// 1:1 extract uit app/api/tracked-keywords/route.js.

export function stripMarkdown(text) {
  if (!text) return '';
  return text.replace(/\\([-_*()\[\]{}.+!#|])/g,'$1').replace(/\[(\d+)\]/g,'').replace(/\[([^\]]+)\]\([^)]+\)/g,'$1').replace(/https?:\/\/[^\s)\]]+/g,'').replace(/\([^)]*utm_source[^)]*\)/g,'').replace(/^#{1,6}\s+/gm,'').replace(/\*{1,3}([^*]+)\*{1,3}/g,'$1').replace(/^>\s?/gm,'').replace(/`([^`]+)`/g,'$1').replace(/\(\s*\)/g,'').replace(/  +/g,' ').replace(/\n{3,}/g,'\n\n').trim();
}

// Strip spaces, punctuation en non-alfanumerieke chars zodat "Online Labs",
// "online-labs" en "OnlineLabs" allemaal naar "onlinelabs" normaliseren.
// "&", " en " en " and " worden equivalent behandeld zodat "Sinck&Ko",
// "Sinck en Ko" en "Sinck and Ko" allemaal naar "sinckko" gaan.
function normalizeBrand(s) {
  return (s || '')
    .toLowerCase()
    .replace(/\s+(en|and)\s+/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function levenshtein(a, b) {
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0]; dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = a[i - 1] === b[j - 1] ? prev : Math.min(prev, dp[j], dp[j - 1]) + 1;
      prev = tmp;
    }
  }
  return dp[b.length];
}

// Returnt true als `name` matcht met de brand of het domein.
// Eerst snelle includes-check, dan normalized compare (lost "Online Labs" vs "OnlineLabs"
// op), dan Levenshtein 90% als safety net voor typos, en tenslotte word-overlap
// voor multi-word brands (bv. "Studio Vita" matcht "Studio Vita Marketing").
// Returnt true als de full response-tekst de brand of het domein noemt,
// ook bij "Online Labs" (spatie) of "Online-Labs" — gebruikt voor de
// found-flag wanneer er geen genummerde ranking is.
export function textMentionsBrand(text, brandName, domain) {
  if (!text || !brandName) return false;
  const tLower = text.toLowerCase();
  const bLower = brandName.toLowerCase().trim();
  const domainBase = (domain || '').replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/$/, '').split('.')[0].toLowerCase();

  if (tLower.includes(bLower)) return true;
  if (domainBase && tLower.includes(domainBase)) return true;

  // Normalized: strip whitespace/punctuation uit zowel tekst als brand zodat
  // "Online Labs" matcht op "OnlineLabs".
  const nText = normalizeBrand(text);
  const nBrand = normalizeBrand(brandName);
  if (nBrand && nText.includes(nBrand)) return true;
  const nDomain = normalizeBrand(domainBase);
  if (nDomain && nText.includes(nDomain)) return true;

  return false;
}

// Zoekt brand of domein in tekst met whitespace tussen elke char toegestaan,
// zodat "Online Labs" matcht op brand "OnlineLabs". Returnt een gestripte
// snippet met ellipses, of '' als niets gevonden.
export function findBrandSnippet(text, brandName, domain, before = 80, after = 120) {
  if (!text || !brandName) return '';
  const escapeChar = c => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const buildPattern = s => s.split('').map(escapeChar).join('\\s*');

  let m = new RegExp(buildPattern(brandName.trim()), 'i').exec(text);
  if (!m && domain) {
    const domainBase = domain.replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/$/, '').split('.')[0];
    if (domainBase && domainBase.length >= 4) {
      m = new RegExp(buildPattern(domainBase), 'i').exec(text);
    }
  }
  if (!m) return '';

  const start = Math.max(0, m.index - before);
  const end = Math.min(text.length, m.index + m[0].length + after);
  const prefix = start > 0 ? '...' : '';
  const suffix = end < text.length ? '...' : '';
  return stripMarkdown(prefix + text.substring(start, end).trim() + suffix);
}

export function matchesBrand(name, brandName, domain) {
  if (!name || !brandName) return false;
  const nameLower = name.toLowerCase();
  const brandLower = brandName.toLowerCase().trim();
  const domainBase = (domain || '').replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/$/, '').split('.')[0].toLowerCase();

  if (nameLower.includes(brandLower) || brandLower.includes(nameLower)) return true;
  if (domainBase && nameLower.includes(domainBase)) return true;

  const nName = normalizeBrand(name);
  const nBrand = normalizeBrand(brandName);
  const nDomain = normalizeBrand(domainBase);
  if (nBrand && nName) {
    if (nName === nBrand || nName.includes(nBrand) || nBrand.includes(nName)) return true;
    const dist = levenshtein(nName, nBrand);
    const sim = 1 - dist / Math.max(nName.length, nBrand.length);
    if (sim >= 0.9) return true;
  }
  if (nDomain && nName && (nName === nDomain || nName.includes(nDomain) || nDomain.includes(nName))) return true;

  const brandWords = brandLower.split(/\s+/).filter(w => w.length > 2);
  if (brandWords.length > 1) {
    const matched = brandWords.filter(w => nameLower.includes(w)).length;
    if (matched >= Math.ceil(brandWords.length * 0.6)) return true;
  }

  return false;
}

export function parseRankings(text, brandName, domain) {
  if (!text) return { found:false, position:null, totalResults:0, rankings:[], snippet:'' };
  const rankings=[]; const lines=text.split('\n'); const np=/^\s*(\d+)[\.\)\-\:\s]+\s*\**([^*\n\(\[]{2,80})/;
  for (const line of lines) { const m=line.match(np); if(m){let name=m[2].trim().replace(/\*\*/g,'').replace(/\[.*?\]/g,'').replace(/\(.*?\)/g,'').replace(/\s*[-–—:].*/g,'').trim();if(!/^\d[\d.,/]*\s*(\/\s*\d|rating|score|stars?|sterren|punt|out of)/i.test(name)&&name.length>2&&name.length<80)rankings.push({position:parseInt(m[1]),name,isTarget:false});}}
  rankings.forEach((r,i)=>{r.position=i+1;});
  if(rankings.length<3){const bp=/\*\*([^*]{3,60})\*\*/g;let bm,pos=0;while((bm=bp.exec(text))!==null){pos++;const n=bm[1].trim();if(n.length>2&&!n.includes(':')&&!n.includes('?')&&!rankings.some(r=>r.name.toLowerCase()===n.toLowerCase()))rankings.push({position:pos,name:n,isTarget:false});}}
  let bp2=null;for(const r of rankings){if(matchesBrand(r.name,brandName,domain)){bp2=r.position;r.isTarget=true;break;}}
  const mentionedInText=textMentionsBrand(text,brandName,domain);
  const sn=findBrandSnippet(text,brandName,domain,80,120);
  return{found:bp2!==null||mentionedInText,mentionedInText,position:bp2,totalResults:rankings.length,rankings:rankings.slice(0,15),snippet:sn};
}

export function parsePerplexityRankings(cleanText,rawText,brandName,domain){
  if(!rawText)return{found:false,position:null,totalResults:0,rankings:[],snippet:''};
  const rankings=[];const seen=new Set();
  const add=(name)=>{let c=name.replace(/^\d+[\.\)\-:\s]+/,'').replace(/^[•\-\*]\s+/,'').replace(/\s*[:\-–—]\s*$/,'').replace(/[\[\]]/g,'').replace(/\*\*/g,'').trim();if(c.length<2||c.length>80||seen.has(c.toLowerCase()))return;if(/^(waarom|omdat|volgens|deze|dit|een|het|de|top|beste|lokale|bedrijven|specialisten|conclusie|samenvatting|bronnen|sources|references|note|tip)$/i.test(c))return;if(/^(http|www\.|google\.|the |a |an |de |het |een )/i.test(c))return;seen.add(c.toLowerCase());rankings.push({position:rankings.length+1,name:c,isTarget:false});};
  const lines=rawText.split('\n').map(l=>l.trim()).filter(Boolean);
  for(const line of lines){
    // Hoogste prio: "N. Bedrijfsnaam ..." waar Bedrijfsnaam 1-4 hoofdletter-woorden is.
    // Vangt ook gevallen waar de body daarna doorloopt zonder dash, bv. "2. OnlineLabs (Amsterdam) OnlineLabs is een ...".
    let m=line.match(/^\d+[\.\)]\s+\**([A-ZÀ-ÿ][\wÀ-ÿ\-&'.@]*(?:\s+[A-ZÀ-ÿ][\wÀ-ÿ\-&'.@]*){0,3})/);
    if(m){add(m[1]);continue;}
    m=line.match(/^\d+[\.\)]\s+\**([^*\n]{2,80}?)\**(?:\s*[:\-–—]\s|$)/);if(m){add(m[1]);continue;}m=line.match(/^\d+[\.\)]\s+\*\*(.+?)\*\*/);if(m){add(m[1]);continue;}m=line.match(/^[•\-\*]\s+\**([^*\n]{2,80}?)\**(?:\s*[:\-–—]\s|$)/);if(m){add(m[1]);continue;}m=line.match(/^[•\-\*]\s+\*\*(.+?)\*\*/);if(m){add(m[1]);continue;}const bms=[...line.matchAll(/\*\*([A-ZÀ-ÿ][A-Za-zÀ-ÿ0-9&'.@\-\s]{1,60}?)\*\*/g)];for(const b of bms)add(b[1]);m=line.match(/^([A-ZÀ-ÿ][A-Za-zÀ-ÿ0-9&'.@\-\s]{1,50}?)\s*[:\-–—]\s+\S/);if(m&&!m[1].match(/^(Dit|Deze|Het|De|Een|Als|Voor|Met|Door|Wat|Hoe|Waar|The|This|That|For|With|How|Why)/))add(m[1]);
  }
  // Globale safety net: bold mentions in proza (bv. "Voorbeelden zijn **Coatingvloer.nl**, **Sinck&Ko** op IJburg...").
  // add() dedupliceert, dus dubbele entries blijven uit.
  const globalBolds=[...rawText.matchAll(/\*\*([A-ZÀ-ÿ][A-Za-zÀ-ÿ0-9&'.@\-\s]{1,60}?)\*\*/g)];
  for(const b of globalBolds) add(b[1]);
  if(rankings.length<3){const fb=parseRankings(rawText,brandName,domain);if(fb.rankings.length>rankings.length)return fb;}
  let pos=null;
  for(const r of rankings){if(matchesBrand(r.name,brandName,domain)){r.isTarget=true;pos=r.position;break;}}
  const mentionedInText=textMentionsBrand(cleanText,brandName,domain)||textMentionsBrand(rawText,brandName,domain);
  const sn=findBrandSnippet(cleanText,brandName,domain,80,160)||findBrandSnippet(rawText,brandName,domain,80,160);
  return{found:pos!==null||mentionedInText,mentionedInText,position:pos,totalResults:rankings.length,rankings:rankings.slice(0,15),snippet:sn};
}

export function getSystemPrompt(sa,l='nl'){return l==='en'?`You are a helpful assistant that provides recommendations for businesses and services. The user is located${sa?` in the ${sa} area`:''}.\n\nAlways provide a numbered top 10 list with:\n- Business name\n- Brief explanation of why they are good\n\nBase your recommendations on current information and reviews.`:`Je bent een behulpzame assistent die aanbevelingen geeft voor Nederlandse bedrijven en diensten. De gebruiker bevindt zich in Nederland${sa?`, regio ${sa}`:''}.\n\nGeef ALTIJD een genummerde top 10 lijst met:\n- Bedrijfsnaam\n- Korte toelichting waarom ze goed zijn\n\nBaseer je aanbevelingen op actuele informatie en reviews.`;}
export function getPerplexitySystemPrompt(sa,l='nl'){return l==='en'?`You are a helpful assistant that provides recommendations for businesses and services. The user is located${sa?` in ${sa}`:' in the United Kingdom'}.\n\nIMPORTANT INSTRUCTIONS:\n- Only recommend businesses that actually operate in the user's location\n- No international companies unless they have a local branch\n- Provide a numbered top 10 list\n- For each entry: business name + brief reason why they are good\n- Base recommendations on current reviews and reputation\n- Do NOT include ratings or scores in the business name line`:`Je bent een behulpzame assistent die aanbevelingen geeft voor bedrijven en diensten in Nederland. De gebruiker zoekt specifiek naar Nederlandse bedrijven${sa?` in de regio ${sa}`:''}.\n\nBELANGRIJKE INSTRUCTIES:\n- Antwoord ALTIJD in het Nederlands\n- Noem ALLEEN bedrijven die daadwerkelijk in Nederland actief zijn${sa?`, bij voorkeur in of rond ${sa}`:''}\n- Geen internationale bedrijven tenzij ze een Nederlandse vestiging hebben\n- Geef een genummerde top 10 lijst\n- Per bedrijf: bedrijfsnaam + korte toelichting waarom ze goed zijn\n- Baseer je op actuele reviews, Google Reviews, Trustpilot en branche-informatie\n- Vermeld GEEN ratings of scores op de bedrijfsnaam-regel zelf`;}

export async function scanChatGPT(prompt,brandName,domain,serviceArea,locale){
  const r=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{'Authorization':`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:'gpt-4o-search-preview',web_search_options:{search_context_size:'medium',user_location:{type:'approximate',approximate:{country:locale==='en'?'GB':'NL',city:serviceArea||(locale==='en'?'London':'Amsterdam')}}},messages:[{role:'system',content:getSystemPrompt(serviceArea,locale)},{role:'user',content:prompt}]})});
  if(!r.ok)throw new Error(`ChatGPT API error: ${r.status}`);
  const d=await r.json();const text=d.choices?.[0]?.message?.content||'';
  return{...parseRankings(text,brandName,domain),platform:'chatgpt',fullResponse:stripMarkdown(text)};
}

export async function scanPerplexity(prompt,brandName,domain,serviceArea,locale){
  const ctrl=new AbortController();const tid=setTimeout(()=>ctrl.abort(),30000);
  try{
    const r=await fetch('https://api.perplexity.ai/chat/completions',{method:'POST',signal:ctrl.signal,headers:{'Authorization':`Bearer ${process.env.PERPLEXITY_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:'sonar-pro',stream:true,web_search_options:{search_type:'auto'},messages:[{role:'system',content:getPerplexitySystemPrompt(serviceArea,locale)},{role:'user',content:prompt}]})});
    if(!r.ok)throw new Error(`Perplexity API error: ${r.status}`);
    const reader=r.body.getReader();const dec=new TextDecoder();let ft='',buf='';
    while(true){const{done,value}=await reader.read();if(done)break;buf+=dec.decode(value,{stream:true});const ls=buf.split('\n');buf=ls.pop()||'';for(const l of ls){if(!l.startsWith('data: '))continue;const p=l.slice(6).trim();if(!p||p==='[DONE]')continue;try{const j=JSON.parse(p);const d=j.choices?.[0]?.delta?.content;if(d)ft+=d;}catch{}}}
    const cl=stripMarkdown(ft);return{...parsePerplexityRankings(cl,ft,brandName,domain),platform:'perplexity',fullResponse:cl};
  }catch(e){if(e.name==='AbortError')throw new Error('Perplexity timeout');throw e;}finally{clearTimeout(tid);}
}

export async function scanGoogleAI(keyword,brandName,domain,serviceArea,locale){
  if(!process.env.SERPAPI_KEY)return{platform:'google_ai',found:false,position:null,totalResults:0,rankings:[],snippet:'',fullResponse:'',error:true};
  const gp=`${keyword} ${serviceArea||(locale==='en'?'London':'Amsterdam')}`.trim();
  const params=new URLSearchParams({engine:'google_ai_mode',q:gp,gl:locale==='en'?'uk':'nl',hl:locale==='en'?'en':'nl',api_key:process.env.SERPAPI_KEY});
  try{
    const r=await fetch(`https://serpapi.com/search.json?${params}`);const rt=await r.text();if(!r.ok)return{platform:'google_ai',found:false,position:null,totalResults:0,rankings:[],snippet:'',fullResponse:'',error:true};
    const data=JSON.parse(rt);const fullResponse=stripMarkdown(data.reconstructed_markdown||'');
    const rankings=[];const seen=new Set();
    const addC=(name)=>{const c=name.trim().replace(/\*\*/g,'').replace(/[\[\]]/g,'').trim();if(c.length<3||c.length>60||seen.has(c.toLowerCase()))return;if(/^(AI|Local|Lokale|Directe|Betrouwbare|Entiteit|Entity|Structured|Question|Further|View|Read|Discover|Information|Citations|Conversion|Core|Content|Technical|Search|Data|Strateg|Techniek|Doel|Succes|Kenmerk)/i.test(c))return;if(/^(http|www\.|google\.|the |a |an |de |het |een )/i.test(c))return;seen.add(c.toLowerCase());rankings.push({position:rankings.length+1,name:c,isTarget:false});};
    // Priority 0: data.references — geciteerde bronnen met domain + titel.
    // Hier zitten typisch de échte bedrijfsnamen (bv "Sinck&Ko") die in de
    // tekst gehyperlinked staan. text_blocks bevat soms alleen de generieke
    // categorie-links ("Gietvloer Amsterdam") — die wil je juist niet als
    // primair signaal.
    if(Array.isArray(data.references)){
      for(const ref of data.references){
        // Titel: vaak "Bedrijfsnaam - Slogan" of "Bedrijfsnaam | Categorie"
        if(ref.title){
          const t=String(ref.title).split(/\s+[\-–|·]\s+/)[0].trim();
          if(t) addC(t);
        }
        // Source: domain (bv "sinck-ko.nl"). Strip TLD, vervang `-` door spatie.
        if(ref.source){
          const src=String(ref.source).replace(/^www\./,'').replace(/\.[a-z]{2,}$/i,'').replace(/[-_]/g,' ').trim();
          if(src && src.length>=3) addC(src);
        }
      }
    }
    if(Array.isArray(data.text_blocks)){for(const block of data.text_blocks){if(Array.isArray(block.list)){for(const item of block.list){if(item.snippet_links&&Array.isArray(item.snippet_links)){for(const link of item.snippet_links){if(link.text&&link.link&&!link.link.includes('google.com/search'))addC(link.text);}}}}if(Array.isArray(block.table)&&block.table.length>1){const h=(block.table[0]||[]).join(' ').toLowerCase();if(/bureau|agency|bedrijf|company|naam|name|specialist/i.test(h)){for(let i=1;i<block.table.length;i++){if(block.table[i][0])addC(String(block.table[i][0]));}}}if(Array.isArray(block.formatted)){for(const row of block.formatted){const nk=Object.keys(row).find(k=>/bureau|agency|bedrijf|company|naam|name/i.test(k));if(nk&&row[nk])addC(String(row[nk]));}}}if(rankings.length<3){for(const block of data.text_blocks){if(Array.isArray(block.list)){for(const item of block.list){const m=(item.snippet||'').match(/^([^:(]{2,40})\s*(?:\([^)]*\))?\s*:/);if(m)addC(m[1]);}}}}}
    if(rankings.length<3&&(data.reconstructed_markdown||fullResponse)){const p=parseRankings(data.reconstructed_markdown||fullResponse,brandName,domain);if(p.rankings.length>rankings.length)return{...p,platform:'google_ai',fullResponse};}
    let bp=null;
    for(const rr of rankings){if(matchesBrand(rr.name,brandName,domain)){bp=rr.position;rr.isTarget=true;break;}}
    const mentionedInText=textMentionsBrand(fullResponse,brandName,domain);
    const sn=findBrandSnippet(fullResponse,brandName,domain,80,150);
    return{platform:'google_ai',found:bp!==null||mentionedInText,mentionedInText,position:bp,totalResults:rankings.length,rankings,snippet:sn,fullResponse};
  }catch(e){console.error('[Rank Scanner] Google AI Mode:',e.message);return{platform:'google_ai',found:false,position:null,totalResults:0,rankings:[],snippet:'',fullResponse:'',error:true};}
}

// Scant 1 keyword op alle 3 platformen parallel en schrijft naar rank_history.
// supabase = service client (caller geeft hem mee zodat lib stateless blijft).
export async function runLiveScan(supabase, kw, locale = 'nl') {
  const prompt = kw.generated_prompt;
  const [chatgpt, perplexity, googleAi] = await Promise.allSettled([
    scanChatGPT(prompt, kw.brand_name, kw.domain, kw.service_area, locale),
    scanPerplexity(prompt, kw.brand_name, kw.domain, kw.service_area, locale),
    scanGoogleAI(kw.keyword, kw.brand_name, kw.domain, kw.service_area, locale),
  ]);
  const proc = (s, p) => s.status === 'fulfilled' ? s.value : { platform: p, found: false, position: null, totalResults: 0, rankings: [], snippet: '', error: true };
  const results = { chatgpt: proc(chatgpt, 'chatgpt'), perplexity: proc(perplexity, 'perplexity'), google_ai: proc(googleAi, 'google_ai') };
  const inserts = Object.values(results).map(r => ({
    tracked_keyword_id: kw.id, user_id: kw.user_id, platform: r.platform,
    position: r.position || null, found: r.found || false, total_results: r.totalResults || 0,
    rankings: r.rankings || [], snippet: r.snippet || '', full_response: r.fullResponse || '',
  }));
  await supabase.from('rank_history').insert(inserts);
  return results;
}
