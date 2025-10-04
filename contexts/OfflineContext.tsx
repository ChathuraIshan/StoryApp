/**
 * Offline Context for managing network status and offline state
 * Provides real-time network status updates and offline story management
 */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { offlineService, PendingStory } from '../services/offlineService';

interface OfflineContextType {
  isOffline: boolean;
  pendingStoriesCount: number;
  pendingStories: PendingStory[];
  refreshPendingStories: () => Promise<void>;
  forceSyncStories: () => Promise<void>;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

/**
 * Offline Provider component
 * Manages global offline state and pending stories
 */
export const OfflineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOffline, setIsOffline] = useState(false);
  const [pendingStoriesCount, setPendingStoriesCount] = useState(0);
  const [pendingStories, setPendingStories] = useState<PendingStory[]>([]);

  /**
   * Refresh pending stories from storage
   */
  const refreshPendingStories = async () => {
    try {
      const stories = await offlineService.getPendingStories();
      const count = await offlineService.getPendingStoriesCount();
      setPendingStories(stories);
      setPendingStoriesCount(count);
    } catch (error) {
      console.error('Error refreshing pending stories:', error);
    }
  };

  /**
   * Force sync pending stories
   */
  const forceSyncStories = async () => {
    try {
      await offlineService.forceSyncPendingStories();
      await refreshPendingStories();
    } catch (error) {
      console.error('Error force syncing stories:', error);
    }
  };

  // Initialize offline status and pending stories
  useEffect(() => {
    // Load initial pending stories
    refreshPendingStories();

    // Subscribe to network status changes
    const unsubscribe = offlineService.subscribeToNetworkStatus((status) => {
      setIsOffline(!status.isConnected);
      
      // If we just came back online, refresh pending stories
      if (status.isConnected) {
        setTimeout(() => {
          refreshPendingStories();
        }, 1000); // Small delay to ensure sync completes
      }
    });

    return unsubscribe;
  }, []);

  const value: OfflineContextType = {
    isOffline,
    pendingStoriesCount,
    pendingStories,
    refreshPendingStories,
    forceSyncStories,
  };

  return (
    <OfflineContext.Provider value={value}>
      {children}
    </OfflineContext.Provider>
  );
};

/**
 * Hook to use offline context
 * @returns OfflineContextType
 */
export const useOffline = (): OfflineContextType => {
  const context = useContext(OfflineContext);
  if (context === undefined) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
};
