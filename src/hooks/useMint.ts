import { PublicKey } from '@solana/web3.js'
import { getMint } from '@solana/spl-token'
import { useQuery } from '@tanstack/react-query'
import { useWankmiContext } from '../context/WankmiProvider'
import { queryKeys } from '../utils'
import type { MintInfo } from '../types'

export interface UseMintOptions {
  /** The mint address to fetch info for */
  mint: PublicKey | string | null | undefined
  enabled?: boolean
  refetchInterval?: number | false
}

export interface UseMintReturn {
  data: MintInfo | undefined
  isLoading: boolean
  isFetching: boolean
  isError: boolean
  error: Error | null
  refetch: () => void
}

/**
 * Fetch metadata for an SPL token mint.
 *
 * @example
 * ```tsx
 * const { data: mintInfo } = useMint({ mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' })
 * // USDC on mainnet
 *
 * return <div>Decimals: {mintInfo?.decimals}</div>
 * ```
 */
export function useMint({ mint, enabled = true, refetchInterval = false }: UseMintOptions): UseMintReturn {
  const { connection } = useWankmiContext()

  const resolvedMint = mint
    ? typeof mint === 'string'
      ? new PublicKey(mint)
      : mint
    : null

  const query = useQuery({
    queryKey: queryKeys.mintInfo(resolvedMint ?? 'null'),
    queryFn: async (): Promise<MintInfo> => {
      if (!resolvedMint) throw new Error('No mint address provided')

      const raw = await getMint(connection, resolvedMint)

      return {
        address: resolvedMint,
        decimals: raw.decimals,
        supply: raw.supply,
        mintAuthority: raw.mintAuthority ?? null,
        freezeAuthority: raw.freezeAuthority ?? null,
        isInitialized: raw.isInitialized,
      }
    },
    enabled: enabled && !!resolvedMint,
    refetchInterval,
    // Mint info rarely changes — cache for 5 minutes
    staleTime: 5 * 60 * 1000,
  })

  return {
    data: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error as Error | null,
    refetch: query.refetch,
  }
}
