import { NextResponse } from 'next/server'

const SERPAPI_KEY = process.env.SERPAPI_API_KEY

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
    // Step 1: Search Google Maps for the business
    const searchQuery = location ? `${brandName} ${location}` : brandName
    const searchUrl = `https://serpapi.com/search.json?engine=google_maps&q=${encodeURIComponent(searchQuery)}&type=search&api_key=${SERPAPI_KEY}&hl=${locale === 'en' ? 'en' : 'nl'}`

    const searchRes = await fetch(searchUrl)
    const searchData = await searchRes.json()

    if (!searchData.local_results || searchData.local_results.length === 0) {
      return NextResponse.json({
        found: false,
        message: locale === 'en' ? 'Business not found on Google Maps' : 'Bedrijf niet gevonden op Google Maps',
      })
    }

    // Find best match (first result or exact name match)
    const brandLower = brandName.toLowerCase()
    const match = searchData.local_results.find(r =>
      r.title?.toLowerCase().includes(brandLower)
    ) || searchData.local_results[0]

    const placeInfo = {
      name: match.title,
      rating: match.rating || null,
      reviewCount: match.reviews || 0,
      address: match.address || '',
      type: match.type || '',
      dataId: match.data_id || match.place_id,
    }

    // No reviews available
    if (!placeInfo.dataId || placeInfo.reviewCount === 0) {
      return NextResponse.json({
        found: true,
        place: placeInfo,
        reviews: [],
        themes: [],
        summary: null,
      })
    }

    // Step 2: Fetch reviews
    const reviewsUrl = `https://serpapi.com/search.json?engine=google_maps_reviews&data_id=${encodeURIComponent(placeInfo.dataId)}&api_key=${SERPAPI_KEY}&hl=${locale === 'en' ? 'en' : 'nl'}&sort_by=newestFirst`

    const reviewsRes = await fetch(reviewsUrl)
    const reviewsData = await reviewsRes.json()

    const reviews = (reviewsData.reviews || []).slice(0, 20).map(r => ({
      rating: r.rating || 0,
      text: r.snippet || r.text || '',
      date: r.date || '',
      likes: r.likes || 0,
    }))

    // Step 3: Analyze themes from reviews
    const themes = analyzeReviewThemes(reviews, locale)

    // Step 4: Build summary
    const positiveReviews = reviews.filter(r => r.rating >= 4)
    const negativeReviews = reviews.filter(r => r.rating <= 2)
    const neutralReviews = reviews.filter(r => r.rating === 3)

    const avgRating = reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : placeInfo.rating

    return NextResponse.json({
      found: true,
      place: placeInfo,
      reviews: reviews.slice(0, 5), // Only return top 5 for display
      themes,
      summary: {
        avgRating: parseFloat(avgRating),
        totalReviews: placeInfo.reviewCount,
        analyzedReviews: reviews.length,
        positive: positiveReviews.length,
        negative: negativeReviews.length,
        neutral: neutralReviews.length,
      },
    })

  } catch (error) {
    console.error('Google Reviews API error:', error)
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 })
  }
}

// Client-side theme analysis (no OpenAI needed, fast)
function analyzeReviewThemes(reviews, locale) {
  const isNL = locale !== 'en'

  // Theme keywords mapping
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

  // Negative signal words
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

  // Return themes that were actually mentioned, sorted by total mentions
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
