import { useWankmiContext } from '../context/WankmiProvider'
import type { WalletAdapter } from '../types'

export interface UseWalletReturn {
  /** The currently selected wallet adapter, or null if none selected */
  wallet: WalletAdapter | null
  /** All registered wallet adapters */
  wallets: WalletAdapter[]
  /** The connected wallet's public key, or null */
  publicKey: import('@solana/web3.js').PublicKey | null
  /** Whether a wallet is currently connected */
  connected: boolean
  /** Whether a connection attempt is in progress */
  connecting: boolean
  /** Whether a disconnection is in progress */
  disconnecting: boolean
  /** Select a wallet by name before calling connect() */
  select: (walletName: string) => void
  /** Connect the selected wallet */
  connect: () => Promise<void>
  /** Disconnect the current wallet */
  disconnect: () => Promise<void>
  /** Sign a transaction — throws if wallet not connected */
  signTransaction: WalletAdapter['signTransaction'] | null
  /** Sign multiple transactions — throws if wallet not connected */
  signAllTransactions: WalletAdapter['signAllTransactions'] | null
  /** Sign an arbitrary message — throws if wallet not connected */
  signMessage: WalletAdapter['signMessage'] | null
}

/**
 * Access wallet connection state and actions.
 *
 * @example
 * ```tsx
 * const { publicKey, connected, connect, disconnect } = useWallet()
 *
 * if (!connected) {
 *   return <button onClick={connect}>Connect Wallet</button>
 * }
 *
 * return <div>{publicKey?.toBase58()}</div>
 * ```
 */
export function useWallet(): UseWalletReturn {
  const { wallet, wallets, connecting, disconnecting, connected, select, connect, disconnect } =
    useWankmiContext()

  return {
    wallet,
    wallets,
    publicKey: wallet?.publicKey ?? null,
    connected,
    connecting,
    disconnecting,
    select,
    connect,
    disconnect,
    signTransaction: wallet ? wallet.signTransaction.bind(wallet) : null,
    signAllTransactions: wallet ? wallet.signAllTransactions.bind(wallet) : null,
    signMessage: wallet ? wallet.signMessage.bind(wallet) : null,
  }
}
