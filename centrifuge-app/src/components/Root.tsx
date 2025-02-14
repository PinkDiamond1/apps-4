import { FabricProvider, GlobalStyle as FabricGlobalStyle } from '@centrifuge/fabric'
import * as React from 'react'
import { Helmet, HelmetProvider } from 'react-helmet-async'
import { QueryClient, QueryClientProvider } from 'react-query'
import { BrowserRouter as Router, Redirect, Route, Switch } from 'react-router-dom'
import { config } from '../config'
import { AccountNFTsPage } from '../pages/AccountNFTs'
import { CollectionPage } from '../pages/Collection'
import { CollectionsPage } from '../pages/Collections'
import { CreateLoanFromNFTPage } from '../pages/CreateLoanFromNFT'
import { IssuerCreatePoolPage } from '../pages/IssuerCreatePool'
import { IssuerPoolPage } from '../pages/IssuerPool'
import { IssuerCreateLoanPage } from '../pages/IssuerPool/Assets/CreateLoan'
import { LoanPage } from '../pages/Loan'
import { MintNFTPage } from '../pages/MintNFT'
import { NFTPage } from '../pages/NFT'
import { NotFoundPage } from '../pages/NotFound'
import { OnboardingPage } from '../pages/Onboarding'
import { PoolDetailPage } from '../pages/Pool'
import { PoolsPage } from '../pages/Pools'
import { TokenOverviewPage } from '../pages/Tokens'
import { CentrifugeProvider } from './CentrifugeProvider'
import { DebugFlags, initialFlagsState } from './DebugFlags'
import { DemoBanner } from './DemoBanner'
import { GlobalStyle } from './GlobalStyle'
import { LoadBoundary } from './LoadBoundary'
import { PodAuthProvider } from './PodAuthProvider'
import { TransactionProvider } from './TransactionsProvider'
import { TransactionToasts } from './TransactionToasts'
import { Web3Provider } from './Web3Provider'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
    },
  },
})

export const Root: React.VFC = () => {
  const [isThemeToggled, setIsThemeToggled] = React.useState(!!initialFlagsState.alternativeTheme)

  return (
    <>
      <HelmetProvider>
        <Helmet>
          <title>{config.network === 'centrifuge' ? 'Centrifuge App' : 'Altair App'}</title>
        </Helmet>
      </HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <FabricProvider
          theme={
            !isThemeToggled
              ? config.themes[config.defaultTheme]
              : config.defaultTheme === 'dark'
              ? config.themes.light
              : config.themes.dark
          }
        >
          <GlobalStyle />
          <FabricGlobalStyle />
          <CentrifugeProvider>
            <DemoBanner />
            <Web3Provider>
              <PodAuthProvider>
                <DebugFlags onChange={(state) => setIsThemeToggled(!!state.alternativeTheme)}>
                  <TransactionProvider>
                    <TransactionToasts />
                    <Router>
                      <LoadBoundary>
                        <Routes />
                      </LoadBoundary>
                    </Router>
                  </TransactionProvider>
                </DebugFlags>
              </PodAuthProvider>
            </Web3Provider>
          </CentrifugeProvider>
        </FabricProvider>
      </QueryClientProvider>
    </>
  )
}

const Routes: React.VFC = () => {
  return (
    <Switch>
      <Route path="/nfts/collection/:cid/object/mint">
        <MintNFTPage />
      </Route>
      <Route path="/nfts/collection/:cid/object/:nftid/new-asset">
        <CreateLoanFromNFTPage />
      </Route>
      <Route path="/nfts/collection/:cid/object/:nftid">
        <NFTPage />
      </Route>
      <Route path="/nfts/collection/:cid">
        <CollectionPage />
      </Route>
      <Route path="/nfts/account">
        <AccountNFTsPage />
      </Route>
      <Route path="/nfts">
        <CollectionsPage />
      </Route>
      <Route path="/issuer/create-pool">
        <IssuerCreatePoolPage />
      </Route>
      <Route path="/issuer/:pid/assets/create">
        <IssuerCreateLoanPage />
      </Route>
      <Route exact path="/issuer/:pid/assets/:aid">
        <LoanPage />
      </Route>
      <Route path="/issuer/:pid">
        <IssuerPoolPage />
      </Route>
      <Route path="/investments/:pid/assets/:aid">
        <LoanPage />
      </Route>
      <Route path="/investments/tokens">
        <TokenOverviewPage />
      </Route>
      <Route path="/investments/:pid">
        <PoolDetailPage />
      </Route>
      <Route path="/investments">
        <PoolsPage />
      </Route>
      <Route exact path="/onboarding">
        <OnboardingPage />
      </Route>
      <Route exact path="/">
        <Redirect to="/investments" />
      </Route>
      <Route>
        <NotFoundPage />
      </Route>
    </Switch>
  )
}
