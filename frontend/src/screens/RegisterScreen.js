import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Text, TextInput, Button, Snackbar } from 'react-native-paper';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../constants/config';

const RegisterScreen = ({ navigation }) => {
  const { register } = useAuth();
  const [form, setForm] = useState({ name: '', username: '', email: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const updateField = (field, value) => setForm({ ...form, [field]: value });

  const handleRegister = async () => {
    if (!form.name.trim()) return setError('Name is required');
    if (!form.username.trim()) return setError('Username is required');
    if (form.username.length < 3) return setError('Username must be at least 3 characters');
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) return setError('Invalid email format');
    if (form.password.length < 6) return setError('Password must be at least 6 characters');
    if (form.password !== form.confirmPassword) return setError('Passwords do not match');

    setLoading(true);
    setError('');
    const result = await register({
      name: form.name.trim(),
      username: form.username.trim(),
      email: form.email.trim() || undefined,
      password: form.password,
      role: 'ADMIN', // Default to ADMIN for testing
    });
    setLoading(false);

    if (!result.success) {
      setError(result.message);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.logo}>INVIGO</Text>
          <Text style={styles.subtitle}>Create Your Account</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.title}>Register</Text>

          <TextInput label="Full Name" value={form.name} onChangeText={v => updateField('name', v)}
            mode="outlined" style={styles.input} left={<TextInput.Icon icon="account" />}
            outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} />

          <TextInput label="Username" value={form.username} onChangeText={v => updateField('username', v)}
            mode="outlined" style={styles.input} autoCapitalize="none" left={<TextInput.Icon icon="at" />}
            outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} />

          <TextInput label="Email (optional)" value={form.email} onChangeText={v => updateField('email', v)}
            mode="outlined" style={styles.input} autoCapitalize="none" keyboardType="email-address"
            left={<TextInput.Icon icon="email" />} outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} />

          <TextInput label="Password" value={form.password} onChangeText={v => updateField('password', v)}
            mode="outlined" style={styles.input} secureTextEntry={!showPassword}
            left={<TextInput.Icon icon="lock" />}
            right={<TextInput.Icon icon={showPassword ? 'eye-off' : 'eye'} onPress={() => setShowPassword(!showPassword)} />}
            outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} />

          <TextInput label="Confirm Password" value={form.confirmPassword} onChangeText={v => updateField('confirmPassword', v)}
            mode="outlined" style={styles.input} secureTextEntry={!showPassword}
            left={<TextInput.Icon icon="lock-check" />}
            outlineColor={COLORS.border} activeOutlineColor={COLORS.primary} />

          <Button mode="contained" onPress={handleRegister} loading={loading} disabled={loading}
            style={styles.button} buttonColor={COLORS.primary} contentStyle={{ paddingVertical: 6 }}>
            Create Account
          </Button>

          <Button mode="text" onPress={() => navigation.navigate('Login')} textColor={COLORS.primary} style={{ marginTop: 12 }}>
            Already have an account? Sign In
          </Button>
        </View>
      </ScrollView>

      <Snackbar visible={!!error} onDismiss={() => setError('')} duration={3000} style={{ backgroundColor: COLORS.error }}>
        {error}
      </Snackbar>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.secondary },
  scroll: { flexGrow: 1 },
  header: { alignItems: 'center', paddingTop: 60, paddingBottom: 30 },
  logo: { fontSize: 36, fontWeight: '800', color: COLORS.primary, letterSpacing: 4 },
  subtitle: { fontSize: 14, color: COLORS.textLight, marginTop: 8 },
  form: {
    flex: 1, backgroundColor: COLORS.background,
    borderTopLeftRadius: 30, borderTopRightRadius: 30,
    paddingHorizontal: 24, paddingTop: 24,
  },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.text, marginBottom: 16 },
  input: { marginBottom: 12, backgroundColor: COLORS.surface },
  button: { borderRadius: 12, marginTop: 8 },
});

export default RegisterScreen;
