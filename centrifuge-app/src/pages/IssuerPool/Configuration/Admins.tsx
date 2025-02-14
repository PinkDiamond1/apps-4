import { isSameAddress, PoolRoles } from '@centrifuge/centrifuge-js'
import { Button, Checkbox, Grid, IconMinusCircle, SearchInput, Shelf, Stack, Text } from '@centrifuge/fabric'
import Identicon from '@polkadot/react-identicon'
import { encodeAddress } from '@polkadot/util-crypto'
import { Field, FieldArray, Form, FormikProvider, useFormik } from 'formik'
import * as React from 'react'
import { useParams } from 'react-router'
import { ButtonGroup } from '../../../components/ButtonGroup'
import { useCentrifuge } from '../../../components/CentrifugeProvider'
import { DataTable } from '../../../components/DataTable'
import { Identity } from '../../../components/Identity'
import { PageSection } from '../../../components/PageSection'
import { Tooltips } from '../../../components/Tooltips'
import { useWeb3 } from '../../../components/Web3Provider'
import { useCentrifugeTransaction } from '../../../utils/useCentrifugeTransaction'
import { usePoolPermissions } from '../../../utils/usePools'
import { truncate } from '../../../utils/web3'

type AdminRole = 'PoolAdmin' | 'Borrower' | 'PricingAdmin' | 'LiquidityAdmin' | 'MemberListAdmin' | 'LoanAdmin'

type Admin = {
  address: string
  roles: { [key in AdminRole]?: boolean }
}
type PoolMetadataInput = {
  search: string
  admins: Admin[]
}
type Row = Admin & { index: number }

export const Admins: React.FC = () => {
  const { pid: poolId } = useParams<{ pid: string }>()
  const poolPermissions = usePoolPermissions(poolId)
  const [isEditing, setIsEditing] = React.useState(false)
  const { selectedAccount } = useWeb3()
  const me = selectedAccount?.address && encodeAddress(selectedAccount?.address)

  const initialValues: PoolMetadataInput = React.useMemo(
    () => ({
      search: '',
      admins: poolPermissions
        ? Object.entries<PoolRoles>(poolPermissions)
            .filter(([, p]) => p.roles.length)
            .map(([userAddress, permissions]) => ({
              address: encodeAddress(userAddress),
              roles: Object.fromEntries(permissions.roles.map((role) => [role, true])) as Admin['roles'],
            }))
        : [],
    }),
    [poolPermissions]
  )

  const { execute, isLoading } = useCentrifugeTransaction('Update admins', (cent) => cent.pools.updatePoolRoles, {
    onSuccess: () => {
      setIsEditing(false)
    },
  })

  const form = useFormik({
    initialValues,
    onSubmit: (values, actions) => {
      actions.setSubmitting(false)
      if (!add.length && !remove.length) {
        setIsEditing(false)
        return
      }
      execute([poolId, add, remove])
    },
  })

  React.useEffect(() => {
    if (isEditing && !isLoading) return
    form.resetForm()
    form.setValues(initialValues, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValues, isEditing])

  const rows = React.useMemo(
    () => form.values.admins.map((a, i) => ({ ...a, index: i })).sort((a, b) => a.address.localeCompare(b.address)),
    [form.values.admins]
  )

  const { add, remove } = React.useMemo(
    () => diffPermissions(initialValues.admins, form.values.admins),
    [initialValues, form.values]
  )

  const poolAdminCount = rows.filter((r) => r.roles.PoolAdmin).length

  return (
    <FormikProvider value={form}>
      <Form>
        <PageSection
          title="Admins"
          subtitle="At least one address is required"
          headerRight={
            isEditing ? (
              <ButtonGroup variant="small">
                <Button variant="secondary" onClick={() => setIsEditing(false)} small>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  small
                  loading={isLoading}
                  loadingMessage={isLoading ? 'Pending...' : undefined}
                  key="done"
                  disabled={!add.length && !remove.length}
                >
                  Done
                </Button>
              </ButtonGroup>
            ) : (
              <Button variant="secondary" onClick={() => setIsEditing(true)} small key="edit">
                Edit
              </Button>
            )
          }
        >
          <FieldArray name="admins">
            {(fldArr) => (
              <Stack gap={3}>
                <DataTable
                  data={rows}
                  columns={[
                    {
                      align: 'left',
                      header: 'Address',
                      cell: (row: Admin) => (
                        <Text variant="body2">
                          <Identity address={row.address} clickToCopy labelForConnectedAddress={false} />{' '}
                          {row.address === me && `(${selectedAccount?.name || 'you'})`}
                        </Text>
                      ),
                      flex: '3',
                    },
                    {
                      align: 'center',
                      header: <Tooltips type="pool" variant="secondary" />,
                      cell: (row: Row) => (
                        <Field
                          name={`admins.${row.index}.roles.PoolAdmin`}
                          as={Checkbox}
                          type="checkbox"
                          disabled={!isEditing || isLoading || (poolAdminCount === 1 && row.roles.PoolAdmin)}
                        />
                      ),
                      flex: '2',
                    },
                    {
                      align: 'center',
                      header: <Tooltips type="borrower" variant="secondary" />,
                      cell: (row: Row) => (
                        <Field
                          name={`admins.${row.index}.roles.Borrower`}
                          as={Checkbox}
                          type="checkbox"
                          disabled={!isEditing || isLoading}
                        />
                      ),
                      flex: '2',
                    },
                    {
                      align: 'center',
                      header: <Tooltips type="pricing" variant="secondary" />,
                      cell: (row: Row) => (
                        <Field
                          name={`admins.${row.index}.roles.PricingAdmin`}
                          as={Checkbox}
                          type="checkbox"
                          disabled={!isEditing || isLoading}
                        />
                      ),
                      flex: '2',
                    },
                    {
                      align: 'center',
                      header: <Tooltips type="whitelist" variant="secondary" />,
                      cell: (row: Row) => (
                        <Field
                          name={`admins.${row.index}.roles.MemberListAdmin`}
                          as={Checkbox}
                          type="checkbox"
                          disabled={!isEditing || isLoading}
                        />
                      ),
                      flex: '2',
                    },
                    {
                      align: 'center',
                      header: <Tooltips type="asset" variant="secondary" />,
                      cell: (row: Row) => (
                        <Field
                          name={`admins.${row.index}.roles.LoanAdmin`}
                          as={Checkbox}
                          type="checkbox"
                          disabled={!isEditing || isLoading}
                        />
                      ),
                      flex: '2',
                    },
                    {
                      align: 'center',
                      header: <Tooltips type="liquidity" variant="secondary" />,
                      cell: (row: Row) => (
                        <Field
                          name={`admins.${row.index}.roles.LiquidityAdmin`}
                          as={Checkbox}
                          type="checkbox"
                          disabled={!isEditing || isLoading}
                        />
                      ),
                      flex: '2',
                    },
                    {
                      header: '',
                      cell: (row: Row) =>
                        isEditing && (
                          <Button
                            variant="tertiary"
                            icon={IconMinusCircle}
                            onClick={() => fldArr.remove(row.index)}
                            disabled={isLoading || (poolAdminCount === 1 && row.roles.PoolAdmin)}
                          />
                        ),
                      flex: '0 0 72px',
                    },
                  ]}
                />
                {isEditing && (
                  <Grid columns={2} equalColumns gap={4} alignItems="center">
                    <Field as={SearchInput} name="search" placeholder="Search to add address..." disabled={isLoading} />
                    {form.values.search && !isLoading && (
                      <SearchResult
                        address={form.values.search}
                        existingAddresses={form.values.admins.map((a) => a.address)}
                        onAdd={() => {
                          fldArr.push({ address: form.values.search, roles: {} })
                          form.setFieldValue('search', '', false)
                        }}
                      />
                    )}
                  </Grid>
                )}
              </Stack>
            )}
          </FieldArray>
        </PageSection>
      </Form>
    </FormikProvider>
  )
}

const SearchResult: React.FC<{ address: string; onAdd: () => void; existingAddresses: string[] }> = ({
  address,
  onAdd,
  existingAddresses,
}) => {
  const cent = useCentrifuge()
  let truncated
  try {
    truncated = truncate(cent.utils.formatAddress(address))
  } catch (e) {
    //
  }

  if (!truncated) {
    return (
      <Text variant="label2" color="statusCritical">
        Invalid address
      </Text>
    )
  }

  const exists = existingAddresses.some((addr) => isSameAddress(addr, address))

  return (
    <Shelf gap={2}>
      <Shelf style={{ pointerEvents: 'none' }} gap="4px">
        <Identicon value={address} size={16} theme="polkadot" />
        <Text variant="label2" color="textPrimary">
          {truncated}
        </Text>
      </Shelf>
      <Button variant="secondary" onClick={onAdd} small disabled={exists}>
        Add address
      </Button>
      {exists && (
        <Text variant="label2" color="statusCritical">
          Already added
        </Text>
      )}
    </Shelf>
  )
}

const roles = ['PoolAdmin', 'Borrower', 'PricingAdmin', 'LiquidityAdmin', 'MemberListAdmin', 'LoanAdmin']

function diffPermissions(storedValues: Admin[], formValues: Admin[]) {
  const storedObj = Object.fromEntries(storedValues.map((admin) => [admin.address, admin.roles]))
  const formObj = Object.fromEntries(formValues.map((admin) => [admin.address, admin.roles]))
  const addresses = [...new Set(storedValues.map((a) => a.address).concat(formValues.map((a) => a.address)))]

  const add: [string, AdminRole][] = []
  const remove: [string, AdminRole][] = []

  addresses.forEach((addr) => {
    roles.forEach((role) => {
      const stored = !!storedObj[addr]?.[role as AdminRole]
      const value = !!formObj[addr]?.[role as AdminRole]
      if (stored !== value) {
        if (value) {
          add.push([addr, role as AdminRole])
        } else {
          remove.push([addr, role as AdminRole])
        }
      }
    })
  })

  return {
    add,
    remove,
  }
}
