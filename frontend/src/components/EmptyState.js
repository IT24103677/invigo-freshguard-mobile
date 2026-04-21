import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { COLORS } from '../constants/config';

const EmptyState = ({ icon = 'inbox', message = 'No data found' }) => {
  return (
    <View style={styles.container}>
      <Icon source={icon} size={64} color={COLORS.disabled} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
});

export default EmptyState;
