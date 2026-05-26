'use client'

import { useEffect, useRef } from 'react'
import { pushDataLayer } from '@/lib/gtm'

export default function ShareViewTracker({ token, companyName }) {
  const fired = useRef(false)
  useEffect(() => {
    if (fired.current) return
    fired.current = true
    pushDataLayer('share_viewed', {
      share_token: token,
      company: companyName,
    })
  }, [token, companyName])
  return null
}
