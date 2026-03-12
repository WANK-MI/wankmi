# wankmi 🟢

> Reactive React hooks for building Solana dApps.

[![npm version](https://img.shields.io/npm/v/wankmi)](https://www.npmjs.com/package/wankmi)
[![license](https://img.shields.io/npm/l/wankmi)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)

Wallets, balances, tokens, transactions — all the hooks you need, none of the boilerplate. Built from scratch for Solana's account model. Not an Ethereum port.

---

## Install

```bash
npm install wankmi
# or
pnpm add wankmi
# or
yarn add wankmi
```

---

## Quick start

Wrap your app with `WankmiProvider`:

```tsx
import { WankmiProvider } from 'wankmi'
import { PhantomAdapter } from 'wankmi/adapters'

const config = {
  network: 'mainnet-beta',
  wallets: [new PhantomAdapter()],
  autoConnect: true,
}

function App() {
  return (
    <WankmiProvider config={config}>
      <YourApp />
    </WankmiProvider>
  )
}
```

Then use hooks anywhere in your tree:

```tsx
import { useWallet, useSolBalance } from 'wankmi'

function Dashboard() {
  const { publicKey, connected, connect } = useWallet()
  const { data: balance } = useSolBalance({ watch: true })

  if (!connected) {
    return <button onClick={connect}>Connect Wallet</button>
  }

  return (
    <div>
      <p>{publicKey?.toBase58()}</p>
      <p>{balance?.formatted}</p>
    </div>
  )
}
```

---

## Hooks

### Core

| Hook | Description |
|---|---|
| `useWallet()` | Wallet connection state, publicKey, connect/disconnect |
| `useConnection()` | The active `Connection` instance |

### Balances & Tokens

| Hook | Description |
|---|---|
| `useSolBalance(options)` | SOL balance, optionally reactive via WebSocket |
| `useTokenAccounts(options)` | All SPL token accounts for an address |
| `useMint(options)` | Mint info (decimals, supply, authorities) |

### Transactions

| Hook | Description |
|---|---|
| `useSendTransaction()` | Build, sign, send and confirm transactions |
| `useSignMessage()` | Sign arbitrary messages (e.g. SIWS auth) |

---

## API Reference

### `useWallet()`

```ts
const {
  wallet,           // WalletAdapter | null
  wallets,          // WalletAdapter[]
  publicKey,        // PublicKey | null
  connected,        // boolean
  connecting,       // boolean
  disconnecting,    // boolean
  select,           // (name: string) => void
  connect,          // () => Promise<void>
  disconnect,       // () => Promise<void>
  signTransaction,  // WalletAdapter['signTransaction'] | null
  signAllTransactions,
  signMessage,
} = useWallet()
```

### `useSolBalance(options)`

```ts
const { data, isLoading, isError, refetch } = useSolBalance({
  address?: PublicKey | string,  // defaults to connected wallet
  watch?: boolean,               // WebSocket subscription (default: false)
  refetchInterval?: number,
  enabled?: boolean,
})

// data: { lamports: bigint, sol: number, formatted: string }
```

### `useTokenAccounts(options)`

```ts
const { data, isLoading } = useTokenAccounts({
  address?: PublicKey | string,
  mint?: PublicKey | string,     // filter to a specific mint
  enabled?: boolean,
})

// data: TokenAccount[]
// TokenAccount: { mint, address, amount, decimals, uiAmount, formatted }
```

### `useMint(options)`

```ts
const { data } = useMint({
  mint: PublicKey | string,
})

// data: { address, decimals, supply, mintAuthority, freezeAuthority, isInitialized }
```

### `useSendTransaction()`

```ts
const { sendTransaction, status, signature, isLoading, error, reset } = useSendTransaction()

// status: 'idle' | 'signing' | 'sending' | 'confirming' | 'confirmed' | 'error'

const { signature } = await sendTransaction(transaction, {
  skipPreflight?: boolean,
  preflightCommitment?: 'processed' | 'confirmed' | 'finalized',
  maxRetries?: number,
})
```

### `useSignMessage()`

```ts
const { signMessage, result, isLoading } = useSignMessage()

const { signature, signatureBase58 } = await signMessage('Sign in to my dApp')
```

---

## Wallet Adapters

```ts
import { PhantomAdapter, BackpackAdapter, SolflareAdapter } from 'wankmi/adapters'
```

---

## WankmiProvider Config

```ts
interface WankmiConfig {
  network: 'mainnet-beta' | 'devnet' | 'testnet' | 'localnet'
  endpoint?: string | { http: string; ws?: string }  // custom RPC
  wallets: WalletAdapter[]
  autoConnect?: boolean      // default: false
  staleTime?: number         // TanStack Query stale time, default: 30_000ms
  commitment?: 'processed' | 'confirmed' | 'finalized'  // default: 'confirmed'
}
```

---

## License

MIT
