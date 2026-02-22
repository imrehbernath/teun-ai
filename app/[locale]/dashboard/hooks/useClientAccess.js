'use client'

// app/dashboard/hooks/useClientAccess.js
// Hook die overal in het dashboard detecteert of de user een klant is
// en welke bedrijven ze mogen zien

import { useState, useEffect, useCallback } from 'react'

const ADMIN_EMAILS = ['hallo@onlinelabs.nl', 'imre@onlinelabs.nl']

export default function useClientAccess(userEmail) {
  const [clientAccess, setClientAccess] = useState({
    loading: true,
    isAdmin: false,
    isClient: false,        // true = klant met read-only view
    shares: [],             // alle shared_access records
    sharedCompanies: [],    // array van company names die klant mag zien
    canScan: true,          // false voor klanten
    canEdit: true,          // false voor klanten
    canDelete: true,        // false voor klanten
  })

  const checkAccess = useCallback(async () => {
    // Snelle check: als het een admin email is, skip API call
    if (userEmail && ADMIN_EMAILS.includes(userEmail)) {
      setClientAccess({
        loading: false,
        isAdmin: true,
        isClient: false,
        shares: [],
        sharedCompanies: [],
        canScan: true,
        canEdit: true,
        canDelete: true,
      })
      return
    }

    try {
      const res = await fetch('/api/client-access')
      if (!res.ok) {
        // Niet ingelogd of error — default naar eigen account
        setClientAccess(prev => ({ ...prev, loading: false }))
        return
      }

      const data = await res.json()

      setClientAccess({
        loading: false,
        isAdmin: data.isAdmin,
        isClient: data.isClientView,
        shares: data.shares || [],
        sharedCompanies: data.sharedCompanies || [],
        canScan: data.isAdmin || !data.isClientView,
        canEdit: data.isAdmin || !data.isClientView,
        canDelete: data.isAdmin || !data.isClientView,
      })
    } catch (err) {
      console.error('Client access check failed:', err)
      setClientAccess(prev => ({ ...prev, loading: false }))
    }
  }, [userEmail])

  useEffect(() => {
    if (userEmail !== undefined) {
      checkAccess()
    }
  }, [userEmail, checkAccess])

  return clientAccess
}
