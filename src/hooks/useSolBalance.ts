import { useEffect, useRef } from 'react'
import { PublicKey } from '@solana/web3.js'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useWankmiContext } from '../context/WankmiProvider'
import { formatSolBalance, queryKeys } from '../utils'
import type { SolBalance } from '../types'

export interface UseSolBalanceOptions {
  /** Address to fetch balance for. Defaults to connected wallet. */
  address?: PublicKey | string | null
  /**
   * Subscribe to real-time balance changes via WebSocket.
   * @default false
   */
  watch?: boolean
  /** Override the refetch interval in ms. Set to false to disable. */
  refetchInterval?: number | false
  /** Whether the query is enabled. Useful for conditional fetching. */
  enabled?: boolean
}

export interface UseSolBalanceReturn {
  data: SolBalance | undefined
  isLoading: boolean
  isFetching: boolean
  isError: boolean
  error: Error | null
  refetch: () => void
}

/**
 * Fetch and optionally watch the SOL balance of an address.
 *
 * @example
 * ```tsx
 * const { publicKey } = useWallet()
 * const { data: balance, isLoading } = useSolBalance({ address: publicKey, watch: true })
 *
 * return <div>{isLoading ? '...' : balance?.formatted}</div>
 * ```
 */
export function useSolBalance({
  address,
  watch = false,
  refetchInterval,
  enabled = true,
}: UseSolBalanceOptions = {}): UseSolBalanceReturn {
  const { connection, wallet } = useWankmiContext()
  const queryClient = useQueryClient()
  const subscriptionRef = useRef<number | null>(null)

  // Resolve address: explicit > connected wallet > null
  const resolvedAddress = address
    ? typeof address === 'string'
      ? new PublicKey(address)
      : address
    : wallet?.publicKey ?? null

  const queryKey = resolvedAddress ? queryKeys.solBalance(resolvedAddress) : null

  const query = useQuery({
    queryKey: queryKey ?? ['wankmi', 'solBalance', null],
    queryFn: async () => {
      if (!resolvedAddress) throw new Error('No address provided')
      const lamports = await connection.getBalance(resolvedAddress)
      return formatSolBalance(BigInt(lamports))
    },
    enabled: enabled && !!resolvedAddress,
    refetchInterval: refetchInterval !== undefined ? refetchInterval : watch ? 30_000 : false,
  })

  // WebSocket subscription for real-time updates
  useEffect(() => {
    if (!watch || !resolvedAddress || !queryKey) return

    subscriptionRef.current = connection.onAccountChange(
      resolvedAddress,
      (accountInfo) => {
        const balance = formatSolBalance(BigInt(accountInfo.lamports))
        queryClient.setQueryData(queryKey, balance)
      },
      'confirmed'
    )

    return () => {
      if (subscriptionRef.current !== null) {
        connection.removeAccountChangeListener(subscriptionRef.current)
        subscriptionRef.current = null
      }
    }
  }, [watch, resolvedAddress?.toBase58(), connection]) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    data: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error as Error | null,
    refetch: query.refetch,
  }
}
