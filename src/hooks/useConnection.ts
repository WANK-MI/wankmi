import type { Connection } from '@solana/web3.js'
import { useWankmiContext } from '../context/WankmiProvider'
import type { SolanaNetwork } from '../types'

export interface UseConnectionReturn {
  /** The active @solana/web3.js Connection instance */
  connection: Connection
  /** The configured network */
  network: SolanaNetwork
}

/**
 * Access the active Solana Connection instance.
 *
 * @example
 * ```tsx
 * const { connection } = useConnection()
 * const slot = await connection.getSlot()
 * ```
 */
export function useConnection(): UseConnectionReturn {
  const { connection, config } = useWankmiContext()
  return { connection, network: config.network }
}
