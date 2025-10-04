import React, { useState } from 'react';
import { View } from 'react-native';
import { Searchbar, Menu, Button } from 'react-native-paper';

interface SearchAndFilterProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  categories: string[];
  placeholder?: string;
}

/**
 * SearchAndFilter component provides search and category filtering functionality
 * @param searchValue - Current search input value
 * @param onSearchChange - Function to handle search input changes
 * @param selectedCategory - Currently selected category
 * @param onCategoryChange - Function to handle category selection changes
 * @param categories - Array of available categories
 * @param placeholder - Placeholder text for search input
 * @returns JSX element with search bar and category filter
 */
export default function SearchAndFilter({
  searchValue,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  categories,
  placeholder = "Search stories..."
}: SearchAndFilterProps) {
  const [menuVisible, setMenuVisible] = useState(false);

  return (
    <View>
      <Searchbar
        placeholder={placeholder}
        value={searchValue}
        onChangeText={onSearchChange}
      />
      
      {/* Category Filter Dropdown */}
      <View style={{ marginVertical: 8 }}>
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={
            <Button
              mode="outlined"
              onPress={() => setMenuVisible(!menuVisible)}
              icon={menuVisible ? "chevron-up" : "chevron-down"}
              style={{ justifyContent: 'space-between' }}
              contentStyle={{ flexDirection: 'row', justifyContent: 'space-between' }}
            >
              Category: {selectedCategory}
            </Button>
          }
        >
          {categories.map((category) => (
            <Menu.Item
              key={category}
              onPress={() => {
                onCategoryChange(category);
                setMenuVisible(false);
              }}
              title={category}
              leadingIcon={selectedCategory === category ? "check" : undefined}
            />
          ))}
        </Menu>
      </View>
    </View>
  );
}
