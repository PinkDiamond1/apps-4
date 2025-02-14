import * as React from 'react'
import { LoadBoundary } from '../../../components/LoadBoundary'
import { PageWithSideBar } from '../../../components/PageWithSideBar'
import { PoolDetailOverview } from '../../Pool/Overview'
import { IssuerPoolHeader } from '../Header'

export const IssuerPoolOverviewPage: React.FC = () => {
  return (
    <PageWithSideBar>
      <IssuerPoolHeader />
      <LoadBoundary>
        <PoolDetailOverview />
      </LoadBoundary>
    </PageWithSideBar>
  )
}
