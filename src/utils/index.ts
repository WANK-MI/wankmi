import { PublicKey } from '@solana/web3.js'
import type { SolBalance, SolanaEndpoint, SolanaNetwork } from '../types'

// ─── Lamport / SOL conversion ─────────────────────────────────────────────────

const LAMPORTS_PER_SOL = 1_000_000_000n

export function lamportsToSol(lamports: bigint): number {
  return Number(lamports) / Number(LAMPORTS_PER_SOL)
}

export function solToLamports(sol: number): bigint {
  return BigInt(Math.round(sol * Number(LAMPORTS_PER_SOL)))
}

export function formatSolBalance(lamports: bigint): SolBalance {
  const sol = lamportsToSol(lamports)
  return {
    lamports,
    sol,
    formatted: `${sol.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    })} SOL`,
  }
}

// ─── Token formatting ─────────────────────────────────────────────────────────

export function formatTokenAmount(amount: bigint, decimals: number): string {
  const divisor = Math.pow(10, decimals)
  const value = Number(amount) / divisor
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  })
}

// ─── RPC endpoints ────────────────────────────────────────────────────────────

const DEFAULT_ENDPOINTS: Record<SolanaNetwork, string> = {
  'mainnet-beta': 'https://api.mainnet-beta.solana.com',
  devnet: 'https://api.devnet.solana.com',
  testnet: 'https://api.testnet.solana.com',
  localnet: 'http://localhost:8899',
}

export function resolveEndpoint(
  network: SolanaNetwork,
  endpoint?: SolanaEndpoint
): { http: string; ws: string } {
  if (!endpoint) {
    const http = DEFAULT_ENDPOINTS[network] ?? DEFAULT_ENDPOINTS['mainnet-beta']!
    return { http, ws: http.replace('https', 'wss').replace('http', 'ws') }
  }
  if (typeof endpoint === 'string') {
    return {
      http: endpoint,
      ws: endpoint.replace('https', 'wss').replace('http', 'ws'),
    }
  }
  return {
    http: endpoint.http,
    ws: endpoint.ws ?? endpoint.http.replace('https', 'wss').replace('http', 'ws'),
  }
}

// ─── Public key helpers ───────────────────────────────────────────────────────

export function toPublicKey(address: string | PublicKey): PublicKey {
  if (address instanceof PublicKey) return address
  return new PublicKey(address)
}

export function isValidPublicKey(address: string): boolean {
  try {
    new PublicKey(address)
    return true
  } catch {
    return false
  }
}

export function shortenAddress(address: string | PublicKey, chars = 4): string {
  const str = address instanceof PublicKey ? address.toBase58() : address
  return `${str.slice(0, chars)}...${str.slice(-chars)}`
}

// ─── Query key factories ──────────────────────────────────────────────────────

export const queryKeys = {
  solBalance: (address: string | PublicKey) =>
    ['wankmi', 'solBalance', address instanceof PublicKey ? address.toBase58() : address] as const,

  // ✅ FIXED: mint is now part of the key so filtered/unfiltered queries
  // don't share the same cache entry
  tokenAccounts: (address: string | PublicKey, mint?: PublicKey) =>
    [
      'wankmi',
      'tokenAccounts',
      address instanceof PublicKey ? address.toBase58() : address,
      mint?.toBase58() ?? null,
    ] as const,

  mintInfo: (mint: string | PublicKey) =>
    ['wankmi', 'mint', mint instanceof PublicKey ? mint.toBase58() : mint] as const,
}