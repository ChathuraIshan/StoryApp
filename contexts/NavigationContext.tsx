/**
 * Navigation Context for managing navigation-related state
 * Provides real-time updates for badges and navigation state
 */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { favoritesService } from '../services/favoritesService';

interface NavigationContextType {
  favoritesCount: number;
  updateFavoritesCount: () => Promise<void>;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

/**
 * Navigation Provider component
 * Manages global navigation state and badge counts
 */
export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [favoritesCount, setFavoritesCount] = useState(0);

  /**
   * Updates the favorites count from AsyncStorage
   */
  const updateFavoritesCount = async () => {
    try {
      const count = await favoritesService.getFavoritesCount();
      setFavoritesCount(count);
    } catch (error) {
      console.error('Error updating favorites count:', error);
    }
  };

  // Load initial favorites count
  useEffect(() => {
    updateFavoritesCount();
  }, []);

  const value: NavigationContextType = {
    favoritesCount,
    updateFavoritesCount,
  };

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
};

/**
 * Hook to use navigation context
 * @returns NavigationContextType
 */
export const useNavigation = (): NavigationContextType => {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};
