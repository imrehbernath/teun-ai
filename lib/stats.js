// lib/stats.js - Growing stats counters (deterministic per day)
// Base date: March 19, 2026 — counts grow daily from here

const BASE_DATE = new Date('2026-03-19T00:00:00Z')
const BASE_SCANS = 2847
const BASE_COMPANIES = 151

// Simple seeded random (deterministic per day)
function seededRandom(seed) {
  const x = Math.sin(seed * 9301 + 49297) * 49297
  return x - Math.floor(x)
}

function getDaysSinceBase() {
  const now = new Date()
  const diff = now - BASE_DATE
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)))
}

export function getGrowingStats() {
  const days = getDaysSinceBase()
  
  let scans = BASE_SCANS
  let companies = BASE_COMPANIES

  for (let d = 1; d <= days; d++) {
    // Scans: 15-25 per day (avg ~20)
    scans += 15 + Math.floor(seededRandom(d) * 11)
    // Companies: 2-4 per day (avg ~3)
    companies += 2 + Math.floor(seededRandom(d + 10000) * 3)
  }

  return {
    scans: scans.toLocaleString('nl-NL'),
    companies: companies.toLocaleString('nl-NL'),
  }
}
