import React, { useEffect, useState } from 'react';
import { View, FlatList, Alert, RefreshControl, ScrollView } from 'react-native';
import { Card, Text, IconButton, Button, Modal, Portal } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import SearchAndFilter from '../components/SearchAndFilter';
import { storyService } from '../services/storyService';
import { favoritesService } from '../services/favoritesService';
import { useNavigation } from '../contexts/NavigationContext';
import { Story } from '../types';

/**
 * FavoritesScreen component displays user's favorite stories
 * Allows users to view, search, filter, and manage their favorite stories
 * @returns JSX element with favorites list and management features
 */
export default function FavoritesScreen() {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [favoriteStories, setFavoriteStories] = useState<Story[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  
  const { updateFavoritesCount } = useNavigation();

  useEffect(() => {
    loadFavorites();
  }, []);

  // Refresh favorites when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('FavoritesScreen focused - refreshing favorites');
      loadFavorites();
    }, [])
  );

  /**
   * Loads favorite stories using the service layer
   * @param showRefresh - Whether to show refresh indicator during loading
   */
  const loadFavorites = async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      setLoading(true);
      setError(null);
      
      // Get favorite IDs using favorites service
      const favIds = await favoritesService.getFavorites();
      setFavorites(favIds);
      
      if (favIds.length > 0) {
        // Fetch full story data using story service
        const storiesData = await storyService.getStoriesByIds(favIds);
        setFavoriteStories(storiesData);
        console.log('Loaded favorite stories:', storiesData.length);
        
        // Remove non-existent stories from favorites
        const existingStoryIds = storiesData.map(story => story.id);
        const nonExistentIds = favIds.filter(id => !existingStoryIds.includes(id));
        
        if (nonExistentIds.length > 0) {
          console.log('Removing non-existent stories from favorites:', nonExistentIds);
          const updatedFavorites = await favoritesService.removeMultipleFavorites(nonExistentIds);
          setFavorites(updatedFavorites);
        }
      } else {
        setFavoriteStories([]);
        console.log('No favorites found');
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
      setError('Failed to load favorites. Please try again.');
    } finally {
      setLoading(false);
      if (showRefresh) setRefreshing(false);
    }
  };

  /**
   * Handles manual refresh of favorites list
   */
  const onRefresh = () => {
    console.log('Manual refresh triggered');
    loadFavorites(true);
  };

  /**
   * Removes a story from favorites with confirmation dialog using the favorites service
   * @param story - The story object to remove from favorites
   */
  const removeFavorite = async (story: Story) => {
    Alert.alert(
      'Remove from Favorites',
      `Are you sure you want to remove "${story.title}" from your favorites?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const updatedFavorites = await favoritesService.removeFavorite(story.id);
              setFavorites(updatedFavorites);
              setFavoriteStories(favoriteStories.filter(s => s.id !== story.id));
              // Update navigation badge count
              await updateFavoritesCount();
            } catch (error) {
              console.error('Error removing favorite:', error);
            }
          },
        },
      ]
    );
  };

  /**
   * Clears all favorites with confirmation dialog using the favorites service
   */
  const clearAllFavorites = () => {
    Alert.alert(
      'Clear All Favorites',
      'Are you sure you want to remove all stories from your favorites?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await favoritesService.clearFavorites();
              setFavorites([]);
              setFavoriteStories([]);
              // Update navigation badge count
              await updateFavoritesCount();
            } catch (error) {
              console.error('Error clearing favorites:', error);
            }
          },
        },
      ]
    );
  };

  /**
   * Increments the like count for a story using the story service
   * @param story - The story object to like
   */
  const handleLike = async (story: Story) => {
    try {
      await storyService.likeStory(story.id);
    } catch (error) {
      console.error('Error liking story:', error);
    }
  };

  /**
   * Increments the dislike count for a story using the story service
   * @param story - The story object to dislike
   */
  const handleDislike = async (story: Story) => {
    try {
      await storyService.dislikeStory(story.id);
    } catch (error) {
      console.error('Error disliking story:', error);
    }
  };

  /**
   * Opens the story modal when a card is pressed
   * @param story - The story object to display in the modal
   */
  const handleCardPress = (story: Story) => {
    setSelectedStory(story);
    setModalVisible(true);
  };

  /**
   * Closes the story modal and clears selected story
   */
  const handleModalClose = () => {
    setModalVisible(false);
    setSelectedStory(null);
  };

  /**
   * Gets unique categories from favorite stories for filtering
   * @returns Array of unique category names including 'All'
   */
  const getCategories = () => {
    const uniqueCategories = ['All', ...new Set(favoriteStories.map(story => story?.category).filter(category => category && typeof category === 'string' && category.trim() !== ''))];
    return uniqueCategories;
  };

  // Filter favorite stories based on search and category
  const filteredFavoriteStories = favoriteStories.filter(story => {
    const matchesSearch = story.title.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || story.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <View style={{ flex: 1, padding: 10 }}>
      {favoriteStories.length > 0 && (
        <>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
            <Text style={{ fontSize: 16, fontWeight: 'bold' }}>
              {filteredFavoriteStories.length} of {favoriteStories.length} Favorite{favoriteStories.length !== 1 ? 's' : ''}
            </Text>
            <Button 
              mode="outlined" 
              onPress={clearAllFavorites}
              textColor="red"
              compact
            >
              Clear All
            </Button>
          </View>
          
          <SearchAndFilter
            searchValue={search}
            onSearchChange={setSearch}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            categories={getCategories()}
            placeholder="Search favorites..."
          />
        </>
      )}
      
      {error ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ fontSize: 18, color: 'red', textAlign: 'center' }}>{error}</Text>
          <Button 
            mode="contained" 
            onPress={() => loadFavorites(true)}
            style={{ marginTop: 16 }}
          >
            Try Again
          </Button>
        </View>
      ) : loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 18, color: '#666' }}>Loading favorites...</Text>
        </View>
      ) : favoriteStories.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 18, color: '#666' }}>No favorites yet</Text>
          <Text style={{ fontSize: 14, color: '#999', marginTop: 8 }}>
            Tap the heart icon on stories to add them to favorites
          </Text>
        </View>
      ) : filteredFavoriteStories.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 18, color: '#666' }}>No favorites match your search</Text>
          <Text style={{ fontSize: 14, color: '#999', marginTop: 8 }}>
            Try adjusting your search term or category filter
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredFavoriteStories}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#6200ee']}
              tintColor="#6200ee"
            />
          }
          renderItem={({ item }) => (
            <Card 
              style={{ marginVertical: 3, marginHorizontal: 4 }}
              onPress={() => handleCardPress(item)}
              mode="outlined"
            >
              <Card.Title 
                title={item.title}
                titleStyle={{ fontSize: 16, fontWeight: 'bold', color: '#1976d2' }}
                subtitle={`${item.category} • ${item.timestamp ? new Date(item.timestamp.seconds * 1000).toLocaleDateString('en-US') + ' ' + new Date(item.timestamp.seconds * 1000).toLocaleTimeString('en-US', {hour: 'numeric', minute:'2-digit', hour12: true}) : 'Just now'}`}
                subtitleStyle={{ fontSize: 12 }}
                style={{ paddingVertical: 2, paddingHorizontal: 6 }}
              />
              <Card.Content style={{ paddingVertical: 2, paddingHorizontal: 6 }}>
                <Text style={{ fontSize: 14, lineHeight: 16 }}>{item.content.slice(0, 80)}...</Text>
              </Card.Content>
              <Card.Actions style={{ paddingVertical: 2, paddingHorizontal: 4, justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, color: '#666', marginRight: 8 }}>
                    👍 {item.Like || 0} 👎 {item.Dislike || 0}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row' }}>
                  <IconButton 
                    icon="heart" 
                    iconColor="red"
                    onPress={() => removeFavorite(item)} 
                    size={16}
                  />
                  <IconButton 
                    icon="thumb-up" 
                    size={16}
                    onPress={() => handleLike(item)}
                    iconColor="#1976d2"
                  />
                  <IconButton 
                    icon="thumb-down" 
                    size={16}
                    onPress={() => handleDislike(item)}
                    iconColor="#1976d2"
                  />
                </View>
              </Card.Actions>
            </Card>
          )}
        />
      )}
      
      {/* Story Modal */}
      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={handleModalClose}
          contentContainerStyle={{
            backgroundColor: 'white',
            margin: 10,
            borderRadius: 8,
            maxHeight: '90%',
            minHeight: '70%',
            elevation: 0,
            shadowOpacity: 0,
          }}
        >
          {selectedStory && (
            <View style={{ flex: 1 }}>
              {/* Header with close button */}
              <View style={{ 
                flexDirection: 'row', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: 16,
                backgroundColor: '#f5f5f5',
                borderTopLeftRadius: 8,
                borderTopRightRadius: 8
              }}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1976d2', flex: 1, marginRight: 10 }}>
                  {selectedStory.title}
                </Text>
                <IconButton 
                  icon="close" 
                  size={20}
                  onPress={handleModalClose}
                  iconColor="#666"
                />
              </View>
              
              {/* Story content */}
              <ScrollView style={{ flex: 1, padding: 16 }}>
                <Text style={{ fontSize: 16, lineHeight: 24, color: '#333' }}>
                  {selectedStory.content}
                </Text>
              </ScrollView>
            </View>
          )}
        </Modal>
      </Portal>
    </View>
  );
}
