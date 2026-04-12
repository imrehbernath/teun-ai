// app/api/tracked-keywords/route.js
// CRUD voor tracked keywords + live scan bij toevoegen
// Scan logica = EXACT dezelfde als ai-rank-tracker/route.js

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { RANK_TRACKER_TIERS } from '@/lib/rank-tracker-tiers';

export const maxDuration = 120;

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function getUserTier(userId) {
  if (!userId) return RANK_TRACKER_TIERS.free;
  const { data: user } = await supabase.auth.admin.getUserById(userId);
  if (!user?.user) return RANK_TRACKER_TIERS.free;
  if (user.user.email === process.env.ADMIN_EMAIL) return RANK_TRACKER_TIERS.pro;
  const tier = user.user.user_metadata?.subscription_tier || 'free';
  return RANK_TRACKER_TIERS[tier] || RANK_TRACKER_TIERS.free;
}

// ── PROMPT GENERATOR (copy van ai-rank-tracker/route.js) ──
function generatePrompt(keyword, serviceArea, locale = 'nl') {
  const kw = keyword.trim(); const area = serviceArea?.trim() || '';
  let cleanKw = kw;
  if (area && kw.toLowerCase().includes(area.toLowerCase())) { cleanKw = kw.replace(new RegExp(area, 'i'), '').trim().replace(/\s+in\s*$/i, '').trim(); }
  if (locale === 'nl') { cleanKw = cleanKw.replace(/^(de\s+)?beste\s+/i, '').trim(); } else { cleanKw = cleanKw.replace(/^(the\s+)?best\s+/i, '').trim(); }
  const inArea = area ? ` in ${area}` : ''; const cleanLower = cleanKw.toLowerCase();
  if (locale === 'en') {
    if (['have built','have made','have designed','get installed','buy','rent','book','order','arrange','hire'].some(v => cleanLower.includes(v))) return `I want to ${cleanKw}${inArea}. Which companies can you recommend?`;
    if (['improve','optimize','build','design','develop','fix','repair','install','create','set up','manage','grow','boost','increase'].some(v => cleanLower.includes(v))) return `I want to ${cleanKw}${inArea}. Which company or specialist would you recommend for this?`;
    if (/\b(agency|company|firm|specialist|consultant|expert|service|studio|practice|lawyer|doctor|clinic)\b/i.test(cleanKw)) return `Can you recommend a good ${cleanKw}${inArea}?`;
    return `I'm looking for a specialist in ${cleanKw}${inArea}. Which companies would you recommend?`;
  }
  if (['laten maken','laten bouwen','laten ontwerpen','laten aanleggen','laten renoveren','laten schilderen','laten verbouwen','laten installeren','laten drukken','laten repareren','laten behangen','laten stucen','kopen','huren','boeken','bestellen','regelen','aanvragen','inhuren'].some(v => cleanLower.includes(v))) return `Ik wil ${cleanKw}${inArea}. Welke bedrijven kun je aanbevelen?`;
  const foundVerb = ['verbeteren','optimaliseren','ontwikkelen','uitbesteden','opzetten','automatiseren','beheren','analyseren','upgraden','redesignen','verduurzamen','isoleren','verbouwen','renoveren','schilderen'].find(v => cleanLower.includes(v));
  if (foundVerb) { const vi = cleanLower.indexOf(foundVerb); const sub = cleanKw.substring(0, vi).trim(); if (sub) return `Ik wil mijn ${sub} ${foundVerb}${inArea}. Welk bedrijf of bureau raad je aan?`; return `Ik wil ${cleanKw}${inArea}. Welk bedrijf raad je aan?`; }
  if (/\b(bureau|bedrijf|specialist|adviseur|advocaat|kantoor|praktijk|studio|consultant|coach|trainer|installateur|aannemer|loodgieter|schilder|monteur)\b/i.test(cleanKw)) return `Kun je een goed ${cleanKw}${inArea} aanbevelen?`;
  return `Ik zoek een specialist in ${cleanKw}${inArea}. Welk bedrijf raad je aan?`;
}

// ── STRIP + PARSE (copy van ai-rank-tracker/route.js) ──
function stripMarkdown(text) {
  if (!text) return '';
  return text.replace(/\[(\d+)\]/g,'').replace(/\[([^\]]+)\]\([^)]+\)/g,'$1').replace(/https?:\/\/[^\s)\]]+/g,'').replace(/\([^)]*utm_source[^)]*\)/g,'').replace(/^#{1,6}\s+/gm,'').replace(/\*{1,3}([^*]+)\*{1,3}/g,'$1').replace(/^>\s?/gm,'').replace(/`([^`]+)`/g,'$1').replace(/\(\s*\)/g,'').replace(/  +/g,' ').replace(/\n{3,}/g,'\n\n').trim();
}
function parseRankings(text, brandName, domain) {
  if (!text) return { found:false, position:null, totalResults:0, rankings:[], snippet:'' };
  const rankings=[]; const lines=text.split('\n'); const np=/^\s*(\d+)[\.\)\-\:\s]+\s*\**([^*\n\(\[]{2,80})/;
  for (const line of lines) { const m=line.match(np); if(m){let name=m[2].trim().replace(/\*\*/g,'').replace(/\[.*?\]/g,'').replace(/\(.*?\)/g,'').replace(/\s*[-–—:].*/g,'').trim();if(!/^\d[\d.,/]*\s*(\/\s*\d|rating|score|stars?|sterren|punt|out of)/i.test(name)&&name.length>2&&name.length<80)rankings.push({position:parseInt(m[1]),name,isTarget:false});}}
  rankings.forEach((r,i)=>{r.position=i+1;});
  if(rankings.length<3){const bp=/\*\*([^*]{3,60})\*\*/g;let bm,pos=0;while((bm=bp.exec(text))!==null){pos++;const n=bm[1].trim();if(n.length>2&&!n.includes(':')&&!n.includes('?')&&!rankings.some(r=>r.name.toLowerCase()===n.toLowerCase()))rankings.push({position:pos,name:n,isTarget:false});}}
  const bl=brandName.toLowerCase().trim();const bw=bl.split(/\s+/).filter(w=>w.length>2);const db=domain.replace(/^(https?:\/\/)?(www\.)?/,'').replace(/\/$/,'').split('.')[0].toLowerCase();
  let bp2=null;for(const r of rankings){const nl=r.name.toLowerCase();if(nl.includes(bl)||bl.includes(nl)||nl.includes(db)||(bw.length>1&&bw.filter(w=>nl.includes(w)).length>=Math.ceil(bw.length*0.6))){bp2=r.position;r.isTarget=true;break;}}
  const tl=text.toLowerCase();let sn='';const si=tl.includes(bl)?tl.indexOf(bl):tl.indexOf(db);
  if(si>=0){const s=Math.max(0,si-80);const e=Math.min(text.length,si+120);sn=stripMarkdown((s>0?'...':'')+text.substring(s,e).trim()+(e<text.length?'...':''));}
  return{found:bp2!==null,position:bp2,totalResults:rankings.length,rankings:rankings.slice(0,15),snippet:sn};
}
function parsePerplexityRankings(cleanText,rawText,brandName,domain){
  if(!rawText)return{found:false,position:null,totalResults:0,rankings:[],snippet:''};
  const rankings=[];const seen=new Set();
  const add=(name)=>{let c=name.replace(/^\d+[\.\)\-:\s]+/,'').replace(/^[•\-\*]\s+/,'').replace(/\s*[:\-–—]\s*$/,'').replace(/[\[\]]/g,'').replace(/\*\*/g,'').trim();if(c.length<2||c.length>80||seen.has(c.toLowerCase()))return;if(/^(waarom|omdat|volgens|deze|dit|een|het|de|top|beste|lokale|bedrijven|specialisten|conclusie|samenvatting|bronnen|sources|references|note|tip)$/i.test(c))return;if(/^(http|www\.|google\.|the |a |an |de |het |een )/i.test(c))return;seen.add(c.toLowerCase());rankings.push({position:rankings.length+1,name:c,isTarget:false});};
  const lines=rawText.split('\n').map(l=>l.trim()).filter(Boolean);
  for(const line of lines){let m=line.match(/^\d+[\.\)]\s+\**([^*\n]{2,80}?)\**(?:\s*[:\-–—]\s|$)/);if(m){add(m[1]);continue;}m=line.match(/^\d+[\.\)]\s+\*\*(.+?)\*\*/);if(m){add(m[1]);continue;}m=line.match(/^[•\-\*]\s+\**([^*\n]{2,80}?)\**(?:\s*[:\-–—]\s|$)/);if(m){add(m[1]);continue;}m=line.match(/^[•\-\*]\s+\*\*(.+?)\*\*/);if(m){add(m[1]);continue;}const bms=[...line.matchAll(/\*\*([A-ZÀ-ÿ][A-Za-zÀ-ÿ0-9&'.@\-\s]{1,60}?)\*\*/g)];for(const b of bms)add(b[1]);m=line.match(/^([A-ZÀ-ÿ][A-Za-zÀ-ÿ0-9&'.@\-\s]{1,50}?)\s*[:\-–—]\s+\S/);if(m&&!m[1].match(/^(Dit|Deze|Het|De|Een|Als|Voor|Met|Door|Wat|Hoe|Waar|The|This|That|For|With|How|Why)/))add(m[1]);}
  if(rankings.length<3){const fb=parseRankings(rawText,brandName,domain);if(fb.rankings.length>rankings.length)return fb;}
  const bl=brandName.toLowerCase().trim();const db=domain.replace(/^(https?:\/\/)?(www\.)?/,'').replace(/\/$/,'').split('.')[0].toLowerCase();let pos=null;
  for(const r of rankings){const n=r.name.toLowerCase();if(n.includes(bl)||bl.includes(n)||n.includes(db)){r.isTarget=true;pos=r.position;break;}}
  const tl=cleanText.toLowerCase();let sn='';const mi=tl.indexOf(bl)>=0?tl.indexOf(bl):tl.indexOf(db);if(mi>=0)sn=cleanText.substring(Math.max(0,mi-80),Math.min(cleanText.length,mi+160)).trim();
  return{found:pos!==null||tl.includes(bl)||tl.includes(db),position:pos,totalResults:rankings.length,rankings:rankings.slice(0,15),snippet:sn};
}

// ── PLATFORM SCANNERS (copy van ai-rank-tracker/route.js) ──
function getSystemPrompt(sa,l='nl'){return l==='en'?`You are a helpful assistant that provides recommendations for businesses and services. The user is located${sa?` in the ${sa} area`:''}.\n\nAlways provide a numbered top 10 list with:\n- Business name\n- Brief explanation of why they are good\n\nBase your recommendations on current information and reviews.`:`Je bent een behulpzame assistent die aanbevelingen geeft voor Nederlandse bedrijven en diensten. De gebruiker bevindt zich in Nederland${sa?`, regio ${sa}`:''}.\n\nGeef ALTIJD een genummerde top 10 lijst met:\n- Bedrijfsnaam\n- Korte toelichting waarom ze goed zijn\n\nBaseer je aanbevelingen op actuele informatie en reviews.`;}
function getPerplexitySystemPrompt(sa,l='nl'){return l==='en'?`You are a helpful assistant that provides recommendations for businesses and services. The user is located${sa?` in ${sa}`:' in the United Kingdom'}.\n\nIMPORTANT INSTRUCTIONS:\n- Only recommend businesses that actually operate in the user's location\n- No international companies unless they have a local branch\n- Provide a numbered top 10 list\n- For each entry: business name + brief reason why they are good\n- Base recommendations on current reviews and reputation\n- Do NOT include ratings or scores in the business name line`:`Je bent een behulpzame assistent die aanbevelingen geeft voor bedrijven en diensten in Nederland. De gebruiker zoekt specifiek naar Nederlandse bedrijven${sa?` in de regio ${sa}`:''}.\n\nBELANGRIJKE INSTRUCTIES:\n- Antwoord ALTIJD in het Nederlands\n- Noem ALLEEN bedrijven die daadwerkelijk in Nederland actief zijn${sa?`, bij voorkeur in of rond ${sa}`:''}\n- Geen internationale bedrijven tenzij ze een Nederlandse vestiging hebben\n- Geef een genummerde top 10 lijst\n- Per bedrijf: bedrijfsnaam + korte toelichting waarom ze goed zijn\n- Baseer je op actuele reviews, Google Reviews, Trustpilot en branche-informatie\n- Vermeld GEEN ratings of scores op de bedrijfsnaam-regel zelf`;}

async function scanChatGPT(prompt,brandName,domain,serviceArea,locale){
  const r=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{'Authorization':`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:'gpt-4o-search-preview',web_search_options:{search_context_size:'medium',user_location:{type:'approximate',approximate:{country:locale==='en'?'GB':'NL',city:serviceArea||(locale==='en'?'London':'Amsterdam')}}},messages:[{role:'system',content:getSystemPrompt(serviceArea,locale)},{role:'user',content:prompt}]})});
  if(!r.ok)throw new Error(`ChatGPT API error: ${r.status}`);
  const d=await r.json();const text=d.choices?.[0]?.message?.content||'';
  return{...parseRankings(text,brandName,domain),platform:'chatgpt',fullResponse:stripMarkdown(text)};
}

async function scanPerplexity(prompt,brandName,domain,serviceArea,locale){
  const ctrl=new AbortController();const tid=setTimeout(()=>ctrl.abort(),20000);
  try{
    const r=await fetch('https://api.perplexity.ai/chat/completions',{method:'POST',signal:ctrl.signal,headers:{'Authorization':`Bearer ${process.env.PERPLEXITY_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:'sonar-pro',stream:true,web_search_options:{search_type:'auto'},messages:[{role:'system',content:getPerplexitySystemPrompt(serviceArea,locale)},{role:'user',content:prompt}]})});
    if(!r.ok)throw new Error(`Perplexity API error: ${r.status}`);
    const reader=r.body.getReader();const dec=new TextDecoder();let ft='',buf='';
    while(true){const{done,value}=await reader.read();if(done)break;buf+=dec.decode(value,{stream:true});const ls=buf.split('\n');buf=ls.pop()||'';for(const l of ls){if(!l.startsWith('data: '))continue;const p=l.slice(6).trim();if(!p||p==='[DONE]')continue;try{const j=JSON.parse(p);const d=j.choices?.[0]?.delta?.content;if(d)ft+=d;}catch{}}}
    const cl=stripMarkdown(ft);return{...parsePerplexityRankings(cl,ft,brandName,domain),platform:'perplexity',fullResponse:cl};
  }catch(e){if(e.name==='AbortError')throw new Error('Perplexity timeout');throw e;}finally{clearTimeout(tid);}
}

async function scanGoogleAI(keyword,brandName,domain,serviceArea,locale){
  if(!process.env.SERPAPI_KEY)return{platform:'google_ai',found:false,position:null,totalResults:0,rankings:[],snippet:'',fullResponse:'',error:true};
  const gp=`${keyword} ${serviceArea||(locale==='en'?'London':'Amsterdam')}`.trim();
  const params=new URLSearchParams({engine:'google_ai_mode',q:gp,gl:locale==='en'?'uk':'nl',hl:locale==='en'?'en':'nl',api_key:process.env.SERPAPI_KEY});
  try{
    const r=await fetch(`https://serpapi.com/search.json?${params}`);const rt=await r.text();if(!r.ok)return{platform:'google_ai',found:false,position:null,totalResults:0,rankings:[],snippet:'',fullResponse:'',error:true};
    const data=JSON.parse(rt);const fullResponse=stripMarkdown(data.reconstructed_markdown||'');
    const rankings=[];const seen=new Set();
    const addC=(name)=>{const c=name.trim().replace(/\*\*/g,'').replace(/[\[\]]/g,'').trim();if(c.length<3||c.length>60||seen.has(c.toLowerCase()))return;if(/^(AI|Local|Lokale|Directe|Betrouwbare|Entiteit|Entity|Structured|Question|Further|View|Read|Discover|Information|Citations|Conversion|Core|Content|Technical|Search|Data|Strateg|Techniek|Doel|Succes|Kenmerk)/i.test(c))return;if(/^(http|www\.|google\.|the |a |an |de |het |een )/i.test(c))return;seen.add(c.toLowerCase());rankings.push({position:rankings.length+1,name:c,isTarget:false});};
    if(Array.isArray(data.text_blocks)){for(const block of data.text_blocks){if(Array.isArray(block.list)){for(const item of block.list){if(item.snippet_links&&Array.isArray(item.snippet_links)){for(const link of item.snippet_links){if(link.text&&link.link&&!link.link.includes('google.com/search'))addC(link.text);}}}}if(Array.isArray(block.table)&&block.table.length>1){const h=(block.table[0]||[]).join(' ').toLowerCase();if(/bureau|agency|bedrijf|company|naam|name|specialist/i.test(h)){for(let i=1;i<block.table.length;i++){if(block.table[i][0])addC(String(block.table[i][0]));}}}if(Array.isArray(block.formatted)){for(const row of block.formatted){const nk=Object.keys(row).find(k=>/bureau|agency|bedrijf|company|naam|name/i.test(k));if(nk&&row[nk])addC(String(row[nk]));}}}if(rankings.length<3){for(const block of data.text_blocks){if(Array.isArray(block.list)){for(const item of block.list){const m=(item.snippet||'').match(/^([^:(]{2,40})\s*(?:\([^)]*\))?\s*:/);if(m)addC(m[1]);}}}}}
    if(rankings.length<3&&(data.reconstructed_markdown||fullResponse)){const p=parseRankings(data.reconstructed_markdown||fullResponse,brandName,domain);if(p.rankings.length>rankings.length)return{...p,platform:'google_ai',fullResponse};}
    const bl=brandName.toLowerCase().trim();const db=domain.replace(/^(https?:\/\/)?(www\.)?/,'').replace(/\/$/,'').split('.')[0].toLowerCase();let bp=null,sn='';
    for(const rr of rankings){const nl=rr.name.toLowerCase();if(nl.includes(bl)||bl.includes(nl)||nl.includes(db)){bp=rr.position;rr.isTarget=true;break;}}
    const tl=fullResponse.toLowerCase();const bi=tl.indexOf(bl);if(bi!==-1)sn=fullResponse.substring(Math.max(0,bi-50),Math.min(fullResponse.length,bi+bl.length+150)).trim();
    return{platform:'google_ai',found:bp!==null||tl.includes(bl)||tl.includes(db),position:bp,totalResults:rankings.length,rankings,snippet:sn,fullResponse};
  }catch(e){console.error('[Rank Tracker] Google AI Mode:',e.message);return{platform:'google_ai',found:false,position:null,totalResults:0,rankings:[],snippet:'',fullResponse:'',error:true};}
}

// ── LIVE SCAN ──
async function runLiveScan(kw, locale = 'nl') {
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

// ── GET ──
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: 'userId verplicht' }, { status: 400 });
    const tier = await getUserTier(userId);
    const { data: keywords, error } = await supabase.from('tracked_keywords').select('*').eq('user_id', userId).order('created_at', { ascending: true });
    if (error) throw error;
    const keywordIds = keywords.map(k => k.id);
    let latestRankings = {};
    if (keywordIds.length > 0) {
      const { data: rankings } = await supabase.from('rank_history').select('tracked_keyword_id, platform, position, found, scanned_at').in('tracked_keyword_id', keywordIds).order('scanned_at', { ascending: false });
      if (rankings) { for (const r of rankings) { const key = `${r.tracked_keyword_id}_${r.platform}`; if (!latestRankings[key]) latestRankings[key] = r; } }
    }
    const enriched = keywords.map(kw => {
      const positions = {};
      for (const p of ['chatgpt', 'perplexity', 'google_ai']) positions[p] = latestRankings[`${kw.id}_${p}`] || null;
      return { ...kw, latestPositions: positions };
    });
    return NextResponse.json({ keywords: enriched, tier: { name: tier.name, maxKeywords: tier.maxKeywords, maxCompetitors: tier.maxCompetitors, cronEnabled: tier.cronEnabled, used: keywords.length } });
  } catch (error) { console.error('GET error:', error); return NextResponse.json({ error: 'Ophalen mislukt' }, { status: 500 }); }
}

// ── POST (keyword toevoegen + direct live scan) ──
export async function POST(request) {
  try {
    const body = await request.json();
    const { userId, keyword, serviceArea, domain, brandName, competitors, locale = 'nl', customPrompt } = body;
    if (!userId || !keyword || !domain || !brandName) return NextResponse.json({ error: 'userId, keyword, domain en brandName zijn verplicht' }, { status: 400 });
    const tier = await getUserTier(userId);
    const { count } = await supabase.from('tracked_keywords').select('*', { count: 'exact', head: true }).eq('user_id', userId);
    if (count >= tier.maxKeywords) return NextResponse.json({ error: `Maximum ${tier.maxKeywords} keywords bereikt`, limitReached: true }, { status: 403 });
    const comps = (competitors || []).slice(0, tier.maxCompetitors);
    const generatedPrompt = customPrompt || generatePrompt(keyword, serviceArea, locale);
    const { data, error } = await supabase.from('tracked_keywords').insert({ user_id: userId, keyword: keyword.trim(), generated_prompt: generatedPrompt, service_area: serviceArea?.trim() || null, domain: domain.trim(), brand_name: brandName.trim(), competitors: comps }).select().single();
    if (error) { if (error.code === '23505') return NextResponse.json({ error: 'Dit keyword track je al' }, { status: 409 }); throw error; }
    // Live scan
    let scanResults = null;
    try { scanResults = await runLiveScan(data, locale); } catch (e) { console.error('Live scan error:', e); }
    if (process.env.SLACK_WEBHOOK_URL) { try { const pos = scanResults ? Object.entries(scanResults).map(([p, r]) => `${p}: ${r.position ? `#${r.position}` : '—'}`).join(' | ') : 'pending'; await fetch(process.env.SLACK_WEBHOOK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: `📊 Tracked: ${brandName} | ${keyword}${serviceArea ? ` (${serviceArea})` : ''}\n💬 "${generatedPrompt}"\n📈 ${pos}` }) }); } catch {} }
    return NextResponse.json({ keyword: data, scanResults });
  } catch (error) { console.error('POST error:', error); return NextResponse.json({ error: 'Toevoegen mislukt' }, { status: 500 }); }
}

// ── PATCH ──
export async function PATCH(request) {
  try {
    const body = await request.json();
    const { id, userId, generatedPrompt, competitors, keyword, serviceArea, brandName, locale = 'nl', rescan = false } = body;
    if (!id || !userId) return NextResponse.json({ error: 'id en userId verplicht' }, { status: 400 });
    const updates = {};
    if (generatedPrompt !== undefined) updates.generated_prompt = generatedPrompt;
    if (competitors !== undefined) updates.competitors = competitors;
    if (keyword !== undefined) updates.keyword = keyword;
    if (serviceArea !== undefined) updates.service_area = serviceArea;
    if (brandName !== undefined) updates.brand_name = brandName;
    if (keyword && !generatedPrompt) updates.generated_prompt = generatePrompt(keyword, serviceArea || undefined, locale);
    const { data, error } = await supabase.from('tracked_keywords').update(updates).eq('id', id).eq('user_id', userId).select().single();
    if (error) throw error;
    let scanResults = null;
    if (rescan) { try { scanResults = await runLiveScan(data, locale); } catch {} }
    return NextResponse.json({ keyword: data, scanResults });
  } catch (error) { console.error('PATCH error:', error); return NextResponse.json({ error: 'Bijwerken mislukt' }, { status: 500 }); }
}

// ── DELETE ──
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const keywordId = searchParams.get('id'); const userId = searchParams.get('userId');
    if (!keywordId || !userId) return NextResponse.json({ error: 'id en userId verplicht' }, { status: 400 });
    await supabase.from('rank_history').delete().eq('tracked_keyword_id', keywordId);
    const { error } = await supabase.from('tracked_keywords').delete().eq('id', keywordId).eq('user_id', userId);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) { console.error('DELETE error:', error); return NextResponse.json({ error: 'Verwijderen mislukt' }, { status: 500 }); }
}
