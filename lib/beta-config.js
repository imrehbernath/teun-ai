// lib/beta-config.js - BETA fase configuratie
// ✅ Updated: 2x anonymous (lifetime), 1x per dag (authenticated)

export const BETA_CONFIG = {
  TOOLS: {
    'ai-visibility': {
      name: 'AI Zichtbaarheidsanalyse',
      slug: 'ai-visibility',
      enabled: true,
      limits: {
        anonymous: 1,           // 1 scan totaal (lifetime) — was 2
        authenticated: 1,       // 1 scan per week — was 1 per dag
        beta_unlimited: true
      },
      cooldown: {
        anonymous: 3600,        // 1 uur tussen scans (in seconden)
        authenticated: 604800   // 7 dagen (was 86400 = 1 dag)
      },
      resetPeriod: 'weekly'     // 'daily' | 'weekly' | 'monthly' — was 'daily'
    },
    'geo-optimalisatie': {
      name: 'GEO Optimalisatie Tool',
      slug: 'geo-optimalisatie',
      enabled: true,
      limits: {
        anonymous: 2,
        authenticated: 1,       // ✅ 1 scan per dag
        beta_unlimited: true
      },
      cooldown: {
        anonymous: 3600,
        authenticated: 86400    // ✅ 24 uur
      },
      resetPeriod: 'daily'
    },
    'tool-3': {
      name: 'Tool 3 (coming soon)',
      slug: 'tool-3',
      enabled: false,
      limits: {
        anonymous: 0,
        authenticated: 5,
        beta_unlimited: true
      },
      cooldown: {
        anonymous: 3600,
        authenticated: 1800
      },
      resetPeriod: 'monthly'
    },
    'tool-4': {
      name: 'Tool 4 (coming soon)',
      slug: 'tool-4',
      enabled: false,
      limits: {
        anonymous: 0,
        authenticated: 5,
        beta_unlimited: true
      },
      cooldown: {
        anonymous: 3600,
        authenticated: 1800
      },
      resetPeriod: 'monthly'
    }
  },

  // Admin bypass - add your email to this list for unlimited scanning
  ADMIN_EMAILS: [
    process.env.ADMIN_EMAIL,
    'imre@onlinelabs.nl',
    'hallo@onlinelabs.nl',
  ].filter(Boolean),

  // ✨ Admin fast scan mode
  ADMIN_SETTINGS: {
    fastScanMode: true,
    numberOfPrompts: 10,
    skipCooldown: true,
    unlimitedScans: true
  },

  // ✅ Chrome Extension info
  CHROME_EXTENSION: {
    id: 'jjhjnmkanlmjhmobcgemjakkjdbkkfmk',
    name: 'Teun.ai - ChatGPT Visibility Scanner',
    url: 'https://chromewebstore.google.com/detail/teunai-chatgpt-visibility/jjhjnmkanlmjhmobcgemjakkjdbkkfmk'
  },

  MESSAGES: {
    anonymous_limit_reached: (toolName, limit) => {
    return `Je hebt je gratis scan gebruikt. Maak een gratis account aan voor 1 scan per week!`
    },
    
    beta_user_limit_reached: (toolName, limit) => 
      `Je hebt je wekelijkse gratis scan al gebruikt. Volgende week kun je weer scannen, of upgrade naar Lite voor onbeperkt scannen.`,
    
    cooldown_active: (toolName, minutesLeft) => {
      const hours = Math.floor(minutesLeft / 60)
      const mins = minutesLeft % 60
      if (hours > 0) {
        return `Je kunt over ${hours} uur en ${mins} minuten weer scannen. Tip: Gebruik onze Chrome extensie voor onbeperkt realtime scannen in ChatGPT!`
      }
      return `Je kunt over ${minutesLeft} minuten weer scannen.`
    },
    
    beta_upgrade_cta: 
      `🎉 Onbeperkte scans binnenkort beschikbaar! Schrijf je in voor early access.`,
    
    tool_disabled: (toolName) =>
      `${toolName} is nog in ontwikkeling. Schrijf je in voor updates!`,

    // ✅ NEW: Chrome extension suggestion
    chrome_extension_cta:
      `💡 Tip: Installeer onze gratis Chrome extensie voor onbeperkt realtime scannen direct in ChatGPT!`
  },

  WAITLIST: {
    enabled: true,
    priority_access_days: 7,
    launch_discount: 20
  }
}

// Helper: Check if user is admin
function isAdminUser(userEmail) {
  if (!userEmail) return false
  return BETA_CONFIG.ADMIN_EMAILS.includes(userEmail)
}

// Helper: Calculate minutes until cooldown ends
function getMinutesUntilCooldown(lastScanTime, cooldownSeconds) {
  if (!lastScanTime) return 0
  
  const lastScan = new Date(lastScanTime)
  const now = new Date()
  const secondsSinceLastScan = Math.floor((now - lastScan) / 1000)
  const secondsRemaining = Math.max(0, cooldownSeconds - secondsSinceLastScan)
  
  return Math.ceil(secondsRemaining / 60)
}

// ✅ Helper: Get start of period (daily or monthly)
function getStartOfPeriod(resetPeriod = 'daily') {
  const now = new Date()
  
  if (resetPeriod === 'daily') {
    const startOfDay = new Date(now)
    startOfDay.setHours(0, 0, 0, 0)
    return startOfDay
  } else if (resetPeriod === 'weekly') {
    // Start of current week (Monday)
    const startOfWeek = new Date(now)
    const day = startOfWeek.getDay()
    const diff = day === 0 ? 6 : day - 1 // Monday = 0 offset
    startOfWeek.setDate(startOfWeek.getDate() - diff)
    startOfWeek.setHours(0, 0, 0, 0)
    return startOfWeek
  } else {
    const startOfMonth = new Date(now)
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)
    return startOfMonth
  }
}

// ✅ Helper: Get next reset time
function getNextResetTime(resetPeriod = 'daily') {
  const now = new Date()
  
  if (resetPeriod === 'daily') {
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)
    return tomorrow
  } else if (resetPeriod === 'weekly') {
    // Next Monday
    const nextMonday = new Date(now)
    const day = nextMonday.getDay()
    const daysUntilMonday = day === 0 ? 1 : 8 - day
    nextMonday.setDate(nextMonday.getDate() + daysUntilMonday)
    nextMonday.setHours(0, 0, 0, 0)
    return nextMonday
  } else {
    const nextMonth = new Date(now)
    nextMonth.setMonth(nextMonth.getMonth() + 1)
    nextMonth.setDate(1)
    nextMonth.setHours(0, 0, 0, 0)
    return nextMonth
  }
}

export async function canUserScan(supabase, userId, toolName, ipAddress) {
  const tool = BETA_CONFIG.TOOLS[toolName]
  
  if (!tool?.enabled) {
    return {
      allowed: false,
      message: BETA_CONFIG.MESSAGES.tool_disabled(tool.name)
    }
  }

  // 🔓 Localhost bypass — onbeperkt scannen tijdens development
  const LOCALHOST_IPS = ['127.0.0.1', '::1', '::ffff:127.0.0.1', 'unknown', 'localhost']
  if (LOCALHOST_IPS.includes(ipAddress)) {
    console.log(`🔓 Localhost bypass active (IP: ${ipAddress})`)
    return { allowed: true, scansRemaining: 999, isLocalhost: true }
  }

  // Check if authenticated user
  if (userId) {
    // Get user email for admin check (service client has no session, use admin API)
    const { data: { user } } = await supabase.auth.admin.getUserById(userId)
    const userEmail = user?.email

    // ✨ ADMIN BYPASS - Unlimited scans + Fast mode
    if (isAdminUser(userEmail)) {
      console.log(`🔓 Admin bypass active for ${userEmail}`)
      console.log(`⚡ Admin fast scan mode: ${BETA_CONFIG.ADMIN_SETTINGS.numberOfPrompts} prompt(s)`)
      return { 
        allowed: true, 
        scansRemaining: 999,
        isAdmin: true,
        adminSettings: BETA_CONFIG.ADMIN_SETTINGS
      }
    }

    // ⭐ PAID USER BYPASS - Lite & Pro subscribers
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_status, subscription_tier')
      .eq('id', userId)
      .single()

    if (['active', 'canceling'].includes(profile?.subscription_status)) {
      const tier = profile?.subscription_tier || 'pro' // fallback to pro for existing subscribers without tier
      console.log(`⭐ ${tier.toUpperCase()} user bypass active for ${userEmail || userId}`)
      return { allowed: true, scansRemaining: 999, isPro: tier === 'pro', isLite: tier === 'lite', tier }
    }

    // Check for beta_unlimited access level
    const { data: betaAccess } = await supabase
      .from('beta_access')
      .select('access_level, tools_enabled')
      .eq('user_id', userId)
      .single()

    if (betaAccess?.access_level === 'beta_unlimited') {
      console.log(`🎯 Beta unlimited access for user ${userId}`)
      return { allowed: true, scansRemaining: 999 }
    }

    if (betaAccess && !betaAccess?.tools_enabled?.includes(toolName)) {
      return {
        allowed: false,
        message: `Je hebt geen toegang tot ${tool.name}`
      }
    }

    // ✅ UPDATED: Check daily/monthly limit based on resetPeriod
    const resetPeriod = tool.resetPeriod || 'daily'
    const startOfPeriod = getStartOfPeriod(resetPeriod)

    const { data: usage } = await supabase
      .from('scan_history')
      .select('id, created_at')
      .eq('user_id', userId)
      .eq('tool_name', toolName)
      .gte('created_at', startOfPeriod.toISOString())
      .order('created_at', { ascending: false })

    const currentScans = usage?.length || 0
    const limit = tool.limits.authenticated

    if (currentScans >= limit) {
      const nextReset = getNextResetTime(resetPeriod)
      const hoursUntilReset = Math.ceil((nextReset - new Date()) / (1000 * 60 * 60))
      
      return {
        allowed: false,
        message: BETA_CONFIG.MESSAGES.beta_user_limit_reached(tool.name, limit),
        scansRemaining: 0,
        nextResetTime: nextReset.toISOString(),
        hoursUntilReset,
        // ✅ Suggest Chrome extension
        extensionAvailable: true,
        extensionUrl: BETA_CONFIG.CHROME_EXTENSION.url,
        extensionCta: BETA_CONFIG.MESSAGES.chrome_extension_cta
      }
    }

    // Check cooldown (time since last scan)
    if (usage && usage.length > 0) {
      const lastScanTime = usage[0].created_at
      const cooldownSeconds = tool.cooldown.authenticated
      const minutesLeft = getMinutesUntilCooldown(lastScanTime, cooldownSeconds)

      if (minutesLeft > 0) {
        return {
          allowed: false,
          message: BETA_CONFIG.MESSAGES.cooldown_active(tool.name, minutesLeft),
          scansRemaining: limit - currentScans,
          cooldownMinutes: minutesLeft,
          extensionAvailable: true,
          extensionUrl: BETA_CONFIG.CHROME_EXTENSION.url
        }
      }
    }

    return {
      allowed: true,
      scansRemaining: limit - currentScans,
      resetPeriod,
      nextResetTime: getNextResetTime(resetPeriod).toISOString()
    }
  }

  // ANONYMOUS USER FLOW
  const { data: anonScans } = await supabase
    .from('anonymous_scans')
    .select('scans_made, last_scan_at')
    .eq('ip_address', ipAddress)
    .eq('tool_name', toolName)
    .single()

  const currentScans = anonScans?.scans_made || 0
  const limit = tool.limits.anonymous

  // Check scan limit
  if (currentScans >= limit) {
    return {
      allowed: false,
      message: BETA_CONFIG.MESSAGES.anonymous_limit_reached(toolName, limit),
      scansRemaining: 0,
      // ✅ Suggest login for more scans
      upgradeAvailable: true,
      upgradeMessage: 'Log in voor dagelijks 1 gratis scan + Chrome extensie toegang!'
    }
  }

  // Check cooldown
  if (anonScans?.last_scan_at) {
    const cooldownSeconds = tool.cooldown.anonymous
    const minutesLeft = getMinutesUntilCooldown(anonScans.last_scan_at, cooldownSeconds)

    if (minutesLeft > 0) {
      return {
        allowed: false,
        message: BETA_CONFIG.MESSAGES.cooldown_active(tool.name, minutesLeft),
        scansRemaining: limit - currentScans,
        cooldownMinutes: minutesLeft
      }
    }
  }

  return {
    allowed: true,
    scansRemaining: limit - currentScans
  }
}

export async function trackScan(supabase, userId, toolName, ipAddress, inputData, results, durationMs) {
  // Log scan to history
  await supabase.from('scan_history').insert({
    user_id: userId,
    tool_name: toolName,
    input_data: inputData,
    results: results,
    ip_address: ipAddress,
    scan_duration_ms: durationMs
  })

  if (userId) {
    // Update authenticated user usage
    const { data: existing } = await supabase
      .from('tool_usage')
      .select('scans_made')
      .eq('user_id', userId)
      .eq('tool_name', toolName)
      .single()

    const newCount = (existing?.scans_made || 0) + 1

    await supabase
      .from('tool_usage')
      .upsert({
        user_id: userId,
        tool_name: toolName,
        scans_made: newCount,
        last_used_at: new Date().toISOString()
      }, { 
        onConflict: 'user_id,tool_name'
      })
  } else {
    // Update anonymous user usage
    const { data: existing } = await supabase
      .from('anonymous_scans')
      .select('scans_made')
      .eq('ip_address', ipAddress)
      .eq('tool_name', toolName)
      .single()

    const newCount = (existing?.scans_made || 0) + 1

    await supabase
      .from('anonymous_scans')
      .upsert({
        ip_address: ipAddress,
        tool_name: toolName,
        scans_made: newCount,
        last_scan_at: new Date().toISOString()
      }, { onConflict: 'ip_address,tool_name' })
  }
}
