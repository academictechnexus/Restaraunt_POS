import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { DiningTable } from '@/types/database'
import { Users, Plus, RefreshCw } from 'lucide-react'
import clsx from 'clsx'
import toast from 'react-hot-toast'

const statusConfig = {
  available: { label: 'Available', bg: 'bg-green-50',  border: 'border-green-200', text: 'text-green-700',  dot: 'bg-green-500' },
  occupied:  { label: 'Occupied',  bg: 'bg-red-50',    border: 'border-red-200',   text: 'text-red-700',    dot: 'bg-red-500' },
  reserved:  { label: 'Reserved',  bg: 'bg-yellow-50', border: 'border-yellow-200',text: 'text-yellow-700', dot: 'bg-yellow-500' },
  cleaning:  { label: 'Cleaning',  bg: 'bg-blue-50',   border: 'border-blue-200',  text: 'text-blue-700',   dot: 'bg-blue-400' },
}

export default function TableGrid() {
  const navigate = useNavigate()
  const [tables, setTables] = useState<DiningTable[]>([])
  const [loading, setLoading] = useState(true)
  const [section, setSection] = useState('All')

  async function loadTables() {
    setLoading(true)
    const { data, error } = await supabase
      .from('dining_tables')
      .select('*')
      .eq('is_active', true)
      .order('name')
    if (error) toast.error('Failed to load tables')
    else setTables(data || [])
    setLoading(false)
  }

  useEffect(() => {
    loadTables()
    // Realtime subscription for table status
    const channel = supabase
      .channel('tables')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dining_tables' }, loadTables)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const sections = ['All', ...Array.from(new Set(tables.map(t => t.section)))]
  const filtered = section === 'All' ? tables : tables.filter(t => t.section === section)

  const counts = {
    available: tables.filter(t => t.status === 'available').length,
    occupied:  tables.filter(t => t.status === 'occupied').length,
  }

  function handleTableClick(table: DiningTable) {
    if (table.status === 'available') {
      // Start new order on this table
      navigate(`/cashier/order/new?table=${table.id}&tableName=${table.name}`)
    } else if (table.status === 'occupied') {
      // Open existing order
      navigate(`/cashier/orders?table=${table.id}`)
    }
  }

  return (
    <div className="p-4 max-w-5xl mx-auto">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="card-pad text-center">
          <p className="text-2xl font-bold text-gray-900">{tables.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Total Tables</p>
        </div>
        <div className="card-pad text-center">
          <p className="text-2xl font-bold text-green-600">{counts.available}</p>
          <p className="text-xs text-gray-500 mt-0.5">Available</p>
        </div>
        <div className="card-pad text-center">
          <p className="text-2xl font-bold text-red-600">{counts.occupied}</p>
          <p className="text-xs text-gray-500 mt-0.5">Occupied</p>
        </div>
      </div>

      {/* Section filter + refresh */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1 scroll-touch">
        {sections.map(s => (
          <button
            key={s}
            onClick={() => setSection(s)}
            className={clsx(
              'flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all',
              section === s ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200'
            )}
          >
            {s}
          </button>
        ))}
        <button onClick={loadTables} className="ml-auto flex-shrink-0 p-2 rounded-full bg-white border border-gray-200 text-gray-500 hover:text-gray-700">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Table Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {Array(8).fill(0).map((_, i) => (
            <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {filtered.map(table => {
            const cfg = statusConfig[table.status]
            return (
              <button
                key={table.id}
                onClick={() => handleTableClick(table)}
                className={clsx(
                  'relative p-4 rounded-2xl border-2 text-left transition-all active:scale-95',
                  cfg.bg, cfg.border,
                  table.status === 'available' && 'hover:shadow-md hover:scale-[1.02]',
                  table.status === 'occupied' && 'hover:shadow-md'
                )}
              >
                {/* Status dot */}
                <div className={`absolute top-3 right-3 w-2.5 h-2.5 rounded-full ${cfg.dot}`} />

                <p className={`text-xl font-bold ${cfg.text}`}>{table.name}</p>
                <p className="text-xs text-gray-500 mt-1">{table.section}</p>

                <div className={`flex items-center gap-1 mt-3 text-xs ${cfg.text}`}>
                  <Users className="w-3.5 h-3.5" />
                  <span>{table.capacity} seats</span>
                </div>

                <span className={`mt-2 inline-block text-xs font-medium ${cfg.text}`}>
                  {cfg.label}
                  {table.status === 'available' && ' · Tap to order'}
                  {table.status === 'occupied'  && ' · Tap to view'}
                </span>
              </button>
            )
          })}

          {/* Quick new takeaway */}
          <button
            onClick={() => navigate('/cashier/order/new?type=takeaway')}
            className="p-4 rounded-2xl border-2 border-dashed border-gray-300 text-left transition-all hover:border-blue-400 hover:bg-blue-50 active:scale-95"
          >
            <div className="w-8 h-8 bg-gray-100 rounded-xl flex items-center justify-center mb-2">
              <Plus className="w-4 h-4 text-gray-500" />
            </div>
            <p className="text-sm font-medium text-gray-600">Takeaway</p>
            <p className="text-xs text-gray-400 mt-1">Quick order</p>
          </button>
        </div>
      )}
    </div>
  )
}
