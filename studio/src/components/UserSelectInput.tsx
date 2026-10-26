import {set, unset, useUserListWithPermissions, type StringInputProps} from 'sanity'
import {Select, Spinner} from '@sanity/ui'

/** Picks a project member and stores their account-global Sanity user ID (what workflows assign to). */
export function UserSelectInput(props: StringInputProps) {
  const {onChange, value, elementProps} = props
  const {data: users, loading} = useUserListWithPermissions({
    documentValue: null,
    permission: 'update',
  })

  if (loading) return <Spinner muted />
  const members = (users ?? []).filter((user) => user.sanityUserId)

  return (
    <Select
      {...elementProps}
      value={value ?? ''}
      onChange={(event) => {
        const id = event.currentTarget.value
        onChange(id ? set(id) : unset())
      }}
    >
      <option value="">Choose a person…</option>
      {members.map((user) => (
        <option key={user.sanityUserId} value={user.sanityUserId}>
          {user.displayName ?? user.email ?? user.id}
        </option>
      ))}
      {value && !members.some((user) => user.sanityUserId === value) && (
        <option value={value}>{value}</option>
      )}
    </Select>
  )
}
