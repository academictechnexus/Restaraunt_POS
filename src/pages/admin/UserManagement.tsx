import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Profile, UserRole } from '@/types/database'
import { Users, UserCheck, Shield, UserX } from 'lucide-react'
import clsx from 'clsx'
import toast from 'react-hot-toast'

const roleConfig = {
  admin:   { label: 'Admin',   icon: Shield,    color: 'bg-purple-50 text-purple-700 border-purple-200' },
  manager: { label: 'Manager', icon: UserCheck, color: 'bg-blue-50 text-blue-700 border-blue-200' },
  cashier: { label: 'Cashier', icon: Users,     color: 'bg-green-50 text-green-700 border-green-200' },
}

export default function UserManagement() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ email: '', password: '', full_name: '', role: 'cashier' as UserRole, phone: '' })
  const [adding, setAdding] = useState(false)

  async function load() {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
    setProfiles(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function addUser() {
    if (!form.email || !form.password || !form.full_name) { toast.error('Fill all required fields'); return }
    setAdding(true)
    try {
      const { data, error } = await supabase.auth.admin.createUser({
        email: form.email,
        password: form.password,
        email_confirm: true,
        user_metadata: { full_name: form.full_name, role: form.role }
      })
      if (error) throw error
      // Update profile
      if (data.user) {
        await supabase.from('profiles').update({ full_name: form.full_name, role: form.role, phone: form.phone || null }).eq('id', data.user.id)
      }
      toast.success(`${form.full_name} added as ${form.role}!`)
      setForm({ email: '', password: '', full_name: '', role: 'cashier', phone: '' })
      setShowAdd(false)
      load()
    } catch (err: any) {
      toast.error(err.message || 'Failed to create user')
    } finally {
      setAdding(false)
    }
  }

  async function updateRole(id: string, role: UserRole) {
    const { error } = await supabase.from('profiles').update({ role }).eq('id', id)
    if (error) { toast.error('Failed'); return }
    toast.success('Role updated!'); load()
  }

  async function toggleActive(profile: Profile) {
    const { error } = await supabase.from('profiles').update({ is_active: !profile.is_active }).eq('id', profile.id)
    if (error) { toast.error('Failed'); return }
    toast.success(profile.is_active ? 'Staff deactivated' : 'Staff activated'); load()
  }

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Staff Management</h1>
          <p className="text-sm text-gray-500">{profiles.filter(p => p.is_active).length} active staff</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary">
          + Add Staff
        </button>
      </div>

      {/* Role summary */}
      <div className="grid grid-cols-3 gap-3">
        {(['admin', 'manager', 'cashier'] as UserRole[]).map(role => {
          const cfg = roleConfig[role]
          const count = profiles.filter(p => p.role === role && p.is_active).length
          return (
            <div key={role} className={clsx('card-pad border', cfg.color)}>
              <p className="text-lg font-bold">{count}</p>
              <p className="text-xs mt-0.5">{cfg.label}s</p>
            </div>
          )
        })}
      </div>

      {/* Add staff form */}
      {showAdd && (
        <div className="card-pad space-y-3">
          <p className="font-semibold text-gray-900">Add Staff Member</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="label">Full Name *</label>
              <input className="input" placeholder="Staff member name" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} />
            </div>
            <div>
              <label className="label">Email *</label>
              <input className="input" type="email" placeholder="staff@restaurant.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" type="tel" placeholder="9876543210" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <label className="label">Password *</label>
              <input className="input" type="password" placeholder="Min 6 characters" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
            </div>
            <div>
              <label className="label">Role *</label>
              <select className="input" value={form.role} onChange={e => setForm({ ...form, role: e.target.value as UserRole })}>
                <option value="cashier">Cashier</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={addUser} disabled={adding} className="btn-primary flex-1">
              {adding ? 'Creating...' : 'Create Account'}
            </button>
            <button onClick={() => setShowAdd(false)} className="btn-secondary flex-1">Cancel</button>
          </div>
          <p className="text-xs text-gray-400">Staff will log in with this email and password at the same URL.</p>
        </div>
      )}

      {/* Staff list */}
      {loading ? (
        <div className="space-y-3">{Array(4).fill(0).map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-2xl animate-pulse" />)}</div>
      ) : (
        <div className="card overflow-hidden divide-y divide-gray-50">
          {profiles.map(profile => {
            const cfg = roleConfig[profile.role]
            return (
              <div key={profile.id} className={clsx('flex items-center gap-3 px-4 py-3', !profile.is_active && 'opacity-50')}>
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-700 text-sm flex-shrink-0">
                  {profile.full_name?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 truncate">{profile.full_name}</p>
                    {!profile.is_active && <span className="text-xs text-red-500">(Inactive)</span>}
                  </div>
                  {profile.phone && <p className="text-xs text-gray-400">{profile.phone}</p>}
                </div>
                <select
                  value={profile.role}
                  onChange={e => updateRole(profile.id, e.target.value as UserRole)}
                  className={clsx('text-xs px-2 py-1.5 rounded-lg border font-medium cursor-pointer', cfg.color)}
                >
                  <option value="cashier">Cashier</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
                <button onClick={() => toggleActive(profile)} className={clsx('p-1.5 rounded-lg transition-colors', profile.is_active ? 'text-gray-300 hover:text-red-500 hover:bg-red-50' : 'text-gray-300 hover:text-green-600 hover:bg-green-50')}>
                  <UserX className="w-4 h-4" />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
