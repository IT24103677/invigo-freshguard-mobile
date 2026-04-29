import React, { useState } from 'react';
import { Text, TextInput, View, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

export default function FormInput({
  label,
  icon,
  secureTextEntry,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  autoCapitalize = 'none',
  style,
  maxLength,
  multiline = false,
  ...rest
}) {
  const [show, setShow] = useState(false);
  const isSecure = secureTextEntry && !show;
  return (
    <View style={[styles.wrap, style]}>
      {!!label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputWrap, multiline && styles.inputWrapMultiline]}>
        {!!icon && <Ionicons name={icon} size={19} color="rgba(15,23,42,0.35)" style={styles.icon} />}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="rgba(15,23,42,0.32)"
          secureTextEntry={isSecure}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          style={[
            styles.input,
            multiline && styles.inputMultiline,
            icon && { paddingLeft: 44 },
            secureTextEntry && { paddingRight: 48 },
          ]}
          maxLength={maxLength}
          {...rest}
        />
        {secureTextEntry && (
          <Pressable style={styles.eye} onPress={() => setShow((s) => !s)}>
            <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={20} color="rgba(15,23,42,0.45)" />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  label: { fontSize: 10, fontWeight: '900', letterSpacing: 1.2, textTransform: 'uppercase', color: 'rgba(15,23,42,0.45)' },
  inputWrap: { height: 56, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: 'rgba(255,255,255,0.72)', justifyContent: 'center' },
  inputWrapMultiline: { minHeight: 120, height: 'auto', paddingVertical: 12, justifyContent: 'flex-start' },
  icon: { position: 'absolute', left: 16, zIndex: 1 },
  input: { flex: 1, paddingHorizontal: 16, color: colors.slate, fontWeight: '800', fontSize: 14 },
  inputMultiline: { minHeight: 96, paddingTop: 12, paddingBottom: 12 },
  eye: { position: 'absolute', right: 16, height: 56, justifyContent: 'center' },
});
