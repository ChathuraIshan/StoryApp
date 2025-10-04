/**
 * TypeScript interfaces and types for the AnonStories application
 */

export interface Story {
  id: string;
  storyId: string;
  title: string;
  content: string;
  category: string;
  categoryId: string;
  location?: {
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: number;
  } | null;
  timestamp: any; // Firestore Timestamp
  popularity: number;
  Like: number;
  Dislike: number;
}

export interface StoryCreateData {
  title: string;
  content: string;
  category: string;
  categoryId: string;
  location?: {
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: number;
  } | null;
}

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export interface Category {
  id: string;
  name: string;
}

export interface FavoritesService {
  getFavorites(): Promise<string[]>;
  addFavorite(storyId: string): Promise<string[]>;
  removeFavorite(storyId: string): Promise<string[]>;
  clearFavorites(): Promise<void>;
  isFavorite(storyId: string): Promise<boolean>;
}

export interface StoryService {
  getAllStories(): Promise<Story[]>;
  getStoryById(storyId: string): Promise<Story | null>;
  createStory(storyData: StoryCreateData): Promise<string>;
  updateStory(storyId: string, updates: Partial<Story>): Promise<void>;
  deleteStory(storyId: string): Promise<void>;
  likeStory(storyId: string): Promise<void>;
  dislikeStory(storyId: string): Promise<void>;
  subscribeToStories(callback: (stories: Story[]) => void): () => void;
  getStoriesByCategory(category: string): Promise<Story[]>;
}

export interface ServiceError {
  code: string;
  message: string;
  details?: any;
}

export interface PendingStory {
  id: string;
  storyData: StoryCreateData;
  timestamp: number;
  retryCount: number;
}

export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean;
}

export interface OfflineService {
  getNetworkStatus(): Promise<NetworkStatus>;
  getPendingStories(): Promise<PendingStory[]>;
  addPendingStory(storyData: StoryCreateData): Promise<string>;
  removePendingStory(id: string): Promise<void>;
  clearPendingStories(): Promise<void>;
  syncPendingStories(): Promise<void>;
}
