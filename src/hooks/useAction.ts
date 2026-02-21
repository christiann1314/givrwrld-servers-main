import { useState, useCallback } from 'react'
import { toast } from 'sonner'

interface UseActionReturn<T> {
  run: (...args: any[]) => Promise<T>
  loading: boolean
  error: string | null
}

export function useAction<T>(
  fn: (...args: any[]) => Promise<T>,
  options?: {
    onSuccess?: (result: T) => void
    onError?: (error: Error) => void
    successMessage?: string
    errorMessage?: string
  }
): UseActionReturn<T> {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = useCallback(async (...args: any[]): Promise<T> => {
    try {
      setLoading(true)
      setError(null)
      
      const result = await fn(...args)
      
      if (options?.successMessage) {
        toast.success(options.successMessage)
      }
      
      if (options?.onSuccess) {
        options.onSuccess(result)
      }
      
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
      
      const displayMessage = options?.errorMessage || errorMessage
      toast.error(displayMessage)
      
      if (options?.onError) {
        options.onError(err instanceof Error ? err : new Error(errorMessage))
      }
      
      throw err
    } finally {
      setLoading(false)
    }
  }, [fn, options])

  return { run, loading, error }
}

export default useAction
