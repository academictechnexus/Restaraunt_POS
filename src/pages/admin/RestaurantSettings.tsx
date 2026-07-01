import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Restaurant } from '@/types/database'
import { Save, Store } from 'lucide-react'
import toast from 'react-hot-toast'

export default function RestaurantSettings() {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [form, setForm] = useState({ name: '', address: '', phone: '', gstin: '', fssai: '', cgst_rate: 2.5, sgst_rate: 2.5 })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.from('restaurant').select('*').single().then(({ data }) => {
      if (data) { setRestaurant(data); setForm({ name: data.name, address: data.address || '', phone: data.phone || '', gstin: data.gstin || '', fssai: data.fssai || '', cgst_rate: data.cgst_rate, sgst_rate: data.sgst_rate }) }
    })
  }, [])

  async function save() {
    if (!form.name.trim()) { toast.error('Restaurant name required'); return }
    setSaving(true)
    const { error } = await supabase.from('restaurant').update(form).eq('id', restaurant!.id)
    setSaving(false)
    if (error) { toast.error('Failed to save'); return }
    toast.success('Settings saved!')
  }

  const F = ({ label, field, placeholder, type = 'text' }: { label: string; field: keyof typeof form; placeholder?: string; type?: string }) => (
    <div>
      <label className="label">{label}</label>
      <input className="input" type={type} placeholder={placeholder} value={String(form[field])}
        onChange={e => setForm({ ...form, [field]: type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value })} />
    </div>
  )

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
          <Store className="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Restaurant Settings</h1>
          <p className="text-sm text-gray-500">Update your restaurant details</p>
        </div>
      </div>

      <div className="card-pad space-y-4">
        <p className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2">Basic Information</p>
        <F label="Restaurant Name *" field="name" placeholder="My Restaurant" />
        <F label="Address" field="address" placeholder="123 Main Street, City" />
        <F label="Phone Number" field="phone" placeholder="+91 98765 43210" />
      </div>

      <div className="card-pad space-y-4">
        <p className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2">Tax & Compliance</p>
        <F label="GSTIN" field="gstin" placeholder="27AAPFU0939F1ZV" />
        <F label="FSSAI License Number" field="fssai" placeholder="10220022000015" />
        <div className="grid grid-cols-2 gap-3">
          <F label="CGST Rate (%)" field="cgst_rate" type="number" placeholder="2.5" />
          <F label="SGST Rate (%)" field="sgst_rate" type="number" placeholder="2.5" />
        </div>
        <div className="bg-blue-50 rounded-xl p-3 text-sm text-blue-700">
          <p className="font-medium">Total GST = CGST + SGST</p>
          <p className="text-xs mt-0.5 text-blue-600">Standard for restaurants: 2.5% + 2.5% = 5% GST</p>
        </div>
      </div>

      <button onClick={save} disabled={saving} className="btn-primary btn-lg w-full">
        <Save className="w-5 h-5" />
        {saving ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  )
}
