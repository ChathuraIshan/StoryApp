import React, { useState, useEffect } from 'react';
import { View, TouchableWithoutFeedback, Keyboard, Alert } from 'react-native';
import { TextInput, Button, Menu, Text, useTheme } from 'react-native-paper';
import * as Location from 'expo-location';
import { storyService } from '../services/storyService';
import { useOffline } from '../contexts/OfflineContext';
import { StoryCreateData, LocationData } from '../types';

/**
 * WriteScreen component allows users to create and publish new stories
 * Includes location tagging and category selection features
 * @returns JSX element with story creation form
 */
export default function WriteScreen() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [menuVisible, setMenuVisible] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const { isOffline, refreshPendingStories } = useOffline();
  const theme = useTheme();

  const categories = [
    { id: '1', name: 'Crime' },
    { id: '2', name: 'Romance' },
    { id: '3', name: 'Horror' },
    { id: '4', name: 'Comedy' },
    { id: '5', name: 'Science Fiction' },
    { id: '6', name: 'Other' }
  ];

  // Get current location on component mount
  useEffect(() => {
    getCurrentLocation();
  }, []);

  /**
   * Gets the user's current location with permission handling
   */
  const getCurrentLocation = async () => {
    try {
      // Request permission
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required to tag your story.');
        return;
      }

      // Get current position
      let location = await Location.getCurrentPositionAsync({});
      setCurrentLocation(location);
      console.log('Current location:', location.coords.latitude, location.coords.longitude);
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Location Error', 'Could not get your current location.');
    }
  };

  /**
   * Saves a new story using the story service and resets the form
   */
  const saveStory = async () => {
    if (!title || !content) {
      Alert.alert('Missing Information', 'Please fill in both title and content.');
      return;
    }

    if (!categoryId) {
      Alert.alert('Missing Category', 'Please select a category for your story.');
      return;
    }

    setIsSaving(true);
    
    try {
      // Prepare location data
      const locationData: LocationData | null = currentLocation ? {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        accuracy: currentLocation.coords.accuracy || 0,
        timestamp: currentLocation.timestamp
      } : null;

      // Prepare story data
      const storyData: StoryCreateData = {
        title: title.trim(),
        content: content.trim(),
        category,
        categoryId,
        location: locationData
      };

      // Save story using story service
      const storyId = await storyService.createStory(storyData);
      
      // Check if story was saved offline
      const isOfflineStory = storyId.startsWith('pending_');
      
      if (isOfflineStory) {
        console.log('Story saved offline with ID:', storyId);
        Alert.alert(
          'Story Saved Offline', 
          'Your story has been saved locally and will be published when you\'re back online.',
          [
            { text: 'OK' }
          ]
        );
      } else {
        console.log('Story published online with ID:', storyId);
        Alert.alert('Success', 'Your story has been published successfully!');
      }
      
      // Refresh pending stories count
      await refreshPendingStories();
      
      // Reset form after successful save
      setTitle('');
      setContent('');
      setCategory('');
      setCategoryId('');
    } catch (error) {
      console.error('Error saving story:', error);
      Alert.alert('Error', 'Failed to save your story. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={{ flex: 1, padding: 20 }}>
        <TextInput
          label="Title"
          value={title}
          onChangeText={setTitle}
          style={{ marginBottom: 10 }}
        />
      
      
      <Menu
        visible={menuVisible}
        onDismiss={() => setMenuVisible(false)}
        anchor={
          <Button
            mode="outlined"
            onPress={() => setMenuVisible(!menuVisible)}
            style={{ marginBottom: 20 }}
          >
            {category ? category : 'Select Category'}
          </Button>
        }
      >
        {categories.map((cat) => (
          <Menu.Item
            key={cat.id}
            onPress={() => {
              setCategory(cat.name);
              setCategoryId(cat.id);
              setMenuVisible(false);
            }}
            title={cat.name}
          />
        ))}
      </Menu>
       <TextInput
         label="Your Story"
         value={content}
         onChangeText={setContent}
         multiline
         numberOfLines={8}
         style={{ 
           marginBottom: 20,
           minHeight: 420,
           textAlignVertical: 'top',
           lineHeight: 24,
           paddingTop: 12
         }}
         placeholder="Write your story here..."
         mode="outlined"
         textAlignVertical="top"
         autoCorrect={true}
         spellCheck={true}
         returnKeyType="default"
         blurOnSubmit={false}
       />
      {/* Offline indicator */}
      {isOffline && (
        <View style={{ 
          backgroundColor: '#fff3cd', 
          padding: 12, 
          borderRadius: 8, 
          marginBottom: 16,
          borderLeftWidth: 4,
          borderLeftColor: '#ffc107'
        }}>
          <Text style={{ 
            color: '#856404', 
            fontSize: 14, 
            textAlign: 'center',
            fontWeight: '500'
          }}>
            📡 You're offline. Stories will be saved locally and synced when online.
          </Text>
        </View>
      )}
      
      <Button 
        mode="contained" 
        onPress={saveStory}
        loading={isSaving}
        disabled={isSaving}
        style={{
          backgroundColor: isOffline ? '#6c757d' : theme.colors.primary
        }}
      >
        {isSaving ? (isOffline ? 'Saving Offline...' : 'Publishing...') : (isOffline ? 'Save Offline' : 'Publish')}
      </Button>
      </View>
    </TouchableWithoutFeedback>
  );
}
