import React from 'react';
import { Portal, Dialog, Button, Text } from 'react-native-paper';
import { COLORS } from '../constants/config';

const ConfirmDialog = ({ visible, title, message, onConfirm, onCancel }) => {
  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onCancel} style={{ borderRadius: 16 }}>
        <Dialog.Title style={{ color: COLORS.text }}>{title || 'Confirm'}</Dialog.Title>
        <Dialog.Content>
          <Text style={{ color: COLORS.textSecondary }}>{message}</Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onCancel} textColor={COLORS.textSecondary}>Cancel</Button>
          <Button onPress={onConfirm} textColor={COLORS.error}>Confirm</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

export default ConfirmDialog;
