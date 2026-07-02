// @ts-nocheck
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { RefreshCw, LogOut, Users } from 'lucide-react'
import toast from 'react-hot-toast'

export default function WaiterHome() {
  const navigate = useNavigate()
  const { profile, signOut } = useAuth()
  const [tables, setTables] = useState([])
  const [loading, setLoading] = useState(true)
  const [section, setSection] = useState('All')

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('dining_tables').select('*').eq('is_active', true).order('name')
    setTables(data || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    const ch = supabase.channel('waiter-tables')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dining_tables' }, load)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [])

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  const sections = ['All', ...Array.from(new Set(tables.map(t => t.section)))]
  const filtered  = section === 'All' ? tables : tables.filter(t => t.section === section)

  const counts = {
    available: tables.filter(t => t.status === 'available').length,
    occupied:  tables.filter(t => t.status === 'occupied').length,
    reserved:  tables.filter(t => t.status === 'reserved').length,
  }

  const statusStyle = {
    available: { bg: '#f0fdf4', border: '#16a34a', text: '#15803d', dot: '#22c55e', label: 'Available · Tap to order' },
    occupied:  { bg: '#fef2f2', border: '#dc2626', text: '#b91c1c', dot: '#ef4444', label: 'Occupied · Tap to add items' },
    reserved:  { bg: '#fffbeb', border: '#d97706', text: '#92400e', dot: '#f59e0b', label: 'Reserved' },
    cleaning:  { bg: '#eff6ff', border: '#2563eb', text: '#1e40af', dot: '#3b82f6', label: 'Cleaning' },
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif' }}>

      {/* Header */}
      <div style={{ background: '#059669', padding: '14px 16px', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.2)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🛎</div>
          <div style={{ flex: 1 }}>
            <div style={{ color: 'white', fontWeight: 700, fontSize: 15 }}>Waiter — {profile?.full_name || 'Staff'}</div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>Spice Garden Restaurant</div>
          </div>
          <button onClick={load} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, padding: 8, cursor: 'pointer', color: 'white' }}>
            <RefreshCw size={16} style={{ display: 'block' }} />
          </button>
          <button onClick={handleSignOut} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, padding: 8, cursor: 'pointer', color: 'white' }}>
            <LogOut size={16} style={{ display: 'block' }} />
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 12 }}>
          {[
            { label: 'Available', value: counts.available, color: '#bbf7d0', text: '#14532d' },
            { label: 'Occupied',  value: counts.occupied,  color: '#fecaca', text: '#7f1d1d' },
            { label: 'Reserved',  value: counts.reserved,  color: '#fde68a', text: '#78350f' },
          ].map(s => (
            <div key={s.label} style={{ background: s.color, borderRadius: 10, padding: '8px 10px', textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: s.text }}>{s.value}</div>
              <div style={{ fontSize: 10, color: s.text, opacity: 0.8 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Section filter */}
      <div style={{ display: 'flex', gap: 8, padding: '12px 16px', overflowX: 'auto', background: 'white', borderBottom: '1px solid #e5e7eb' }}>
        {sections.map(s => (
          <button key={s} onClick={() => setSection(s)}
            style={{ flexShrink: 0, padding: '6px 16px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, background: section === s ? '#059669' : '#f3f4f6', color: section === s ? 'white' : '#6b7280' }}>
            {s}
          </button>
        ))}
      </div>

      {/* Tables grid */}
      <div style={{ padding: 16 }}>
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {Array(8).fill(0).map((_, i) => <div key={i} style={{ height: 110, background: '#e5e7eb', borderRadius: 14, animation: 'pulse 1.5s infinite' }} />)}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {filtered.map(t => {
              const s = statusStyle[t.status] || statusStyle.available
              return (
                <button key={t.id}
                  onClick={() => {
                    if (t.status === 'available') {
                      navigate(`/waiter/order/new?table=${t.id}&tableName=${t.name}`)
                    } else if (t.status === 'occupied') {
                      navigate(`/waiter/order/new?table=${t.id}&tableName=${t.name}&existing=true`)
                    } else {
                      toast.error(`Table ${t.name} is ${t.status}`)
                    }
                  }}
                  style={{ background: s.bg, border: `2px solid ${s.border}`, borderRadius: 14, padding: 14, textAlign: 'left', cursor: 'pointer', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: 10, right: 10, width: 10, height: 10, borderRadius: '50%', background: s.dot }} />
                  <div style={{ fontSize: 22, fontWeight: 800, color: s.text }}>{t.name}</div>
                  <div style={{ fontSize: 11, color: s.text, opacity: 0.7, marginTop: 2 }}>{t.section}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8 }}>
                    <Users size={12} color={s.text} />
                    <span style={{ fontSize: 11, color: s.text }}>{t.capacity} seats</span>
                  </div>
                  <div style={{ fontSize: 11, color: s.text, fontWeight: 600, marginTop: 4 }}>{s.label}</div>
                </button>
              )
            })}

            {/* Takeaway button */}
            <button onClick={() => navigate('/waiter/order/new?type=takeaway&tableName=Takeaway')}
              style={{ background: 'white', border: '2px dashed #d1d5db', borderRadius: 14, padding: 14, textAlign: 'left', cursor: 'pointer' }}>
              <div style={{ fontSize: 22 }}>🥡</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#374151', marginTop: 6 }}>Takeaway</div>
              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Tap to start</div>
            </button>
          </div>
        )}
      </div>

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
    </div>
  )
}
