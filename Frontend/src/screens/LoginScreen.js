import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { clearSession, saveSession } from '../session';
import { loginUser } from '../api';
import Card from '../components/Card';
import FormInput from '../components/FormInput';
import Logo from '../components/Logo';
import PrimaryButton, { GhostButton } from '../components/PrimaryButton';
import Screen from '../components/Screen';
import TopBar from '../components/TopBar';
import { colors } from '../theme';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen({ go, setSessionUser }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { clearSession(); }, []);

  async function handleLogin() {
    const cleanIdentifier = String(identifier || '').trim();

    if (!cleanIdentifier) {
      setError('Please enter your username or email address.');
      return;
    }

    if (cleanIdentifier.includes('@') && !EMAIL_REGEX.test(cleanIdentifier.toLowerCase())) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const auth = await loginUser(cleanIdentifier, password);
      const user = {
        id: auth.id,
        username: auth.username,
        name: auth.name,
        email: auth.email,
        doj: auth.doj,
        role: auth.role,
        accountLocked: Boolean(auth.accountLocked),
        status: auth.status || 'ACTIVE',
        lastLoginAt: auth.lastLoginAt || '',
      };
      await saveSession({ token: auth.token, user });
      setSessionUser(user);
    } catch (e) {
      setError(e.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <TopBar title="Login" onBack={() => go('landing')} />
      <View style={styles.brandBlock}>
        <Logo />
        <Text style={styles.kicker}>AI Excellence</Text>
        <Text style={styles.heading}>Welcome Back</Text>
        <Text style={styles.sub}>Sign in once and your server-side account will open the correct workspace automatically.</Text>
      </View>

      <Card style={styles.card}>
        {!!error && <Text style={styles.error}>{error}</Text>}
        <FormInput label="Email Address or Username" icon="mail-outline" placeholder="you@example.com or username" value={identifier} onChangeText={setIdentifier} />
        <FormInput label="Password" icon="lock-closed-outline" placeholder="Enter your password" value={password} onChangeText={setPassword} secureTextEntry />

        <PrimaryButton title="Sign In" onPress={handleLogin} loading={loading} />
        <GhostButton title="Forgot Password?" onPress={() => go('forgot')} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brandBlock: { marginTop: 6, marginBottom: 20 },
  kicker: { marginTop: 34, alignSelf: 'flex-start', color: colors.emerald, backgroundColor: 'rgba(0,122,94,0.10)', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.8, fontSize: 10 },
  heading: { color: colors.slate, fontSize: 36, fontWeight: '900', letterSpacing: -1.2, marginTop: 18 },
  sub: { color: 'rgba(15,23,42,0.58)', fontWeight: '700', fontSize: 15, lineHeight: 23, marginTop: 8 },
  card: { gap: 14 },
  error: { backgroundColor: '#FEF2F2', color: colors.danger, borderWidth: 1, borderColor: '#FECACA', padding: 12, borderRadius: 16, textAlign: 'center', fontWeight: '800' },
});
