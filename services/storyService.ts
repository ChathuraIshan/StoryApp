/**
 * Story Service - Handles all Firestore operations for stories
 */
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  onSnapshot, 
  doc, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  increment, 
  where,
  getDocs,
  serverTimestamp,
  Unsubscribe
} from 'firebase/firestore';
import { db } from '../firebase';
import { Story, StoryCreateData, StoryService, ServiceError } from '../types';
import { offlineService } from './offlineService';

const STORIES_COLLECTION = 'stories';
const DEFAULT_LIMIT = 10;

class StoryServiceImpl implements StoryService {
  /**
   * Gets all stories from Firestore
   * @returns Promise<Story[]> Array of all stories
   */
  async getAllStories(): Promise<Story[]> {
    try {
      const q = query(
        collection(db, STORIES_COLLECTION), 
        orderBy('timestamp', 'desc'), 
        limit(DEFAULT_LIMIT)
      );
      
      const querySnapshot = await getDocs(q);
      const stories: Story[] = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Story));
      
      console.log('Retrieved stories:', stories.length);
      return stories;
    } catch (error) {
      console.error('Error getting stories:', error);
      throw {
        code: 'FIRESTORE_ERROR',
        message: 'Failed to retrieve stories from database',
        details: error
      } as ServiceError;
    }
  }

  /**
   * Gets a single story by ID
   * @param storyId - The story ID to retrieve
   * @returns Promise<Story | null> Story object or null if not found
   */
  async getStoryById(storyId: string): Promise<Story | null> {
    try {
      const storyRef = doc(db, STORIES_COLLECTION, storyId);
      const storySnap = await getDoc(storyRef);
      
      if (storySnap.exists()) {
        const story = {
          id: storySnap.id,
          ...storySnap.data()
        } as Story;
        
        console.log('Retrieved story:', story.title);
        return story;
      }
      
      console.log('Story not found:', storyId);
      return null;
    } catch (error) {
      console.error('Error getting story by ID:', error);
      throw {
        code: 'FIRESTORE_ERROR',
        message: 'Failed to retrieve story from database',
        details: error
      } as ServiceError;
    }
  }

  /**
   * Creates a new story in Firestore or saves offline if no connection
   * @param storyData - The story data to create
   * @returns Promise<string> The ID of the created story
   */
  async createStory(storyData: StoryCreateData): Promise<string> {
    try {
      // Check if device is offline
      if (offlineService.isOffline()) {
        console.log('Device is offline, saving story locally...');
        const pendingId = await offlineService.addPendingStory(storyData);
        return pendingId;
      }

      // Generate unique ID
      const uniqueId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      
      const storyDoc = {
        storyId: uniqueId,
        title: storyData.title,
        content: storyData.content,
        category: storyData.category,
        categoryId: storyData.categoryId,
        location: storyData.location,
        timestamp: serverTimestamp(),
        popularity: 0,
        Like: 0,
        Dislike: 0
      };

      const docRef = await addDoc(collection(db, STORIES_COLLECTION), storyDoc);
      
      console.log('Story created:', storyData.title, 'with ID:', docRef.id);
      return docRef.id;
    } catch (error: any) {
      console.error('Error creating story:', error);
      
      // If network error, try to save offline
      if (error.code === 'unavailable' || error.message?.includes('network')) {
        console.log('Network error, saving story offline...');
        try {
          const pendingId = await offlineService.addPendingStory(storyData);
          return pendingId;
        } catch (offlineError) {
          console.error('Failed to save story offline:', offlineError);
        }
      }
      
      throw {
        code: 'FIRESTORE_ERROR',
        message: 'Failed to create story in database',
        details: error
      } as ServiceError;
    }
  }

  /**
   * Updates an existing story
   * @param storyId - The ID of the story to update
   * @param updates - Partial story data to update
   * @returns Promise<void>
   */
  async updateStory(storyId: string, updates: Partial<Story>): Promise<void> {
    try {
      const storyRef = doc(db, STORIES_COLLECTION, storyId);
      await updateDoc(storyRef, updates);
      
      console.log('Story updated:', storyId);
    } catch (error) {
      console.error('Error updating story:', error);
      throw {
        code: 'FIRESTORE_ERROR',
        message: 'Failed to update story in database',
        details: error
      } as ServiceError;
    }
  }

  /**
   * Deletes a story from Firestore
   * @param storyId - The ID of the story to delete
   * @returns Promise<void>
   */
  async deleteStory(storyId: string): Promise<void> {
    try {
      const storyRef = doc(db, STORIES_COLLECTION, storyId);
      await deleteDoc(storyRef);
      
      console.log('Story deleted:', storyId);
    } catch (error) {
      console.error('Error deleting story:', error);
      throw {
        code: 'FIRESTORE_ERROR',
        message: 'Failed to delete story from database',
        details: error
      } as ServiceError;
    }
  }

  /**
   * Increments the like count for a story
   * @param storyId - The ID of the story to like
   * @returns Promise<void>
   */
  async likeStory(storyId: string): Promise<void> {
    try {
      const storyRef = doc(db, STORIES_COLLECTION, storyId);
      await updateDoc(storyRef, {
        Like: increment(1)
      });
      
      console.log('Story liked:', storyId);
    } catch (error) {
      console.error('Error liking story:', error);
      throw {
        code: 'FIRESTORE_ERROR',
        message: 'Failed to like story in database',
        details: error
      } as ServiceError;
    }
  }

  /**
   * Increments the dislike count for a story
   * @param storyId - The ID of the story to dislike
   * @returns Promise<void>
   */
  async dislikeStory(storyId: string): Promise<void> {
    try {
      const storyRef = doc(db, STORIES_COLLECTION, storyId);
      await updateDoc(storyRef, {
        Dislike: increment(1)
      });
      
      console.log('Story disliked:', storyId);
    } catch (error) {
      console.error('Error disliking story:', error);
      throw {
        code: 'FIRESTORE_ERROR',
        message: 'Failed to dislike story in database',
        details: error
      } as ServiceError;
    }
  }

  /**
   * Subscribes to real-time updates of stories
   * @param callback - Function to call when stories are updated
   * @returns Function to unsubscribe from the listener
   */
  subscribeToStories(callback: (stories: Story[]) => void): Unsubscribe {
    try {
      const q = query(
        collection(db, STORIES_COLLECTION), 
        orderBy('timestamp', 'desc'), 
        limit(DEFAULT_LIMIT)
      );
      
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const stories: Story[] = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Story));
        
        console.log('Real-time update: New stories received');
        callback(stories);
      }, (error) => {
        console.error('Error listening to stories:', error);
        callback([]); // Return empty array on error
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up stories subscription:', error);
      callback([]); // Return empty array on error
      return () => {}; // Return empty unsubscribe function
    }
  }

  /**
   * Gets stories filtered by category
   * @param category - The category to filter by
   * @returns Promise<Story[]> Array of stories in the category
   */
  async getStoriesByCategory(category: string): Promise<Story[]> {
    try {
      const q = query(
        collection(db, STORIES_COLLECTION),
        where('category', '==', category),
        orderBy('timestamp', 'desc'),
        limit(DEFAULT_LIMIT)
      );
      
      const querySnapshot = await getDocs(q);
      const stories: Story[] = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Story));
      
      console.log('Retrieved stories for category:', category, 'count:', stories.length);
      return stories;
    } catch (error) {
      console.error('Error getting stories by category:', error);
      throw {
        code: 'FIRESTORE_ERROR',
        message: 'Failed to retrieve stories by category from database',
        details: error
      } as ServiceError;
    }
  }

  /**
   * Gets multiple stories by their IDs
   * @param storyIds - Array of story IDs to retrieve
   * @returns Promise<Story[]> Array of found stories
   */
  async getStoriesByIds(storyIds: string[]): Promise<Story[]> {
    try {
      const stories: Story[] = [];
      
      for (const storyId of storyIds) {
        try {
          const story = await this.getStoryById(storyId);
          if (story) {
            stories.push(story);
          }
        } catch (individualError) {
          console.error(`Error fetching story ${storyId}:`, individualError);
          // Continue with other stories
        }
      }
      
      console.log('Retrieved stories by IDs:', stories.length, 'out of', storyIds.length);
      return stories;
    } catch (error) {
      console.error('Error getting stories by IDs:', error);
      throw {
        code: 'FIRESTORE_ERROR',
        message: 'Failed to retrieve stories by IDs from database',
        details: error
      } as ServiceError;
    }
  }

  /**
   * Searches stories by title
   * @param searchTerm - The term to search for in story titles
   * @returns Promise<Story[]> Array of matching stories
   */
  async searchStories(searchTerm: string): Promise<Story[]> {
    try {
      // Note: Firestore doesn't support full-text search natively
      // This is a basic implementation that gets all stories and filters client-side
      // For production, consider using Algolia or Elasticsearch
      const allStories = await this.getAllStories();
      const filteredStories = allStories.filter(story => 
        story.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      console.log('Search results for:', searchTerm, 'count:', filteredStories.length);
      return filteredStories;
    } catch (error) {
      console.error('Error searching stories:', error);
      throw {
        code: 'FIRESTORE_ERROR',
        message: 'Failed to search stories in database',
        details: error
      } as ServiceError;
    }
  }
}

// Export singleton instance
export const storyService = new StoryServiceImpl();
export default storyService;
