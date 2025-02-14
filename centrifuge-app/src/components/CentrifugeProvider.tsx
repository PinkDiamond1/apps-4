import Centrifuge from '@centrifuge/centrifuge-js'
import * as React from 'react'
import { config } from '../config'
import { fetchLambda } from '../utils/fetchLambda'

const CentrifugeContext = React.createContext<Centrifuge>(null as any)

export const CentrifugeProvider: React.FC = ({ children }) => {
  const ctx = React.useMemo(
    () =>
      new Centrifuge({
        network: config.network,
        kusamaWsUrl: import.meta.env.REACT_APP_RELAY_WSS_URL as string,
        polkadotWsUrl: import.meta.env.REACT_APP_RELAY_WSS_URL as string,
        altairWsUrl: import.meta.env.REACT_APP_COLLATOR_WSS_URL as string,
        centrifugeWsUrl: import.meta.env.REACT_APP_COLLATOR_WSS_URL as string,
        printExtrinsics: import.meta.env.NODE_ENV === 'development',
        centrifugeSubqueryUrl: import.meta.env.REACT_APP_SUBQUERY_URL as string,
        altairSubqueryUrl: import.meta.env.REACT_APP_SUBQUERY_URL as string,
        metadataHost: import.meta.env.REACT_APP_IPFS_GATEWAY as string,
        pinFile: (b64URI) =>
          fetchLambda('pinFile', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ uri: b64URI }),
          }),
        unpinFile: (hash) =>
          fetchLambda('unpinFile', {
            method: 'DELETE',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ hash }),
          }),
      }),
    []
  )

  return <CentrifugeContext.Provider value={ctx}>{children}</CentrifugeContext.Provider>
}

export function useCentrifuge() {
  const ctx = React.useContext(CentrifugeContext)
  if (!ctx) throw new Error('useCentrifuge must be used within CentrifugeProvider')
  return ctx
}
