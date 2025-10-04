/**
 * Offline Service - Handles network detection and offline story management
 */
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  collection, 
  addDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase';
import { PendingStory, NetworkStatus, OfflineService, ServiceError } from '../types';

const PENDING_STORIES_KEY = 'pending_stories';
const MAX_RETRY_COUNT = 3;

class OfflineServiceImpl implements OfflineService {
  private isConnected: boolean = true;
  private networkListeners: ((status: NetworkStatus) => void)[] = [];

  constructor() {
    this.initializeNetworkListener();
  }

  /**
   * Initialize network status listener
   */
  private async initializeNetworkListener() {
    try {
      // Get initial network state
      const netInfo = await NetInfo.fetch();
      this.isConnected = (netInfo.isConnected ?? false) && (netInfo.isInternetReachable ?? false);
      
      // Listen for network changes
      NetInfo.addEventListener(state => {
        const wasConnected = this.isConnected;
        this.isConnected = (state.isConnected ?? false) && (state.isInternetReachable ?? false);
        
        // If we just came back online, sync pending stories
        if (!wasConnected && this.isConnected) {
          console.log('Network reconnected, syncing pending stories...');
          this.syncPendingStories();
        }
        
        // Notify listeners
        this.notifyNetworkListeners();
      });
    } catch (error) {
      console.error('Error initializing network listener:', error);
    }
  }

  /**
   * Notify network status listeners
   */
  private notifyNetworkListeners() {
    this.networkListeners.forEach(listener => {
      listener({
        isConnected: this.isConnected,
        isInternetReachable: this.isConnected
      });
    });
  }

  /**
   * Subscribe to network status changes
   * @param listener - Function to call when network status changes
   * @returns Unsubscribe function
   */
  subscribeToNetworkStatus(listener: (status: NetworkStatus) => void): () => void {
    this.networkListeners.push(listener);
    
    // Call immediately with current status
    listener({
      isConnected: this.isConnected,
      isInternetReachable: this.isConnected
    });
    
    return () => {
      const index = this.networkListeners.indexOf(listener);
      if (index > -1) {
        this.networkListeners.splice(index, 1);
      }
    };
  }

  /**
   * Get current network status
   * @returns Promise<NetworkStatus>
   */
  async getNetworkStatus(): Promise<NetworkStatus> {
    try {
      const netInfo = await NetInfo.fetch();
      return {
        isConnected: netInfo.isConnected || false,
        isInternetReachable: netInfo.isInternetReachable || false
      };
    } catch (error) {
      console.error('Error getting network status:', error);
      return {
        isConnected: false,
        isInternetReachable: false
      };
    }
  }

  /**
   * Get all pending stories from local storage
   * @returns Promise<PendingStory[]>
   */
  async getPendingStories(): Promise<PendingStory[]> {
    try {
      const pendingStoriesJson = await AsyncStorage.getItem(PENDING_STORIES_KEY);
      if (pendingStoriesJson) {
        return JSON.parse(pendingStoriesJson);
      }
      return [];
    } catch (error) {
      console.error('Error getting pending stories:', error);
      throw {
        code: 'STORAGE_ERROR',
        message: 'Failed to retrieve pending stories from storage',
        details: error
      } as ServiceError;
    }
  }

  /**
   * Add a story to pending stories list
   * @param storyData - The story data to save
   * @returns Promise<string> - The pending story ID
   */
  async addPendingStory(storyData: any): Promise<string> {
    try {
      const pendingStories = await this.getPendingStories();
      const pendingStory: PendingStory = {
        id: `pending_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        storyData,
        timestamp: Date.now(),
        retryCount: 0
      };
      
      pendingStories.push(pendingStory);
      await AsyncStorage.setItem(PENDING_STORIES_KEY, JSON.stringify(pendingStories));
      
      console.log('Story saved offline:', pendingStory.id);
      return pendingStory.id;
    } catch (error) {
      console.error('Error adding pending story:', error);
      throw {
        code: 'STORAGE_ERROR',
        message: 'Failed to save story offline',
        details: error
      } as ServiceError;
    }
  }

  /**
   * Remove a pending story by ID
   * @param id - The pending story ID to remove
   * @returns Promise<void>
   */
  async removePendingStory(id: string): Promise<void> {
    try {
      const pendingStories = await this.getPendingStories();
      const updatedStories = pendingStories.filter(story => story.id !== id);
      await AsyncStorage.setItem(PENDING_STORIES_KEY, JSON.stringify(updatedStories));
      
      console.log('Removed pending story:', id);
    } catch (error) {
      console.error('Error removing pending story:', error);
      throw {
        code: 'STORAGE_ERROR',
        message: 'Failed to remove pending story from storage',
        details: error
      } as ServiceError;
    }
  }

  /**
   * Clear all pending stories
   * @returns Promise<void>
   */
  async clearPendingStories(): Promise<void> {
    try {
      await AsyncStorage.removeItem(PENDING_STORIES_KEY);
      console.log('Cleared all pending stories');
    } catch (error) {
      console.error('Error clearing pending stories:', error);
      throw {
        code: 'STORAGE_ERROR',
        message: 'Failed to clear pending stories from storage',
        details: error
      } as ServiceError;
    }
  }

  /**
   * Sync all pending stories to the server
   * @returns Promise<void>
   */
  async syncPendingStories(): Promise<void> {
    try {
      const pendingStories = await this.getPendingStories();
      
      if (pendingStories.length === 0) {
        console.log('No pending stories to sync');
        return;
      }

      console.log(`Syncing ${pendingStories.length} pending stories...`);
      
      const syncPromises = pendingStories.map(async (pendingStory) => {
        try {
          // Check if we should retry this story
          if (pendingStory.retryCount >= MAX_RETRY_COUNT) {
            console.log(`Skipping story ${pendingStory.id} - max retry count reached`);
            await this.removePendingStory(pendingStory.id);
            return;
          }

          // Try to create the story directly in Firestore
          const uniqueId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
          
          const storyDoc = {
            storyId: uniqueId,
            title: pendingStory.storyData.title,
            content: pendingStory.storyData.content,
            category: pendingStory.storyData.category,
            categoryId: pendingStory.storyData.categoryId,
            location: pendingStory.storyData.location,
            timestamp: serverTimestamp(),
            popularity: 0,
            Like: 0,
            Dislike: 0
          };

          await addDoc(collection(db, 'stories'), storyDoc);
          
          // Success! Remove from pending
          await this.removePendingStory(pendingStory.id);
          console.log(`Successfully synced story: ${pendingStory.id}`);
          
        } catch (error) {
          console.error(`Failed to sync story ${pendingStory.id}:`, error);
          
          // Increment retry count
          const updatedStories = await this.getPendingStories();
          const updatedStory = updatedStories.find(s => s.id === pendingStory.id);
          if (updatedStory) {
            updatedStory.retryCount++;
            await AsyncStorage.setItem(PENDING_STORIES_KEY, JSON.stringify(updatedStories));
          }
        }
      });

      await Promise.allSettled(syncPromises);
      console.log('Finished syncing pending stories');
      
    } catch (error) {
      console.error('Error syncing pending stories:', error);
      throw {
        code: 'SYNC_ERROR',
        message: 'Failed to sync pending stories',
        details: error
      } as ServiceError;
    }
  }

  /**
   * Get the count of pending stories
   * @returns Promise<number>
   */
  async getPendingStoriesCount(): Promise<number> {
    try {
      const pendingStories = await this.getPendingStories();
      return pendingStories.length;
    } catch (error) {
      console.error('Error getting pending stories count:', error);
      return 0;
    }
  }

  /**
   * Check if device is currently offline
   * @returns boolean
   */
  isOffline(): boolean {
    return !this.isConnected;
  }

  /**
   * Force sync pending stories (useful for manual retry)
   * @returns Promise<void>
   */
  async forceSyncPendingStories(): Promise<void> {
    console.log('Force syncing pending stories...');
    await this.syncPendingStories();
  }
}

// Export singleton instance
export const offlineService = new OfflineServiceImpl();
export default offlineService;
