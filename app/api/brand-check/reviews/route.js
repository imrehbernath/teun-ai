import { NextResponse } from 'next/server'

const SERPAPI_KEY = process.env.SERPAPI_KEY

// POST /api/brand-check/reviews
export async function POST(request) {
  if (!SERPAPI_KEY) {
    return NextResponse.json({ error: 'SerpAPI not configured' }, { status: 500 })
  }

  const { brandName, location, locale } = await request.json()

  if (!brandName) {
    return NextResponse.json({ error: 'brandName required' }, { status: 400 })
  }

  try {
    // ── STEP 1: Find the business via Google Local (better coverage than Maps search) ──
    const searchQuery = location ? `${brandName} ${location}` : brandName
    console.log('[Reviews] Searching for:', searchQuery)

    let dataId = null
    let placeId = null
    let placeInfo = null

    // Strategy A: Google Local API (finds most businesses)
    const localUrl = `https://serpapi.com/search.json?${new URLSearchParams({
      engine: 'google_local',
      q: searchQuery,
      api_key: SERPAPI_KEY,
      hl: locale === 'en' ? 'en' : 'nl',
      gl: 'nl',
    }).toString()}`

    const localRes = await fetch(localUrl)
    const localData = await localRes.json()
    
    const brandLower = brandName.toLowerCase()
    const localResults = localData.local_results || []
    console.log('[Reviews] Google Local results:', localResults.length, localResults.slice(0, 3).map(r => r.title))

    if (localResults.length > 0) {
      const match = localResults.find(r => r.title?.toLowerCase().includes(brandLower)) || localResults[0]
      console.log('[Reviews] Match fields:', JSON.stringify(Object.keys(match)))
      console.log('[Reviews] Match data:', JSON.stringify({ title: match.title, data_id: match.data_id, place_id: match.place_id, data_cid: match.data_cid, reviews_link: match.reviews_link, rating: match.rating, reviews: match.reviews, links: match.links }))
      
      // Try multiple field names for the identifier
      dataId = match.data_id || null
      placeId = match.place_id || null
      
      // Fallback: extract data_id from reviews_link URL
      if (!dataId && match.reviews_link) {
        const dataIdMatch = match.reviews_link.match(/data_id=([^&]+)/)
        if (dataIdMatch) dataId = decodeURIComponent(dataIdMatch[1])
      }
      
      // Fallback: extract from links object
      if (!dataId && match.links) {
        const linksStr = JSON.stringify(match.links)
        const linkDataId = linksStr.match(/data_id=([^&"]+)/)
        if (linkDataId) dataId = decodeURIComponent(linkDataId[1])
        // Extract data_id from directions URL (!1s pattern)
        if (!dataId) {
          const directionsMatch = linksStr.match(/!1s(0x[0-9a-f]+:0x[0-9a-f]+)/i)
          if (directionsMatch) dataId = directionsMatch[1]
        }
        // Also check for place_id in links
        if (!placeId) {
          const linkPlaceId = linksStr.match(/place_id=([^&"]+)/)
          if (linkPlaceId) placeId = decodeURIComponent(linkPlaceId[1])
        }
      }
      
      // Fallback: use data_cid to construct a place lookup
      if (!dataId && !placeId && match.data_cid) {
        dataId = `0x0:0x${BigInt(match.data_cid).toString(16)}`
      }
      
      placeInfo = {
        name: match.title,
        rating: match.rating || null,
        reviewCount: match.reviews || 0,
        address: match.address || '',
        type: match.type || '',
      }
      console.log('[Reviews] Found via Google Local:', match.title, 'data_id:', dataId, 'place_id:', placeId)
    }

    // Strategy B: Google Maps search as fallback
    if (!dataId && !placeId) {
      console.log('[Reviews] Trying Google Maps search fallback')
      const mapsUrl = `https://serpapi.com/search.json?${new URLSearchParams({
        engine: 'google_maps',
        q: searchQuery,
        type: 'search',
        api_key: SERPAPI_KEY,
        hl: locale === 'en' ? 'en' : 'nl',
      }).toString()}`

      const mapsRes = await fetch(mapsUrl)
      const mapsData = await mapsRes.json()
      const mapsResults = mapsData.local_results || []
      console.log('[Reviews] Google Maps results:', mapsResults.length)

      if (mapsResults.length > 0) {
        const match = mapsResults.find(r => r.title?.toLowerCase().includes(brandLower)) || mapsResults[0]
        dataId = match.data_id || null
        placeId = match.place_id || null
        placeInfo = {
          name: match.title,
          rating: match.rating || null,
          reviewCount: match.reviews || 0,
          address: match.address || '',
          type: match.type || '',
        }
      }
    }

    // Nothing found
    if (!dataId && !placeId) {
      console.log('[Reviews] Business not found on Google')
      return NextResponse.json({
        found: false,
        message: locale === 'en' ? 'Business not found on Google Maps' : 'Bedrijf niet gevonden op Google Maps',
      })
    }

    // No reviews
    if (placeInfo && placeInfo.reviewCount === 0) {
      return NextResponse.json({
        found: true,
        place: placeInfo,
        reviews: [],
        themes: [],
        summary: null,
      })
    }

    // ── STEP 2: Fetch reviews using data_id or place_id ──
    const reviewParams = new URLSearchParams({
      engine: 'google_maps_reviews',
      api_key: SERPAPI_KEY,
      hl: locale === 'en' ? 'en' : 'nl',
      sort_by: 'newestFirst',
    })
    if (dataId) reviewParams.set('data_id', dataId)
    else if (placeId) reviewParams.set('place_id', placeId)

    console.log('[Reviews] Fetching reviews, data_id:', dataId, 'place_id:', placeId)
    const reviewsUrl = `https://serpapi.com/search.json?${reviewParams.toString()}`
    const reviewsRes = await fetch(reviewsUrl)
    const reviewsData = await reviewsRes.json()

    // Update placeInfo from reviews response if available
    if (reviewsData.place_info) {
      placeInfo = {
        ...placeInfo,
        name: reviewsData.place_info.title || placeInfo?.name,
        rating: reviewsData.place_info.rating || placeInfo?.rating,
        reviewCount: reviewsData.place_info.reviews || placeInfo?.reviewCount,
        address: reviewsData.place_info.address || placeInfo?.address,
        type: reviewsData.place_info.type || placeInfo?.type,
      }
    }

    const reviews = (reviewsData.reviews || []).slice(0, 20).map(r => ({
      rating: r.rating || 0,
      text: r.snippet || r.extracted_snippet?.original || '',
      date: r.date || '',
      likes: r.likes || 0,
    }))

    console.log('[Reviews] Got', reviews.length, 'reviews for', placeInfo?.name)

    // ── STEP 3: Analyze themes ──
    const themes = analyzeReviewThemes(reviews, locale)

    // ── STEP 4: Build summary ──
    const positiveReviews = reviews.filter(r => r.rating >= 4)
    const negativeReviews = reviews.filter(r => r.rating <= 2)

    const avgRating = reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : (placeInfo?.rating || 0)

    return NextResponse.json({
      found: true,
      place: placeInfo,
      reviews: reviews.slice(0, 5),
      themes,
      summary: {
        avgRating: parseFloat(avgRating),
        totalReviews: placeInfo?.reviewCount || reviews.length,
        analyzedReviews: reviews.length,
        positive: positiveReviews.length,
        negative: negativeReviews.length,
        neutral: reviews.length - positiveReviews.length - negativeReviews.length,
      },
    })

  } catch (error) {
    console.error('[Reviews] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 })
  }
}

// Theme analysis from review text
function analyzeReviewThemes(reviews, locale) {
  const isNL = locale !== 'en'

  const themePatterns = {
    quality: {
      label: isNL ? 'Kwaliteit' : 'Quality',
      keywords: ['kwaliteit', 'quality', 'vakwerk', 'professioneel', 'professional', 'goed werk', 'good work', 'netjes', 'mooi', 'excellent', 'uitstekend', 'prima', 'top', 'perfect'],
      positive: 0, negative: 0,
    },
    service: {
      label: 'Service',
      keywords: ['service', 'friendly', 'vriendelijk', 'behulpzaam', 'helpful', 'klantvriendelijk', 'customer service', 'attent', 'meedenken', 'flexibel', 'flexible'],
      positive: 0, negative: 0,
    },
    communication: {
      label: isNL ? 'Communicatie' : 'Communication',
      keywords: ['communicatie', 'communication', 'bereikbaar', 'reachable', 'contact', 'reageren', 'response', 'antwoord', 'answer', 'terugbellen', 'callback', 'mail', 'email', 'telefoon', 'phone'],
      positive: 0, negative: 0,
    },
    price: {
      label: isNL ? 'Prijs-kwaliteit' : 'Value for money',
      keywords: ['prijs', 'price', 'kosten', 'cost', 'betaalbaar', 'affordable', 'goedkoop', 'cheap', 'duur', 'expensive', 'prijs-kwaliteit', 'value', 'waarde', 'fair', 'eerlijk', 'scherp'],
      positive: 0, negative: 0,
    },
    reliability: {
      label: isNL ? 'Betrouwbaarheid' : 'Reliability',
      keywords: ['betrouwbaar', 'reliable', 'op tijd', 'on time', 'afspraak', 'appointment', 'stipt', 'punctual', 'beloftes', 'promises', 'nakomen', 'deliver', 'vertrouwen', 'trust'],
      positive: 0, negative: 0,
    },
    speed: {
      label: isNL ? 'Snelheid' : 'Speed',
      keywords: ['snel', 'fast', 'quick', 'vlot', 'tempo', 'speed', 'wachten', 'waiting', 'lang duren', 'took long', 'traag', 'slow', 'direct', 'meteen', 'immediately'],
      positive: 0, negative: 0,
    },
    expertise: {
      label: isNL ? 'Expertise' : 'Expertise',
      keywords: ['kennis', 'knowledge', 'ervaring', 'experience', 'expert', 'specialist', 'vakman', 'deskundig', 'skilled', 'kundig', 'competent', 'know-how'],
      positive: 0, negative: 0,
    },
  }

  const negativeWords = ['niet', 'slecht', 'matig', 'teleurgesteld', 'jammer', 'helaas', 'probleem', 'klacht', 'no', 'bad', 'poor', 'disappointed', 'unfortunately', 'problem', 'complaint', 'terrible', 'awful', 'worst', 'never', 'nooit']

  for (const review of reviews) {
    const text = (review.text || '').toLowerCase()
    const isPositive = review.rating >= 4
    const isNegative = review.rating <= 2
    const hasNegWord = negativeWords.some(w => text.includes(w))

    for (const [key, theme] of Object.entries(themePatterns)) {
      const found = theme.keywords.some(kw => text.includes(kw))
      if (found) {
        if (isNegative || (hasNegWord && !isPositive)) {
          theme.negative++
        } else {
          theme.positive++
        }
      }
    }
  }

  return Object.entries(themePatterns)
    .filter(([_, t]) => t.positive + t.negative > 0)
    .map(([key, t]) => ({
      key,
      label: t.label,
      positive: t.positive,
      negative: t.negative,
      total: t.positive + t.negative,
      sentiment: t.negative > t.positive ? 'negative' : t.positive > t.negative * 2 ? 'positive' : 'mixed',
    }))
    .sort((a, b) => b.total - a.total)
}
