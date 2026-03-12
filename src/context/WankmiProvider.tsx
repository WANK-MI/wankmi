import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Connection } from '@solana/web3.js'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { WalletAdapter, WankmiConfig } from '../types'
import { resolveEndpoint } from '../utils'

// ─── Context shape ───────────────────────────────────────────────────────────

interface WankmiContextValue {
  connection: Connection
  config: WankmiConfig
  // Wallet state
  wallet: WalletAdapter | null
  wallets: WalletAdapter[]
  connecting: boolean
  disconnecting: boolean
  connected: boolean
  // Wallet actions
  select: (walletName: string) => void
  connect: () => Promise<void>
  disconnect: () => Promise<void>
}

const WankmiContext = createContext<WankmiContextValue | null>(null)

// ─── Provider ────────────────────────────────────────────────────────────────

interface WankmiProviderProps {
  config: WankmiConfig
  children: React.ReactNode
  /** Optionally bring your own QueryClient */
  queryClient?: QueryClient
}

function createDefaultQueryClient(staleTime: number) {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime,
        retry: 2,
        refetchOnWindowFocus: false,
      },
    },
  })
}

export function WankmiProvider({ config, children, queryClient: externalQC }: WankmiProviderProps) {
  const { network, endpoint, wallets, autoConnect = false, staleTime = 30_000, commitment = 'confirmed' } = config

  // Stable QueryClient
  const qcRef = useRef<QueryClient>(externalQC ?? createDefaultQueryClient(staleTime))

  // Connection
  const connection = useMemo(() => {
    const { http, ws } = resolveEndpoint(network, endpoint)
    return new Connection(http, { commitment, wsEndpoint: ws })
  }, [network, endpoint, commitment])

  // Wallet state
  const [selectedWalletName, setSelectedWalletName] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)

  const wallet = useMemo(
    () => wallets.find((w) => w.name === selectedWalletName) ?? null,
    [wallets, selectedWalletName]
  )

  const connected = wallet?.connected ?? false

  const select = useCallback((walletName: string) => {
    setSelectedWalletName(walletName)
  }, [])

  const connect = useCallback(async () => {
    if (!wallet) throw new Error('No wallet selected. Call select() first.')
    if (wallet.connected || connecting) return
    setConnecting(true)
    try {
      await wallet.connect()
    } finally {
      setConnecting(false)
    }
  }, [wallet, connecting])

  const disconnect = useCallback(async () => {
    if (!wallet) return
    setDisconnecting(true)
    try {
      await wallet.disconnect()
    } finally {
      setDisconnecting(false)
    }
  }, [wallet])

  // Auto-connect on mount if wallet was previously connected
  useEffect(() => {
    if (autoConnect && wallet && !wallet.connected && !connecting) {
      connect().catch(() => {
        // Silently fail — user hasn't interacted yet
      })
    }
  }, [autoConnect, wallet]) // eslint-disable-line react-hooks/exhaustive-deps

  const value = useMemo<WankmiContextValue>(
    () => ({
      connection,
      config,
      wallet,
      wallets,
      connecting,
      disconnecting,
      connected,
      select,
      connect,
      disconnect,
    }),
    [connection, config, wallet, wallets, connecting, disconnecting, connected, select, connect, disconnect]
  )

  return (
    <QueryClientProvider client={qcRef.current}>
      <WankmiContext.Provider value={value}>{children}</WankmiContext.Provider>
    </QueryClientProvider>
  )
}

// ─── Internal hook ───────────────────────────────────────────────────────────

export function useWankmiContext(): WankmiContextValue {
  const ctx = useContext(WankmiContext)
  if (!ctx) {
    throw new Error(
      '`useWankmiContext` must be used inside <WankmiProvider>. ' +
      'Make sure you have wrapped your app with <WankmiProvider config={...}>.'
    )
  }
  return ctx
}
