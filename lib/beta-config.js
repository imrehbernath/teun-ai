// lib/beta-config.js - BETA fase configuratie

export const BETA_CONFIG = {
  TOOLS: {
    'ai-visibility': {
      name: 'AI Zichtbaarheidsanalyse',
      slug: 'ai-visibility',
      enabled: true,
      limits: {
        anonymous: 2,           // 2 scans totaal (lifetime)
        authenticated: 5,       // 5 scans per maand
        beta_unlimited: true
      },
      cooldown: {
        anonymous: 3600,        // 1 uur tussen scans (in seconden)
        authenticated: 1800     // 30 minuten tussen scans
      }
    },
    'geo-optimalisatie': {
      name: 'GEO Optimalisatie Tool',
      slug: 'geo-optimalisatie',
      enabled: true,
      limits: {
        anonymous: 2,
        authenticated: 5,
        beta_unlimited: true
      },
      cooldown: {
        anonymous: 3600,
        authenticated: 1800
      }
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
      }
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
      }
    }
  },

  // Admin bypass - add your email to this list for unlimited scanning
  ADMIN_EMAILS: [
    process.env.ADMIN_EMAIL,
    // Add more admin emails here if needed
    // 'admin2@example.com',
  ].filter(Boolean), // Removes undefined values

  MESSAGES: {
    anonymous_limit_reached: (toolName, limit) => {
      const tool = BETA_CONFIG.TOOLS[toolName]
      const authLimit = tool ? tool.limits.authenticated : 5
      return `Je hebt je ${limit} gratis scans gebruikt. Maak een gratis account aan voor ${authLimit} scans per maand!`
    },
    
    beta_user_limit_reached: (toolName, limit) => 
      `Je hebt je ${limit} scans deze maand gebruikt. Meer scans beschikbaar na de lancering van onze Pro versie!`,
    
    cooldown_active: (toolName, minutesLeft) =>
      `Je kunt over ${minutesLeft} minuten weer scannen met ${toolName}. Maak een account aan voor kortere wachttijden!`,
    
    beta_upgrade_cta: 
      `🎉 Onbeperkte scans binnenkort beschikbaar! Schrijf je in voor early access.`,
    
    tool_disabled: (toolName) =>
      `${toolName} is nog in ontwikkeling. Schrijf je in voor updates!`
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

export async function canUserScan(supabase, userId, toolName, ipAddress) {
  const tool = BETA_CONFIG.TOOLS[toolName]
  
  if (!tool?.enabled) {
    return {
      allowed: false,
      message: BETA_CONFIG.MESSAGES.tool_disabled(tool.name)
    }
  }

  // Check if authenticated user
  if (userId) {
    // Get user email for admin check
    const { data: { user } } = await supabase.auth.getUser()
    const userEmail = user?.email

    // ADMIN BYPASS - Unlimited scans for admins
    if (isAdminUser(userEmail)) {
      console.log(`🔓 Admin bypass active for ${userEmail}`)
      return { 
        allowed: true, 
        scansRemaining: 999,
        isAdmin: true 
      }
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

    // Check monthly limit (resets on 1st of month)
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { data: usage } = await supabase
      .from('scan_history')
      .select('id, created_at')
      .eq('user_id', userId)
      .eq('tool_name', toolName)
      .gte('created_at', startOfMonth.toISOString())
      .order('created_at', { ascending: false })

    const currentScans = usage?.length || 0
    const limit = tool.limits.authenticated

    if (currentScans >= limit) {
      return {
        allowed: false,
        message: BETA_CONFIG.MESSAGES.beta_user_limit_reached(tool.name, limit),
        scansRemaining: 0
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
          cooldownMinutes: minutesLeft
        }
      }
    }

    return {
      allowed: true,
      scansRemaining: limit - currentScans
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
      scansRemaining: 0
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