import React, { useState } from 'react';
import { ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Snackbar } from 'react-native-paper';
import { usersAPI } from '../../services/api';
import { COLORS } from '../../constants/config';

const EditUserScreen = ({ route, navigation }) => {
  const { user } = route.params;
  const [form, setForm] = useState({
    name: user.name || '',
    username: user.username || '',
    email: user.email || '',
    password: '',
    role: user.role || 'STAFF',
    status: user.status || 'ACTIVE',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const update = (k, v) => setForm({ ...form, [k]: v });

  const handleSubmit = async () => {
    if (!form.name.trim()) return setError('Name is required');
    if (!form.username.trim()) return setError('Username is required');

    setLoading(true);
    try {
      const data = { ...form };
      if (!data.password) delete data.password; // only send if changed
      await usersAPI.update(user._id, data);
      navigation.goBack();
    } catch (err) {
      setError(err.response?.data?.message || 'Update failed');
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <TextInput label="Full Name *" value={form.name} onChangeText={v => update('name', v)}
          mode="outlined" style={styles.input} outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} />

        <TextInput label="Username *" value={form.username} onChangeText={v => update('username', v)}
          mode="outlined" style={styles.input} autoCapitalize="none" outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} />

        <TextInput label="Email" value={form.email} onChangeText={v => update('email', v)}
          mode="outlined" style={styles.input} autoCapitalize="none" keyboardType="email-address" outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} />

        <TextInput label="New Password (leave blank to keep current)" value={form.password} onChangeText={v => update('password', v)}
          mode="outlined" style={styles.input} secureTextEntry={!showPassword}
          right={<TextInput.Icon icon={showPassword ? 'eye-off' : 'eye'} onPress={() => setShowPassword(!showPassword)} />}
          outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} />

        <TextInput label="Role (ADMIN/STAFF)" value={form.role} onChangeText={v => update('role', v)}
          mode="outlined" style={styles.input} outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} />

        <TextInput label="Status (ACTIVE/INACTIVE)" value={form.status} onChangeText={v => update('status', v)}
          mode="outlined" style={styles.input} outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} />

        <Button mode="contained" onPress={handleSubmit} loading={loading} disabled={loading}
          style={styles.btn} buttonColor={COLORS.primary} contentStyle={{ paddingVertical: 6 }}>
          Update User
        </Button>
      </ScrollView>

      <Snackbar visible={!!error} onDismiss={() => setError('')} duration={3000} style={{ backgroundColor: COLORS.error }}>
        {error}
      </Snackbar>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  input: { marginBottom: 12, backgroundColor: COLORS.surface },
  btn: { borderRadius: 12, marginTop: 8, marginBottom: 32 },
});

export default EditUserScreen;
