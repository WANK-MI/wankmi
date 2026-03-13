import type { Connection, PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js'

// ─── Network ─────────────────────────────────────────────────────────────────

export type SolanaNetwork = 'mainnet-beta' | 'devnet' | 'testnet' | 'localnet'
export type SolanaEndpoint = string | { http: string; ws?: string }

// ─── Wallet ──────────────────────────────────────────────────────────────────

export type WalletName = string
export type WalletEvent = 'connect' | 'disconnect' | 'error'

export interface WalletAdapter {
  name: WalletName
  icon: string
  url: string
  publicKey: PublicKey | null
  connected: boolean
  connecting: boolean
  disconnecting: boolean
  connect(): Promise<void>
  disconnect(): Promise<void>
  signTransaction<T extends Transaction | VersionedTransaction>(transaction: T): Promise<T>
  signAllTransactions<T extends Transaction | VersionedTransaction>(transactions: T[]): Promise<T[]>
  signMessage(message: Uint8Array): Promise<Uint8Array>
  sendTransaction(
    transaction: Transaction | VersionedTransaction,
    connection: Connection,
    options?: SendTransactionOptions
  ): Promise<string>
  // Event emitter — required for reactive connected state in WankmiProvider
  on(event: WalletEvent, listener: () => void): void
  off(event: WalletEvent, listener: () => void): void
}

export interface SendTransactionOptions {
  signers?: Array<{ publicKey: PublicKey; secretKey: Uint8Array }>
  preflightCommitment?: 'processed' | 'confirmed' | 'finalized'
  skipPreflight?: boolean
  maxRetries?: number
}

// ─── Balances ────────────────────────────────────────────────────────────────

export interface SolBalance {
  /** Raw lamports */
  lamports: bigint
  /** SOL value as a number */
  sol: number
  /** Formatted string e.g. "4.206942 SOL" */
  formatted: string
}

// ─── Tokens ──────────────────────────────────────────────────────────────────

export interface TokenAccount {
  /** The SPL token mint address */
  mint: PublicKey
  /** The token account address */
  address: PublicKey
  /** Raw token amount */
  amount: bigint
  /** Decimals for this mint */
  decimals: number
  /** Human-readable amount */
  uiAmount: number | null
  /** Formatted string */
  formatted: string
}

export interface MintInfo {
  address: PublicKey
  decimals: number
  supply: bigint
  mintAuthority: PublicKey | null
  freezeAuthority: PublicKey | null
  isInitialized: boolean
}

// ─── Transactions ────────────────────────────────────────────────────────────

export type TransactionStatus =
  | 'idle'
  | 'signing'
  | 'sending'
  | 'confirming'
  | 'confirmed'
  | 'error'

export interface SendTransactionResult {
  signature: string
  blockhash: string
  lastValidBlockHeight: number
}

export interface SignMessageResult {
  signature: Uint8Array
  /** Base58 encoded signature */
  signatureBase58: string
}

// ─── Config ──────────────────────────────────────────────────────────────────

export interface WankmiConfig {
  network: SolanaNetwork
  endpoint?: SolanaEndpoint
  wallets: WalletAdapter[]
  autoConnect?: boolean
  /** TanStack Query stale time in ms. Default: 30_000 */
  staleTime?: number
  /** Commitment level. Default: 'confirmed' */
  commitment?: 'processed' | 'confirmed' | 'finalized'
}