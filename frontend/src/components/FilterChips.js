import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Chip } from 'react-native-paper';
import { COLORS } from '../constants/config';

const FilterChips = ({ options, selected, onSelect }) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {options.map((option) => (
        <Chip
          key={option.value}
          selected={selected === option.value}
          onPress={() => onSelect(selected === option.value ? null : option.value)}
          style={[
            styles.chip,
            selected === option.value && styles.chipSelected,
          ]}
          textStyle={[
            styles.chipText,
            selected === option.value && styles.chipTextSelected,
          ]}
          showSelectedOverlay={false}
        >
          {option.label}
        </Chip>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  chip: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    marginRight: 8,
  },
  chipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  chipTextSelected: {
    color: COLORS.white,
  },
});

export default FilterChips;
