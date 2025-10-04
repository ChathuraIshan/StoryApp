import React, { useEffect, useState } from 'react';
import { View, FlatList, ScrollView, Alert } from 'react-native';
import { Text, Card, IconButton, Modal, Portal } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import SearchAndFilter from '../components/SearchAndFilter';
import { storyService } from '../services/storyService';
import { favoritesService } from '../services/favoritesService';
import { useNavigation } from '../contexts/NavigationContext';
import { Story } from '../types';

/**
 * HomeScreen component displays all stories in real-time
 * Allows users to like, dislike, delete stories and manage favorites
 * @returns JSX element with stories list and interaction features
 */
export default function HomeScreen() {
  const [stories, setStories] = useState<Story[]>([]);
  const [search, setSearch] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [categories, setCategories] = useState<string[]>(['All']);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  
  const { updateFavoritesCount } = useNavigation();

  useEffect(() => {
    // Set up real-time subscription to stories
    const unsubscribe = storyService.subscribeToStories((storiesData) => {
      setStories(storiesData);
      
      // Extract unique categories
      const uniqueCategories = ['All', ...new Set(storiesData.map(story => story?.category).filter(category => category && typeof category === 'string' && category.trim() !== ''))];
      setCategories(uniqueCategories);
    });

    // Load favorites on component mount
    loadFavorites();

    // Cleanup listener on component unmount
    return unsubscribe;
  }, []);

  // Refresh favorites when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('HomeScreen focused - refreshing favorites');
      loadFavorites();
    }, [])
  );

  /**
   * Loads favorite story IDs using the favorites service
   */
  const loadFavorites = async () => {
    try {
      const favs = await favoritesService.getFavorites();
      setFavorites(favs);
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  };

  /**
   * Toggles a story's favorite status using the favorites service
   * @param story - The story object to toggle favorite status for
   */
  const toggleFavorite = async (story: Story) => {
    try {
      const isFavorite = favorites.includes(story.id);
      
      if (isFavorite) {
        // Remove from favorites
        const updatedFavorites = await favoritesService.removeFavorite(story.id);
        setFavorites(updatedFavorites);
      } else {
        try {
          // Add to favorites
          const updatedFavorites = await favoritesService.addFavorite(story.id);
          setFavorites(updatedFavorites);
        } catch (error: any) {
          if (error.code === 'FAVORITES_LIMIT_EXCEEDED') {
            alert(error.message);
          } else {
            throw error;
          }
        }
      }
      
      // Update navigation badge count
      await updateFavoritesCount();
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
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
   * Deletes a story with confirmation dialog using the story service
   * Also removes the story from favorites if it exists
   * @param story - The story object to delete
   */
  const handleDelete = async (story: Story) => {
    Alert.alert(
      'Delete Story',
      `Are you sure you want to delete "${story.title}"? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete from Firestore using story service
              await storyService.deleteStory(story.id);
              
              // Remove from favorites if it exists using favorites service
              if (favorites.includes(story.id)) {
                const updatedFavorites = await favoritesService.removeFavorite(story.id);
                setFavorites(updatedFavorites);
                // Update navigation badge count
                await updateFavoritesCount();
              }
            } catch (error) {
              console.error('Error deleting story:', error);
              Alert.alert('Error', 'Failed to delete story. Please try again.');
            }
          },
        },
      ]
    );
  };

  // Filter stories based on search and category
  const filteredStories = stories.filter(story => {
    const matchesSearch = story.title.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || story.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

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

  return (
    <View style={{ flex: 1, padding: 10 }}>
      <SearchAndFilter
        searchValue={search}
        onSearchChange={setSearch}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        categories={categories}
        placeholder="Search stories..."
      />
      
      <FlatList
        data={filteredStories}
        keyExtractor={(item) => item.id}
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
              right={(props) => (
                <View style={{ flexDirection: 'row' }}>
                  <IconButton 
                    {...props}
                    icon={favorites.includes(item.id) ? "heart" : "heart-outline"} 
                    iconColor={favorites.includes(item.id) ? "red" : "gray"}
                    onPress={() => toggleFavorite(item)} 
                    size={16}
                  />
                  <IconButton 
                    {...props}
                    icon="thumb-up" 
                    size={16}
                    onPress={() => handleLike(item)}
                    iconColor="#1976d2"
                  />
                  <IconButton 
                    {...props}
                    icon="thumb-down" 
                    size={16}
                    onPress={() => handleDislike(item)}
                    iconColor="#1976d2"
                  />
                </View>
              )}
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
              <IconButton 
                icon="delete" 
                size={16}
                onPress={() => handleDelete(item)}
                iconColor="#d32f2f"
                style={{ backgroundColor: 'transparent', elevation: 0, shadowOpacity: 0 }}
                rippleColor="transparent"
              />
            </Card.Actions>
          </Card>
        )}
      />
      
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
