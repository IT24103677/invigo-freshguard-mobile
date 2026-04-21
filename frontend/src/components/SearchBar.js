import React from 'react';
import { Searchbar } from 'react-native-paper';
import { COLORS } from '../constants/config';

const SearchBar = ({ value, onChangeText, placeholder = 'Search...' }) => {
  return (
    <Searchbar
      placeholder={placeholder}
      onChangeText={onChangeText}
      value={value}
      style={{
        marginHorizontal: 16,
        marginVertical: 8,
        backgroundColor: COLORS.surface,
        elevation: 2,
        borderRadius: 12,
      }}
      inputStyle={{ fontSize: 14 }}
      iconColor={COLORS.primary}
    />
  );
};

export default SearchBar;
