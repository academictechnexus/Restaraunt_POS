import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Category, MenuItem, FoodType } from '@/types/database'
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight, ChevronDown, ChevronRight, UtensilsCrossed } from 'lucide-react'
import clsx from 'clsx'
import toast from 'react-hot-toast'

const foodTypeOptions: { value: FoodType; label: string; color: string }[] = [
  { value: 'veg',     label: '🟢 Veg',      color: 'text-green-700 bg-green-50 border-green-200' },
  { value: 'non_veg', label: '🔴 Non-Veg',  color: 'text-red-700 bg-red-50 border-red-200' },
  { value: 'egg',     label: '🟡 Egg',       color: 'text-yellow-700 bg-yellow-50 border-yellow-200' },
]

export default function MenuManagement() {
  const [categories, setCategories] = useState<Category[]>([])
  const [items, setItems] = useState<MenuItem[]>([])
  const [expandedCat, setExpandedCat] = useState<string | null>(null)
  const [showCatForm, setShowCatForm] = useState(false)
  const [showItemForm, setShowItemForm] = useState<string | null>(null) // category id
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [catName, setCatName] = useState('')
  const [itemForm, setItemForm] = useState({ name: '', description: '', price: '', food_type: 'veg' as FoodType })

  async function load() {
    const [catRes, itemRes] = await Promise.all([
      supabase.from('categories').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('menu_items').select('*').eq('is_active', true).order('sort_order')
    ])
    setCategories(catRes.data || [])
    setItems(itemRes.data || [])
  }

  useEffect(() => { load() }, [])

  async function addCategory() {
    if (!catName.trim()) { toast.error('Enter category name'); return }
    const { error } = await supabase.from('categories').insert({ name: catName.trim(), sort_order: categories.length + 1 })
    if (error) { toast.error('Failed'); return }
    toast.success('Category added!'); setCatName(''); setShowCatForm(false); load()
  }

  async function deleteCategory(id: string) {
    if (!confirm('Delete category and all its items?')) return
    await supabase.from('menu_items').update({ is_active: false }).eq('category_id', id)
    await supabase.from('categories').update({ is_active: false }).eq('id', id)
    toast.success('Deleted'); load()
  }

  async function saveItem(catId: string) {
    if (!itemForm.name.trim() || !itemForm.price) { toast.error('Fill required fields'); return }
    const payload = {
      category_id: catId,
      name: itemForm.name.trim(),
      description: itemForm.description.trim() || null,
      price: parseFloat(itemForm.price),
      food_type: itemForm.food_type,
      sort_order: items.filter(i => i.category_id === catId).length + 1,
    }
    if (editingItem) {
      const { error } = await supabase.from('menu_items').update(payload).eq('id', editingItem.id)
      if (error) { toast.error('Failed'); return }
      toast.success('Item updated!')
    } else {
      const { error } = await supabase.from('menu_items').insert(payload)
      if (error) { toast.error('Failed'); return }
      toast.success('Item added!')
    }
    setItemForm({ name: '', description: '', price: '', food_type: 'veg' }); setShowItemForm(null); setEditingItem(null); load()
  }

  async function toggleItem(item: MenuItem) {
    await supabase.from('menu_items').update({ is_available: !item.is_available }).eq('id', item.id)
    load()
  }

  async function deleteItem(id: string) {
    if (!confirm('Delete this item?')) return
    await supabase.from('menu_items').update({ is_active: false }).eq('id', id)
    toast.success('Item deleted'); load()
  }

  function startEditItem(item: MenuItem, catId: string) {
    setEditingItem(item)
    setItemForm({ name: item.name, description: item.description || '', price: String(item.price), food_type: item.food_type })
    setShowItemForm(catId)
    setExpandedCat(catId)
  }

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Menu Management</h1>
          <p className="text-sm text-gray-500">{categories.length} categories · {items.length} items</p>
        </div>
        <button onClick={() => setShowCatForm(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Category
        </button>
      </div>

      {/* Add category form */}
      {showCatForm && (
        <div className="card-pad flex gap-2">
          <input className="input flex-1" placeholder="Category name (e.g. Starters)" value={catName} onChange={e => setCatName(e.target.value)} autoFocus onKeyDown={e => e.key === 'Enter' && addCategory()} />
          <button onClick={addCategory} className="btn-primary">Add</button>
          <button onClick={() => setShowCatForm(false)} className="btn-secondary">Cancel</button>
        </div>
      )}

      {/* Categories */}
      {categories.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <UtensilsCrossed className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No menu categories yet</p>
          <p className="text-sm mt-1">Add a category to start building your menu</p>
        </div>
      ) : (
        <div className="space-y-2">
          {categories.map(cat => {
            const catItems = items.filter(i => i.category_id === cat.id)
            const isExpanded = expandedCat === cat.id
            return (
              <div key={cat.id} className="card overflow-hidden">
                {/* Category header */}
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedCat(isExpanded ? null : cat.id)}
                >
                  {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                  <p className="font-semibold text-gray-900 flex-1">{cat.name}</p>
                  <span className="text-xs text-gray-400">{catItems.length} items</span>
                  <button onClick={e => { e.stopPropagation(); setShowItemForm(cat.id); setExpandedCat(cat.id); setEditingItem(null); setItemForm({ name: '', description: '', price: '', food_type: 'veg' }) }}
                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg">
                    <Plus className="w-4 h-4" />
                  </button>
                  <button onClick={e => { e.stopPropagation(); deleteCategory(cat.id) }}
                    className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Item form */}
                {isExpanded && showItemForm === cat.id && (
                  <div className="border-t border-gray-100 bg-blue-50/50 p-4 space-y-3">
                    <p className="text-sm font-medium text-blue-800">{editingItem ? 'Edit Item' : 'Add Item'}</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <label className="label">Item Name *</label>
                        <input className="input" placeholder="e.g. Butter Chicken" value={itemForm.name} onChange={e => setItemForm({ ...itemForm, name: e.target.value })} autoFocus />
                      </div>
                      <div>
                        <label className="label">Price (₹) *</label>
                        <input className="input" type="number" placeholder="0.00" value={itemForm.price} onChange={e => setItemForm({ ...itemForm, price: e.target.value })} />
                      </div>
                      <div>
                        <label className="label">Type</label>
                        <select className="input" value={itemForm.food_type} onChange={e => setItemForm({ ...itemForm, food_type: e.target.value as FoodType })}>
                          {foodTypeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="label">Description (optional)</label>
                        <input className="input" placeholder="Short description" value={itemForm.description} onChange={e => setItemForm({ ...itemForm, description: e.target.value })} />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => saveItem(cat.id)} className="btn-primary flex-1">
                        {editingItem ? 'Update Item' : 'Add Item'}
                      </button>
                      <button onClick={() => { setShowItemForm(null); setEditingItem(null) }} className="btn-secondary flex-1">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Items list */}
                {isExpanded && catItems.length > 0 && (
                  <div className="border-t border-gray-100 divide-y divide-gray-50">
                    {catItems.map(item => {
                      const typeConf = foodTypeOptions.find(o => o.value === item.food_type)
                      return (
                        <div key={item.id} className={clsx('flex items-center gap-3 px-4 py-3 transition-colors', !item.is_available && 'opacity-50')}>
                          <span className={clsx('text-xs px-2 py-0.5 rounded border font-medium', typeConf?.color)}>
                            {item.food_type === 'veg' ? '●' : item.food_type === 'non_veg' ? '●' : '●'}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                            {item.description && <p className="text-xs text-gray-400 truncate">{item.description}</p>}
                          </div>
                          <p className="font-bold text-gray-900 text-sm">₹{item.price}</p>
                          <button onClick={() => toggleItem(item)} className={clsx('p-1 rounded-lg', item.is_available ? 'text-green-600' : 'text-gray-300')}>
                            {item.is_available ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                          </button>
                          <button onClick={() => startEditItem(item, cat.id)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => deleteItem(item.id)} className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}

                {isExpanded && catItems.length === 0 && showItemForm !== cat.id && (
                  <div className="border-t border-gray-100 py-6 text-center text-gray-400 text-sm">
                    No items yet ·{' '}
                    <button onClick={() => { setShowItemForm(cat.id); setEditingItem(null) }} className="text-blue-600 font-medium">Add first item</button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
