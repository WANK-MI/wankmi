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

// ─── Context shape ────────────────────────────────────────────────────────────

interface WankmiContextValue {
  connection: Connection
  config: WankmiConfig
  wallet: WalletAdapter | null
  wallets: WalletAdapter[]
  connecting: boolean
  disconnecting: boolean
  connected: boolean
  select: (walletName: string) => void
  connect: () => Promise<void>
  disconnect: () => Promise<void>
}

const WankmiContext = createContext<WankmiContextValue | null>(null)

// ─── Provider ─────────────────────────────────────────────────────────────────

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
  const {
    network,
    endpoint,
    wallets,
    autoConnect = false,
    staleTime = 30_000,
    commitment = 'confirmed',
  } = config

  const qcRef = useRef<QueryClient>(externalQC ?? createDefaultQueryClient(staleTime))

  const connection = useMemo(() => {
    const { http, ws } = resolveEndpoint(network, endpoint)
    return new Connection(http, { commitment, wsEndpoint: ws })
  }, [network, endpoint, commitment])

  const [selectedWalletName, setSelectedWalletName] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  // ✅ FIXED: React owns connected state — updated via adapter events, not
  // by reading wallet.connected directly (which React can't observe)
  const [connected, setConnected] = useState(false)

  const wallet = useMemo(
    () => wallets.find((w) => w.name === selectedWalletName) ?? null,
    [wallets, selectedWalletName]
  )

  // ✅ FIXED: Subscribe to adapter events so connected flips reactively
  useEffect(() => {
    if (!wallet) {
      setConnected(false)
      return
    }

    // Sync immediately in case adapter was already connected (e.g. autoConnect)
    setConnected(wallet.connected)

    const onConnect = () => setConnected(true)
    const onDisconnect = () => setConnected(false)
    const onError = () => setConnected(false)

    wallet.on('connect', onConnect)
    wallet.on('disconnect', onDisconnect)
    wallet.on('error', onError)

    return () => {
      wallet.off('connect', onConnect)
      wallet.off('disconnect', onDisconnect)
      wallet.off('error', onError)
    }
  }, [wallet])

  const select = useCallback((walletName: string) => {
    setSelectedWalletName(walletName)
  }, [])

  const connect = useCallback(async () => {
    if (!wallet) throw new Error('No wallet selected. Call select() first.')
    if (connected || connecting) return
    setConnecting(true)
    try {
      await wallet.connect()
      // connected state is set by the 'connect' event listener above,
      // not here — keeps the source of truth in one place
    } finally {
      setConnecting(false)
    }
  }, [wallet, connected, connecting])

  const disconnect = useCallback(async () => {
    if (!wallet) return
    setDisconnecting(true)
    try {
      await wallet.disconnect()
      // disconnected state is set by the 'disconnect' event listener above
    } finally {
      setDisconnecting(false)
    }
  }, [wallet])

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect && wallet && !connected && !connecting) {
      connect().catch(() => {
        // Silently fail — user hasn't interacted yet, browser may block popup
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

// ─── Internal hook ────────────────────────────────────────────────────────────

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
