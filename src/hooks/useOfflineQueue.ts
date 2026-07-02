import { useState, useEffect } from 'react'

interface QueueItem {
  id: string
  table: string
  data: any
  timestamp: number
}

const QUEUE_KEY = 'restaurantos_offline_queue'

export function useOfflineQueue() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [queueCount, setQueueCount] = useState(0)

  useEffect(() => {
    function handleOnline() { setIsOnline(true); processQueue() }
    function handleOffline() { setIsOnline(false) }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  function getQueue(): QueueItem[] {
    try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]') }
    catch { return [] }
  }

  function addToQueue(table: string, data: any) {
    const queue = getQueue()
    queue.push({ id: Date.now().toString(), table, data, timestamp: Date.now() })
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
    setQueueCount(queue.length)
  }

  async function processQueue() {
    const { supabase } = await import('@/lib/supabase')
    const queue = getQueue()
    if (!queue.length) return
    const failed: QueueItem[] = []
    for (const item of queue) {
      const { error } = await supabase.from(item.table).insert(item.data)
      if (error) failed.push(item)
    }
    localStorage.setItem(QUEUE_KEY, JSON.stringify(failed))
    setQueueCount(failed.length)
  }

  return { isOnline, queueCount, addToQueue }
}
