// ─── Provider ────────────────────────────────────────────────────────────────
export { WankmiProvider } from './context/WankmiProvider'

// ─── Core hooks ──────────────────────────────────────────────────────────────
export { useWallet } from './hooks/useWallet'
export { useConnection } from './hooks/useConnection'
export { useSolBalance } from './hooks/useSolBalance'

// ─── Token hooks ─────────────────────────────────────────────────────────────
export { useTokenAccounts } from './hooks/useTokenAccounts'
export { useMint } from './hooks/useMint'

// ─── Transaction hooks ───────────────────────────────────────────────────────
export { useSendTransaction } from './hooks/useSendTransaction'
export { useSignMessage } from './hooks/useSignMessage'

// ─── Types ───────────────────────────────────────────────────────────────────
export type {
  WankmiConfig,
  SolanaNetwork,
  SolanaEndpoint,
  WalletAdapter,
  WalletName,
  SolBalance,
  TokenAccount,
  MintInfo,
  TransactionStatus,
  SendTransactionOptions,
  SendTransactionResult,
  SignMessageResult,
} from './types'

// ─── Utils (public) ──────────────────────────────────────────────────────────
export {
  lamportsToSol,
  solToLamports,
  formatSolBalance,
  formatTokenAmount,
  shortenAddress,
  isValidPublicKey,
  toPublicKey,
} from './utils'
