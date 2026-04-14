import { useState, useEffect, useCallback } from 'react'
import { api, getApiBase } from '@/lib/api'
import { getAccessToken, refreshAccessToken, setTokens } from '@/lib/auth'

export interface Profile {
  id: string
  user_id: string
  email: string
  first_name?: string
  last_name?: string
  display_name?: string
  avatar_url?: string
  created_at: string
  updated_at: string
}

function userToProfile(user: {
  id: string
  email: string
  display_name?: string | null
  first_name?: string | null
  last_name?: string | null
  created_at?: string
  updated_at?: string
}): Profile {
  const display = user.display_name != null ? String(user.display_name) : ''
  const parts = display.split(/\s+/).filter(Boolean)
  const fallbackFirst = parts[0] || ''
  const fallbackLast = parts.slice(1).join(' ') || ''
  return {
    id: user.id,
    user_id: user.id,
    email: user.email,
    display_name: user.display_name ?? undefined,
    first_name: (user.first_name ?? fallbackFirst) || undefined,
    last_name: (user.last_name ?? fallbackLast) || undefined,
    avatar_url: undefined,
    created_at: user.created_at ?? new Date().toISOString(),
    updated_at: user.updated_at ?? new Date().toISOString(),
  }
}

async function fetchJsonWithAuth(url: string, init: RequestInit): Promise<any> {
  const apiBase = getApiBase().replace(/\/+$/, '')
  const headers = new Headers(init.headers)
  const token = getAccessToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const hasBody = init.body !== undefined && init.body !== null
  if (hasBody && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  let res = await fetch(url, { ...init, headers, credentials: 'include' })

  if (res.status === 401) {
    const refreshed = await refreshAccessToken(apiBase)
    if (refreshed?.token) {
      setTokens(refreshed.token, refreshed.refreshToken ?? undefined)
      headers.set('Authorization', `Bearer ${refreshed.token}`)
      res = await fetch(url, { ...init, headers, credentials: 'include' })
    }
  }

  const text = await res.text()
  let data: any
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    data = { message: text }
  }
  if (!res.ok) {
    throw new Error(data?.message || data?.error || `Request failed (${res.status})`)
  }
  return data
}

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const getProfile = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await api.getCurrentUser()

      if (!response.success || !response.data?.user) {
        setProfile(null)
        setLoading(false)
        return
      }

      const user = response.data.user
      setProfile(userToProfile(user))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    getProfile()
  }, [getProfile])

  const updateProfile = useCallback(async (updates: Partial<Profile>) => {
    const token = getAccessToken()
    if (!token) {
      throw new Error('Not authenticated')
    }

    const apiBase = getApiBase().replace(/\/+$/, '')
    const url = `${apiBase}/api/auth/profile`

    const body: Record<string, string | undefined> = {}
    if (updates.first_name !== undefined) body.first_name = updates.first_name
    if (updates.last_name !== undefined) body.last_name = updates.last_name
    if (updates.email !== undefined) body.email = updates.email
    if (updates.display_name !== undefined) body.display_name = updates.display_name

    const data = await fetchJsonWithAuth(url, {
      method: 'PUT',
      body: JSON.stringify(body),
    })

    const user = data?.user ?? data
    if (user?.id && user?.email) {
      const next = userToProfile(user)
      setProfile(next)
      return next
    }

    let next: Profile | null = null
    setProfile((prev) => {
      if (!prev) return prev
      next = {
        ...prev,
        ...updates,
        updated_at: new Date().toISOString(),
      }
      return next
    })
    return next
  }, [])

  const updatePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    const token = getAccessToken()
    if (!token) {
      throw new Error('Not authenticated')
    }

    const apiBase = getApiBase().replace(/\/+$/, '')
    const url = `${apiBase}/api/auth/password`

    await fetchJsonWithAuth(url, {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    })
  }, [])

  return {
    profile,
    loading,
    error,
    updateProfile,
    updatePassword,
    refetch: getProfile,
  }
}

export default useProfile
