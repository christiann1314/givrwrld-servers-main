 import { useState, useEffect, useCallback } from 'react'
 import { api } from '@/lib/api'

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
       setProfile({
         id: user.id,
         user_id: user.id,
         email: user.email,
         display_name: user.display_name,
         first_name: user.display_name?.split(' ')[0],
         last_name: user.display_name?.split(' ').slice(1).join(' '),
         avatar_url: undefined,
         created_at: new Date().toISOString(),
         updated_at: new Date().toISOString()
       })
     } catch (err) {
       setError(err instanceof Error ? err.message : 'Failed to load profile')
     } finally {
       setLoading(false)
     }
   }, [])
 
  useEffect(() => {
    getProfile()
   }, [getProfile])

   const updateProfile = async (_updates: Partial<Profile>) => {
     // TODO: Implement profile update via API
     console.warn('Profile update not yet implemented')
     return profile
  }

  return {
    profile,
    loading,
    error,
     updateProfile,
     refetch: getProfile
  }
}

export default useProfile
