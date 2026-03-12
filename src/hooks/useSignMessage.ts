import { useCallback, useState } from 'react'
import bs58 from 'bs58'
import { useWankmiContext } from '../context/WankmiProvider'
import type { SignMessageResult, TransactionStatus } from '../types'

export interface UseSignMessageReturn {
  /** Sign an arbitrary message with the connected wallet */
  signMessage: (message: string | Uint8Array) => Promise<SignMessageResult>
  /** Current status */
  status: Exclude<TransactionStatus, 'sending' | 'confirming' | 'confirmed'> | 'signed'
  /** The last result */
  result: SignMessageResult | null
  /** The last error */
  error: Error | null
  /** Whether signing is in progress */
  isLoading: boolean
  /** Reset state */
  reset: () => void
}

/**
 * Sign an arbitrary message with the connected wallet.
 * Useful for authentication (sign-in with Solana / SIWS).
 *
 * @example
 * ```tsx
 * const { signMessage, result, isLoading } = useSignMessage()
 *
 * const handleAuth = async () => {
 *   const { signatureBase58 } = await signMessage('Sign in to wankmi')
 *   // Send signatureBase58 to your backend for verification
 * }
 * ```
 */
export function useSignMessage(): UseSignMessageReturn {
  const { wallet } = useWankmiContext()
  const [status, setStatus] = useState<UseSignMessageReturn['status']>('idle')
  const [result, setResult] = useState<SignMessageResult | null>(null)
  const [error, setError] = useState<Error | null>(null)

  const reset = useCallback(() => {
    setStatus('idle')
    setResult(null)
    setError(null)
  }, [])

  const signMessage = useCallback(
    async (message: string | Uint8Array): Promise<SignMessageResult> => {
      if (!wallet?.connected) {
        throw new Error('Wallet not connected.')
      }
      if (!wallet.signMessage) {
        throw new Error(`${wallet.name} does not support message signing.`)
      }

      setError(null)
      setStatus('signing')

      try {
        const encoded =
          typeof message === 'string'
            ? new TextEncoder().encode(message)
            : message

        const signature = await wallet.signMessage(encoded)
        const signatureBase58 = bs58.encode(signature)

        const res: SignMessageResult = { signature, signatureBase58 }
        setResult(res)
        setStatus('signed')
        return res
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err))
        setError(e)
        setStatus('error')
        throw e
      }
    },
    [wallet]
  )

  return {
    signMessage,
    status,
    result,
    error,
    isLoading: status === 'signing',
    reset,
  }
}
