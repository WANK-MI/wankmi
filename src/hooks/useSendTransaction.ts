import { useCallback, useState } from 'react'
import {
  Transaction,
  VersionedTransaction,
  TransactionMessage,
  PublicKey,
  type BlockhashWithExpiryBlockHeight,
} from '@solana/web3.js'
import { useWankmiContext } from '../context/WankmiProvider'
import type { SendTransactionOptions, SendTransactionResult, TransactionStatus } from '../types'

export interface UseSendTransactionReturn {
  /** Send a transaction. Returns the signature on success. */
  sendTransaction: (
    transaction: Transaction | VersionedTransaction,
    options?: SendTransactionOptions
  ) => Promise<SendTransactionResult>
  /** Current status of the in-flight transaction */
  status: TransactionStatus
  /** The last successful transaction signature */
  signature: string | null
  /** The last error, if any */
  error: Error | null
  /** Whether a transaction is currently in-flight */
  isLoading: boolean
  /** Reset status/error back to idle */
  reset: () => void
}

/**
 * Send a Solana transaction with automatic blockhash, signing, and confirmation.
 *
 * @example
 * ```tsx
 * const { sendTransaction, isLoading, signature } = useSendTransaction()
 *
 * const handleTransfer = async () => {
 *   const tx = new Transaction().add(
 *     SystemProgram.transfer({ fromPubkey, toPubkey, lamports: 1_000_000n })
 *   )
 *   const { signature } = await sendTransaction(tx)
 *   console.log('Confirmed:', signature)
 * }
 * ```
 */
export function useSendTransaction(): UseSendTransactionReturn {
  const { connection, wallet } = useWankmiContext()
  const [status, setStatus] = useState<TransactionStatus>('idle')
  const [signature, setSignature] = useState<string | null>(null)
  const [error, setError] = useState<Error | null>(null)

  const reset = useCallback(() => {
    setStatus('idle')
    setSignature(null)
    setError(null)
  }, [])

  const sendTransaction = useCallback(
    async (
      transaction: Transaction | VersionedTransaction,
      options: SendTransactionOptions = {}
    ): Promise<SendTransactionResult> => {
      if (!wallet?.connected) {
        throw new Error('Wallet not connected. Call connect() before sending transactions.')
      }

      setError(null)
      setStatus('signing')

      try {
        // Get a fresh blockhash
        const { blockhash, lastValidBlockHeight }: BlockhashWithExpiryBlockHeight =
          await connection.getLatestBlockhash(options.preflightCommitment ?? 'confirmed')

        // Inject blockhash into legacy Transaction
        if (transaction instanceof Transaction) {
          transaction.recentBlockhash = blockhash
          transaction.feePayer = transaction.feePayer ?? wallet.publicKey ?? undefined

          if (options.signers?.length) {
            transaction.partialSign(...(options.signers as Parameters<Transaction['partialSign']>))
          }
        }

        setStatus('sending')

        const sig = await wallet.sendTransaction(transaction, connection, {
          skipPreflight: options.skipPreflight ?? false,
          preflightCommitment: options.preflightCommitment ?? 'confirmed',
          maxRetries: options.maxRetries ?? 3,
        })

        setStatus('confirming')

        await connection.confirmTransaction(
          { signature: sig, blockhash, lastValidBlockHeight },
          'confirmed'
        )

        setSignature(sig)
        setStatus('confirmed')

        return { signature: sig, blockhash, lastValidBlockHeight }
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err))
        setError(e)
        setStatus('error')
        throw e
      }
    },
    [wallet, connection]
  )

  return {
    sendTransaction,
    status,
    signature,
    error,
    isLoading: status === 'signing' || status === 'sending' || status === 'confirming',
    reset,
  }
}
