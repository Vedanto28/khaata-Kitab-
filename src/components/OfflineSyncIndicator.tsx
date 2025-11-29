import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, Check } from 'lucide-react';
import { db } from '@/lib/db';

export const OfflineSyncIndicator = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Load last sync date from settings
    const loadLastSync = async () => {
      const settings = await db.settings.toArray();
      if (settings[0]?.lastSyncDate) {
        setLastSync(settings[0].lastSyncDate);
      }
    };
    loadLastSync();

    // Mock sync every 30 seconds when online
    const syncInterval = setInterval(async () => {
      if (navigator.onLine) {
        const now = new Date();
        setLastSync(now);
        const settings = await db.settings.toArray();
        if (settings[0]) {
          await db.settings.update(settings[0].id!, { lastSyncDate: now });
        }
      }
    }, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(syncInterval);
    };
  }, []);

  return (
    <Badge 
      variant={isOnline ? "default" : "secondary"}
      className="flex items-center gap-1.5 px-3 py-1"
    >
      {isOnline ? (
        <>
          <Check className="h-3 w-3" />
          <span className="text-xs font-medium">Synced</span>
        </>
      ) : (
        <>
          <WifiOff className="h-3 w-3" />
          <span className="text-xs font-medium">Offline – data saved locally</span>
        </>
      )}
    </Badge>
  );
};
