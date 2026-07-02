// @ts-nocheck
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { DiningTable, TableStatus } from '@/types/database'
import { Plus, Edit2, Trash2, Table2 } from 'lucide-react'
import clsx from 'clsx'
import toast from 'react-hot-toast'

const sections = ['Main Hall', 'Terrace', 'Private Room', 'Bar', 'Outdoor']

export default function TableManagement() {
  const [tables, setTables] = useState<DiningTable[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<DiningTable | null>(null)
  const [form, setForm] = useState({ name: '', capacity: 4, section: 'Main Hall' })

  async function load() {
    const { data } = await supabase.from('dining_tables').select('*').eq('is_active', true).order('section').order('name')
    setTables(data || [])
  }

  useEffect(() => { load() }, [])

  async function save() {
    if (!form.name.trim()) { toast.error('Enter table name'); return }
    if (editing) {
      const { error } = await supabase.from('dining_tables').update(form).eq('id', editing.id)
      if (error) { toast.error('Failed'); return }
      toast.success('Table updated!')
    } else {
      const { error } = await supabase.from('dining_tables').insert({ ...form, status: 'available' })
      if (error) { toast.error('Failed'); return }
      toast.success('Table added!')
    }
    setForm({ name: '', capacity: 4, section: 'Main Hall' }); setShowForm(false); setEditing(null); load()
  }

  async function deleteTable(id: string) {
    if (!confirm('Delete this table?')) return
    await supabase.from('dining_tables').update({ is_active: false }).eq('id', id)
    toast.success('Table removed'); load()
  }

  async function setStatus(id: string, status: TableStatus) {
    await supabase.from('dining_tables').update({ status }).eq('id', id)
    load()
  }

  function startEdit(t: DiningTable) {
    setEditing(t); setForm({ name: t.name, capacity: t.capacity, section: t.section }); setShowForm(true)
  }

  const grouped = tables.reduce((acc, t) => {
    if (!acc[t.section]) acc[t.section] = []
    acc[t.section].push(t); return acc
  }, {} as Record<string, DiningTable[]>)

  const statusColors: Record<TableStatus, string> = {
    available: 'bg-green-100 text-green-700',
    occupied:  'bg-red-100 text-red-700',
    reserved:  'bg-yellow-100 text-yellow-700',
    cleaning:  'bg-blue-100 text-blue-700',
  }

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Table Management</h1>
          <p className="text-sm text-gray-500">{tables.length} tables across {Object.keys(grouped).length} sections</p>
        </div>
        <button onClick={() => { setEditing(null); setForm({ name: '', capacity: 4, section: 'Main Hall' }); setShowForm(true) }} className="btn-primary">
          <Plus className="w-4 h-4" /> Add Table
        </button>
      </div>

      {showForm && (
        <div className="card-pad space-y-3">
          <p className="font-semibold text-gray-900">{editing ? 'Edit Table' : 'Add Table'}</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Table Name/Number *</label>
              <input className="input" placeholder="e.g. T1, Table 5" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} autoFocus />
            </div>
            <div>
              <label className="label">Seating Capacity</label>
              <input className="input" type="number" min={1} max={50} value={form.capacity} onChange={e => setForm({ ...form, capacity: +e.target.value })} />
            </div>
            <div className="col-span-2">
              <label className="label">Section</label>
              <select className="input" value={form.section} onChange={e => setForm({ ...form, section: e.target.value })}>
                {sections.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={save} className="btn-primary flex-1">{editing ? 'Update' : 'Add Table'}</button>
            <button onClick={() => { setShowForm(false); setEditing(null) }} className="btn-secondary flex-1">Cancel</button>
          </div>
        </div>
      )}

      {tables.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Table2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No tables configured</p>
          <p className="text-sm mt-1">Add tables to set up your floor</p>
        </div>
      ) : (
        Object.entries(grouped).map(([section, sectionTables]) => (
          <div key={section} className="card overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
              <p className="font-semibold text-gray-700">{section}</p>
              <p className="text-xs text-gray-400">{sectionTables.length} tables</p>
            </div>
            <div className="divide-y divide-gray-50">
              {sectionTables.map(t => (
                <div key={t.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center font-bold text-gray-700 text-sm flex-shrink-0">
                    {t.name}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">{t.name}</p>
                    <p className="text-xs text-gray-400">{t.capacity} seats</p>
                  </div>
                  <select
                    value={t.status}
                    onChange={e => setStatus(t.id, e.target.value as TableStatus)}
                    className={clsx('text-xs px-2 py-1.5 rounded-lg border-0 font-medium cursor-pointer', statusColors[t.status])}
                  >
                    <option value="available">Available</option>
                    <option value="occupied">Occupied</option>
                    <option value="reserved">Reserved</option>
                    <option value="cleaning">Cleaning</option>
                  </select>
                  <button onClick={() => startEdit(t)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => deleteTable(t.id)} className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
