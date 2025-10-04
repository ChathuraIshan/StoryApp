/**
 * Favorites Service - Handles all AsyncStorage operations for favorites
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FavoritesService, ServiceError } from '../types';

const FAVORITES_KEY = 'favorites';
const MAX_FAVORITES = 5;

class FavoritesServiceImpl implements FavoritesService {
  /**
   * Gets all favorite story IDs from AsyncStorage
   * @returns Promise<string[]> Array of favorite story IDs
   */
  async getFavorites(): Promise<string[]> {
    try {
      const favoritesJson = await AsyncStorage.getItem(FAVORITES_KEY);
      if (favoritesJson) {
        const favorites = JSON.parse(favoritesJson);
        // Validate that all items are strings
        return favorites.filter((id: any) => typeof id === 'string' && id.length > 0);
      }
      return [];
    } catch (error) {
      console.error('Error getting favorites:', error);
      throw {
        code: 'STORAGE_ERROR',
        message: 'Failed to retrieve favorites from storage',
        details: error
      } as ServiceError;
    }
  }

  /**
   * Adds a story ID to favorites if under the limit
   * @param storyId - The story ID to add to favorites
   * @returns Promise<string[]> Updated favorites array
   */
  async addFavorite(storyId: string): Promise<string[]> {
    try {
      const currentFavorites = await this.getFavorites();
      
      // Check if already in favorites
      if (currentFavorites.includes(storyId)) {
        console.log('Story already in favorites:', storyId);
        return currentFavorites;
      }

      // Check if at limit
      if (currentFavorites.length >= MAX_FAVORITES) {
        throw {
          code: 'FAVORITES_LIMIT_EXCEEDED',
          message: `You can only have ${MAX_FAVORITES} favorite stories. Please remove one first.`,
          details: { currentCount: currentFavorites.length, limit: MAX_FAVORITES }
        } as ServiceError;
      }

      // Add to favorites
      const updatedFavorites = [...currentFavorites, storyId];
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(updatedFavorites));
      
      console.log('Added to favorites:', storyId);
      return updatedFavorites;
    } catch (error: any) {
      console.error('Error adding favorite:', error);
      if (error.code) {
        throw error; // Re-throw service errors
      }
      throw {
        code: 'STORAGE_ERROR',
        message: 'Failed to add favorite to storage',
        details: error
      } as ServiceError;
    }
  }

  /**
   * Removes a story ID from favorites
   * @param storyId - The story ID to remove from favorites
   * @returns Promise<string[]> Updated favorites array
   */
  async removeFavorite(storyId: string): Promise<string[]> {
    try {
      const currentFavorites = await this.getFavorites();
      const updatedFavorites = currentFavorites.filter(id => id !== storyId);
      
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(updatedFavorites));
      
      console.log('Removed from favorites:', storyId);
      return updatedFavorites;
    } catch (error) {
      console.error('Error removing favorite:', error);
      throw {
        code: 'STORAGE_ERROR',
        message: 'Failed to remove favorite from storage',
        details: error
      } as ServiceError;
    }
  }

  /**
   * Clears all favorites
   * @returns Promise<void>
   */
  async clearFavorites(): Promise<void> {
    try {
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify([]));
      console.log('Cleared all favorites');
    } catch (error) {
      console.error('Error clearing favorites:', error);
      throw {
        code: 'STORAGE_ERROR',
        message: 'Failed to clear favorites from storage',
        details: error
      } as ServiceError;
    }
  }

  /**
   * Checks if a story is in favorites
   * @param storyId - The story ID to check
   * @returns Promise<boolean> True if story is in favorites
   */
  async isFavorite(storyId: string): Promise<boolean> {
    try {
      const favorites = await this.getFavorites();
      return favorites.includes(storyId);
    } catch (error) {
      console.error('Error checking favorite status:', error);
      return false;
    }
  }

  /**
   * Removes multiple story IDs from favorites
   * @param storyIds - Array of story IDs to remove
   * @returns Promise<string[]> Updated favorites array
   */
  async removeMultipleFavorites(storyIds: string[]): Promise<string[]> {
    try {
      const currentFavorites = await this.getFavorites();
      const updatedFavorites = currentFavorites.filter(id => !storyIds.includes(id));
      
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(updatedFavorites));
      
      console.log('Removed multiple favorites:', storyIds);
      return updatedFavorites;
    } catch (error) {
      console.error('Error removing multiple favorites:', error);
      throw {
        code: 'STORAGE_ERROR',
        message: 'Failed to remove favorites from storage',
        details: error
      } as ServiceError;
    }
  }

  /**
   * Gets the current favorites count
   * @returns Promise<number> Number of favorite stories
   */
  async getFavoritesCount(): Promise<number> {
    try {
      const favorites = await this.getFavorites();
      return favorites.length;
    } catch (error) {
      console.error('Error getting favorites count:', error);
      return 0;
    }
  }

  /**
   * Checks if the user can add more favorites
   * @returns Promise<boolean> True if under the limit
   */
  async canAddFavorite(): Promise<boolean> {
    try {
      const count = await this.getFavoritesCount();
      return count < MAX_FAVORITES;
    } catch (error) {
      console.error('Error checking if can add favorite:', error);
      return false;
    }
  }
}

// Export singleton instance
export const favoritesService = new FavoritesServiceImpl();
export default favoritesService;
