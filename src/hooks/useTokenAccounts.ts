import { PublicKey } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { useQuery } from '@tanstack/react-query'
import { useWankmiContext } from '../context/WankmiProvider'
import { formatTokenAmount, queryKeys } from '../utils'
import type { TokenAccount } from '../types'

export interface UseTokenAccountsOptions {
  /** Address to fetch token accounts for. Defaults to connected wallet. */
  address?: PublicKey | string | null
  /** Filter to a specific mint address */
  mint?: PublicKey | string
  /** Whether the query is enabled */
  enabled?: boolean
  /** Refetch interval in ms */
  refetchInterval?: number | false
}

export interface UseTokenAccountsReturn {
  data: TokenAccount[] | undefined
  isLoading: boolean
  isFetching: boolean
  isError: boolean
  error: Error | null
  refetch: () => void
}

/**
 * Fetch all SPL token accounts owned by an address.
 *
 * @example
 * ```tsx
 * const { publicKey } = useWallet()
 * const { data: tokens } = useTokenAccounts({ address: publicKey })
 *
 * return (
 *   <ul>
 *     {tokens?.map(t => (
 *       <li key={t.address.toBase58()}>
 *         {t.mint.toBase58()}: {t.formatted}
 *       </li>
 *     ))}
 *   </ul>
 * )
 * ```
 */
export function useTokenAccounts({
  address,
  mint,
  enabled = true,
  refetchInterval = false,
}: UseTokenAccountsOptions = {}): UseTokenAccountsReturn {
  const { connection, wallet } = useWankmiContext()

  const resolvedAddress = address
    ? typeof address === 'string'
      ? new PublicKey(address)
      : address
    : wallet?.publicKey ?? null

  const resolvedMint = mint
    ? typeof mint === 'string'
      ? new PublicKey(mint)
      : mint
    : undefined

  const query = useQuery({
    queryKey: queryKeys.tokenAccounts(resolvedAddress ?? 'null'),
    queryFn: async (): Promise<TokenAccount[]> => {
      if (!resolvedAddress) throw new Error('No address provided')

      const response = await connection.getParsedTokenAccountsByOwner(
        resolvedAddress,
        resolvedMint
          ? { mint: resolvedMint }
          : { programId: TOKEN_PROGRAM_ID }
      )

      return response.value.map((item) => {
        const info = item.account.data.parsed.info
        const tokenAmount = info.tokenAmount

        return {
          mint: new PublicKey(info.mint as string),
          address: item.pubkey,
          amount: BigInt(tokenAmount.amount as string),
          decimals: tokenAmount.decimals as number,
          uiAmount: tokenAmount.uiAmount as number | null,
          formatted: formatTokenAmount(
            BigInt(tokenAmount.amount as string),
            tokenAmount.decimals as number
          ),
        }
      })
    },
    enabled: enabled && !!resolvedAddress,
    refetchInterval,
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
