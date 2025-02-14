import Centrifuge, { TransactionOptions } from '@centrifuge/centrifuge-js'
import { ISubmittableResult } from '@polkadot/types/types'
import { WalletAccount } from '@subwallet/wallet-connect/types'
import * as React from 'react'
import { lastValueFrom, Observable } from 'rxjs'
import { useCentrifuge } from '../components/CentrifugeProvider'
import { Transaction, useTransaction, useTransactions } from '../components/TransactionsProvider'
import { useWeb3 } from '../components/Web3Provider'
import { PalletError } from './errors'

type TxOptions = Pick<TransactionOptions, 'createType'>

export function useCentrifugeTransaction<T extends Array<any>>(
  title: string,
  transactionCallback: (centrifuge: Centrifuge) => (args: T, options?: TransactionOptions) => Observable<any>,
  options: { onSuccess?: (args: T, result: ISubmittableResult) => void; onError?: (error: any) => void } = {}
) {
  const { addOrUpdateTransaction, updateTransaction } = useTransactions()
  const { selectedAccount, connect, proxy } = useWeb3()
  const cent = useCentrifuge()
  const [lastId, setLastId] = React.useState<string | undefined>(undefined)
  const lastCreatedTransaction = useTransaction(lastId)
  const pendingTransaction = React.useRef<{ id: string; args: T; options?: TxOptions }>()

  async function doTransaction(selectedAccount: WalletAccount, id: string, args: T, txOptions?: TxOptions) {
    try {
      const connectedCent = cent.connect(selectedAccount?.address, selectedAccount?.signer as any)
      if (proxy) {
        connectedCent.setProxy(proxy.delegator)
      }
      const api = await cent.getApiPromise()

      const transaction = transactionCallback(connectedCent)

      updateTransaction(id, { status: 'unconfirmed' })

      let txError: any = null
      const lastResult = await lastValueFrom(
        transaction(args, {
          ...txOptions,
          onStatusChange: (result) => {
            const errors = result.events.filter(({ event }) => {
              const possibleProxyErr = event.data[0]?.toHuman()
              return (
                api.events.system.ExtrinsicFailed.is(event) ||
                (api.events.proxy.ProxyExecuted.is(event) &&
                  possibleProxyErr &&
                  typeof possibleProxyErr === 'object' &&
                  'Err' in possibleProxyErr)
              )
            })
            let errorObject: any

            if (result.dispatchError || errors.length) {
              let errorMessage = 'Transaction failed'
              txError = result.dispatchError || errors[0]
              if (errors.length) {
                const error = errors[0].event.data[0] as any
                if (error.isModule) {
                  // for module errors, we have the section indexed, lookup
                  const decoded = api.registry.findMetaError(error.asModule)
                  const { section, method, docs } = decoded
                  errorObject = new PalletError(section, method)
                  errorMessage = errorObject.message || errorMessage
                  console.error(`${section}.${method}: ${docs.join(' ')}`)
                } else {
                  // Other, CannotLookup, BadOrigin, no extra info
                  console.error(error)
                }
              }

              updateTransaction(id, (prev) => ({
                status: 'failed',
                failedReason: errorMessage,
                error: errorObject,
                dismissed: prev.status === 'failed' && prev.dismissed,
              }))
            } else if (result.status.isInBlock || result.status.isFinalized) {
              updateTransaction(id, (prev) =>
                prev.status === 'failed'
                  ? {}
                  : { status: 'succeeded', dismissed: prev.status === 'succeeded' && prev.dismissed }
              )
            } else {
              updateTransaction(id, { status: 'pending', hash: result.status.hash.toHex() })
            }
          },
        })
      )

      if (txError) {
        options.onError?.(txError)
      } else {
        options.onSuccess?.(args, lastResult)
      }
    } catch (e) {
      console.error(e)

      updateTransaction(id, { status: 'failed', failedReason: (e as Error).message })
      options.onError?.(e)
    }
  }

  function execute(args: T, options?: TxOptions, idOverride?: string) {
    const id = idOverride ?? Math.random().toString(36).substr(2)
    const tx: Transaction = {
      id,
      title,
      status: 'creating',
      args,
    }
    addOrUpdateTransaction(tx)
    setLastId(id)

    if (!selectedAccount) {
      pendingTransaction.current = { id, args, options }
      connect().catch((e) => {
        updateTransaction(id, { status: 'failed', failedReason: e.message })
      })
    } else {
      doTransaction(selectedAccount, id, args, options)
    }
    return id
  }

  React.useEffect(() => {
    if (pendingTransaction.current) {
      const { id, args, options } = pendingTransaction.current
      pendingTransaction.current = undefined

      if (selectedAccount) {
        doTransaction(selectedAccount, id, args, options)
      } else {
        updateTransaction(id, { status: 'failed', failedReason: 'No accounts available' })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccount])

  return {
    execute,
    lastCreatedTransaction,
    reset: () => setLastId(undefined),
    isLoading: lastCreatedTransaction
      ? ['creating', 'unconfirmed', 'pending'].includes(lastCreatedTransaction.status)
      : false,
  }
}
