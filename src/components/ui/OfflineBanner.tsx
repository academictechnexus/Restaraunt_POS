import { useOfflineQueue } from '@/hooks/useOfflineQueue'
import { WifiOff, Wifi, RefreshCw } from 'lucide-react'

export default function OfflineBanner() {
  const { isOnline, queueCount } = useOfflineQueue()

  if (isOnline && queueCount === 0) return null

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 px-4 py-2 text-sm font-medium flex items-center justify-center gap-2 ${
      isOnline ? 'bg-green-600' : 'bg-red-600'
    } text-white`}>
      {isOnline ? (
        <>
          <Wifi className="w-4 h-4" />
          Back online! {queueCount > 0 && `Syncing ${queueCount} pending orders...`}
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4" />
          No internet — orders are saved locally and will sync when online
        </>
      )}
    </div>
  )
}
