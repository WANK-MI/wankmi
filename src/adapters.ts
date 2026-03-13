/**
 * Wallet adapter implementations for wankmi.
 *
 * Import from '@wankmi/wankmi/adapters':
 *   import { PhantomAdapter, BackpackAdapter, SolflareAdapter } from '@wankmi/wankmi/adapters'
 */

import { Connection, PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js'
import type { WalletAdapter, WalletEvent, SendTransactionOptions } from './types'

// ─── Event emitter ────────────────────────────────────────────────────────────

type Listener = () => void

class WalletEventEmitter {
  private listeners: Partial<Record<WalletEvent, Listener[]>> = {}

  on(event: WalletEvent, listener: Listener): void {
    if (!this.listeners[event]) this.listeners[event] = []
    this.listeners[event]!.push(listener)
  }

  off(event: WalletEvent, listener: Listener): void {
    this.listeners[event] = this.listeners[event]?.filter((l) => l !== listener) ?? []
  }

  protected emit(event: WalletEvent): void {
    this.listeners[event]?.forEach((l) => l())
  }
}

// ─── Base adapter ─────────────────────────────────────────────────────────────

abstract class BaseWalletAdapter extends WalletEventEmitter implements WalletAdapter {
  abstract name: string
  abstract icon: string
  abstract url: string

  publicKey: PublicKey | null = null
  connected = false
  connecting = false
  disconnecting = false

  abstract connect(): Promise<void>
  abstract disconnect(): Promise<void>
  abstract signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T>
  abstract signAllTransactions<T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]>
  abstract signMessage(message: Uint8Array): Promise<Uint8Array>

  async sendTransaction(
    transaction: Transaction | VersionedTransaction,
    connection: Connection,
    options?: SendTransactionOptions
  ): Promise<string> {
    const signed = await this.signTransaction(transaction)
    const serialized = signed.serialize()
    return connection.sendRawTransaction(serialized, {
      skipPreflight: options?.skipPreflight ?? false,
      preflightCommitment: options?.preflightCommitment ?? 'confirmed',
      maxRetries: options?.maxRetries ?? 3,
    })
  }

  /** Call after a successful connect — sets state and fires event */
  protected handleConnect(publicKey: PublicKey): void {
    this.publicKey = publicKey
    this.connected = true
    this.connecting = false
    this.emit('connect')
  }

  /** Call after a successful disconnect — clears state and fires event */
  protected handleDisconnect(): void {
    this.publicKey = null
    this.connected = false
    this.disconnecting = false
    this.emit('disconnect')
  }

  /** Call on any wallet error — fires event */
  protected handleError(): void {
    this.connecting = false
    this.disconnecting = false
    this.emit('error')
  }
}

// ─── Phantom ──────────────────────────────────────────────────────────────────

interface PhantomProvider {
  publicKey: { toBytes(): Uint8Array; toBase58(): string } | null
  isConnected: boolean
  connect(opts?: { onlyIfTrusted?: boolean }): Promise<{ publicKey: { toBase58(): string } }>
  disconnect(): Promise<void>
  signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T>
  signAllTransactions<T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]>
  signMessage(msg: Uint8Array): Promise<{ signature: Uint8Array }>
  signAndSendTransaction(tx: Transaction | VersionedTransaction): Promise<{ signature: string }>
}

function getPhantomProvider(): PhantomProvider | null {
  if (typeof window === 'undefined') return null
  const win = window as unknown as { solana?: PhantomProvider & { isPhantom?: boolean } }
  return win.solana?.isPhantom ? win.solana : null
}

export class PhantomAdapter extends BaseWalletAdapter {
  name = 'Phantom'
  icon = 'https://www.phantom.app/img/logo.png'
  url = 'https://phantom.app'

  private get provider(): PhantomProvider {
    const p = getPhantomProvider()
    if (!p) throw new Error('Phantom wallet not found. Install it at https://phantom.app')
    return p
  }

  async connect(): Promise<void> {
    this.connecting = true
    try {
      const res = await this.provider.connect()
      this.handleConnect(new PublicKey(res.publicKey.toBase58()))
    } catch (err) {
      this.handleError()
      throw err
    }
  }

  async disconnect(): Promise<void> {
    this.disconnecting = true
    try {
      await this.provider.disconnect()
      this.handleDisconnect()
    } catch (err) {
      this.handleError()
      throw err
    }
  }

  async signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T> {
    return this.provider.signTransaction(tx)
  }

  async signAllTransactions<T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]> {
    return this.provider.signAllTransactions(txs)
  }

  async signMessage(message: Uint8Array): Promise<Uint8Array> {
    const { signature } = await this.provider.signMessage(message)
    return signature
  }
}

// ─── Backpack ─────────────────────────────────────────────────────────────────

export class BackpackAdapter extends BaseWalletAdapter {
  name = 'Backpack'
  icon = 'https://backpack.app/icon.png'
  url = 'https://backpack.app'

  private get provider() {
    const win = window as unknown as {
      backpack?: { solana?: PhantomProvider; isBackpack?: boolean }
    }
    if (!win.backpack?.isBackpack || !win.backpack.solana) {
      throw new Error('Backpack wallet not found. Install it at https://backpack.app')
    }
    return win.backpack.solana
  }

  async connect(): Promise<void> {
    this.connecting = true
    try {
      const res = await this.provider.connect()
      this.handleConnect(new PublicKey(res.publicKey.toBase58()))
    } catch (err) {
      this.handleError()
      throw err
    }
  }

  async disconnect(): Promise<void> {
    this.disconnecting = true
    try {
      await this.provider.disconnect()
      this.handleDisconnect()
    } catch (err) {
      this.handleError()
      throw err
    }
  }

  async signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T> {
    return this.provider.signTransaction(tx)
  }

  async signAllTransactions<T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]> {
    return this.provider.signAllTransactions(txs)
  }

  async signMessage(message: Uint8Array): Promise<Uint8Array> {
    const { signature } = await this.provider.signMessage(message)
    return signature
  }
}

// ─── Solflare ─────────────────────────────────────────────────────────────────

export class SolflareAdapter extends BaseWalletAdapter {
  name = 'Solflare'
  icon = 'https://solflare.com/icon.png'
  url = 'https://solflare.com'

  private get provider() {
    const win = window as unknown as { solflare?: PhantomProvider & { isSolflare?: boolean } }
    if (!win.solflare?.isSolflare) {
      throw new Error('Solflare wallet not found. Install it at https://solflare.com')
    }
    return win.solflare
  }

  async connect(): Promise<void> {
    this.connecting = true
    try {
      const res = await this.provider.connect()
      this.handleConnect(new PublicKey(res.publicKey.toBase58()))
    } catch (err) {
      this.handleError()
      throw err
    }
  }

  async disconnect(): Promise<void> {
    this.disconnecting = true
    try {
      await this.provider.disconnect()
      this.handleDisconnect()
    } catch (err) {
      this.handleError()
      throw err
    }
  }

  async signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T> {
    return this.provider.signTransaction(tx)
  }

  async signAllTransactions<T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]> {
    return this.provider.signAllTransactions(txs)
  }

  async signMessage(message: Uint8Array): Promise<Uint8Array> {
    const { signature } = await this.provider.signMessage(message)
    return signature
  }
}

export { BaseWalletAdapter }