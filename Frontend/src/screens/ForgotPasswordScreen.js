import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { forgotPassword, resetPassword, verifyOtp } from '../api';
import Card from '../components/Card';
import FormInput from '../components/FormInput';
import PrimaryButton, { GhostButton } from '../components/PrimaryButton';
import Screen from '../components/Screen';
import TopBar from '../components/TopBar';
import { colors } from '../theme';

const titles = ['Forgot Password', 'Verify OTP', 'New Password', 'All Done!'];
const subtitles = [
  'Enter your registered email address.',
  'Enter the 6-digit code sent to your email.',
  'Create a strong new password.',
  'Your password has been reset successfully.',
];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,30}$/;

export default function ForgotPasswordScreen({ go }) {
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const refs = useRef([]);

  useEffect(() => {
    if (countdown <= 0) return undefined;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  function move(next) { setError(''); setStep(next); }

  async function submitEmail() {
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!cleanEmail) return setError('Please enter your email address.');
    if (!EMAIL_REGEX.test(cleanEmail)) return setError('Please enter a valid email address.');
    setLoading(true);
    setError('');
    try {
      await forgotPassword(cleanEmail);
      setEmail(cleanEmail);
      setCountdown(60);
      move(1);
    } catch (e) { setError(e.message || 'Something went wrong.'); }
    finally { setLoading(false); }
  }

  async function submitOtp() {
    const code = otp.join('');
    if (!/^\d{6}$/.test(code)) return setError('Please enter a valid 6-digit OTP.');
    setLoading(true);
    setError('');
    try {
      await verifyOtp(email.trim(), code);
      move(2);
    } catch (e) { setError(e.message || 'Invalid OTP. Please try again.'); }
    finally { setLoading(false); }
  }

  async function resendOtp() {
    if (countdown > 0) return;
    if (!EMAIL_REGEX.test(String(email || '').trim().toLowerCase())) {
      setError('Please enter a valid email address.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await forgotPassword(email.trim());
      setOtp(['', '', '', '', '', '']);
      setCountdown(60);
      refs.current[0]?.focus?.();
    } catch (e) { setError(e.message || 'Failed to resend OTP.'); }
    finally { setLoading(false); }
  }

  async function submitPassword() {
    if (!STRONG_PASSWORD_REGEX.test(newPassword)) {
      return setError('Password must be 8 to 30 characters and include uppercase, lowercase, and a number.');
    }
    if (newPassword !== confirmPassword) return setError('Passwords do not match.');
    setLoading(true);
    setError('');
    try {
      await resetPassword(email.trim(), newPassword);
      move(3);
    } catch (e) { setError(e.message || 'Failed to reset password.'); }
    finally { setLoading(false); }
  }

  function changeOtp(index, value) {
    const clean = value.replace(/\D/g, '').slice(-1);
    const next = [...otp];
    next[index] = clean;
    setOtp(next);
    if (clean && index < 5) refs.current[index + 1]?.focus?.();
  }

  return (
    <Screen>
      <TopBar title="Recovery" onBack={() => step === 0 ? go('login') : move(step - 1)} />
      <Card style={styles.card}>
        <View style={styles.progressTrack}><View style={[styles.progress, { width: `${(step / 3) * 100}%` }]} /></View>
        <View style={styles.iconCircle}>
          <Ionicons name={step === 3 ? 'checkmark-circle' : 'key-outline'} size={34} color={step === 3 ? colors.emerald : colors.purple} />
        </View>
        <Text style={styles.title}>{titles[step]}</Text>
        <Text style={styles.sub}>{step === 1 ? `Enter the 6-digit code sent to ${email}` : subtitles[step]}</Text>
        {!!error && <Text style={styles.error}>{error}</Text>}

        {step === 0 && (
          <View style={styles.formGap}>
            <FormInput label="Email Address" icon="mail-outline" placeholder="name@example.com" value={email} onChangeText={setEmail} keyboardType="email-address" />
            <PrimaryButton title="Send OTP" onPress={submitEmail} loading={loading} />
          </View>
        )}

        {step === 1 && (
          <View style={styles.formGap}>
            <View style={styles.otpRow}>
              {otp.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(el) => { refs.current[index] = el; }}
                  value={digit}
                  onChangeText={(v) => changeOtp(index, v)}
                  keyboardType="number-pad"
                  maxLength={1}
                  style={styles.otpBox}
                />
              ))}
            </View>
            <PrimaryButton title="Verify OTP" onPress={submitOtp} loading={loading} variant="purple" />
            <Pressable onPress={resendOtp} disabled={countdown > 0 || loading}>
              <Text style={[styles.resend, countdown > 0 && { opacity: 0.45 }]}>{countdown > 0 ? `Resend in ${countdown}s` : 'Resend OTP'}</Text>
            </Pressable>
          </View>
        )}

        {step === 2 && (
          <View style={styles.formGap}>
            <FormInput label="New Password" icon="lock-closed-outline" placeholder="Minimum 8 characters" value={newPassword} onChangeText={setNewPassword} secureTextEntry />
            <FormInput label="Confirm Password" icon="shield-checkmark-outline" placeholder="Repeat new password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />
            <PrimaryButton title="Reset Password" onPress={submitPassword} loading={loading} />
          </View>
        )}

        {step === 3 && (
          <View style={styles.formGap}>
            <Text style={styles.successText}>You can now login with your new password.</Text>
            <PrimaryButton title="Back to Login" onPress={() => go('login')} />
          </View>
        )}
      </Card>
      <GhostButton title="Back to Landing" onPress={() => go('landing')} style={{ marginTop: 14 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 26, gap: 14 },
  progressTrack: { position: 'absolute', top: 0, left: 0, right: 0, height: 5, backgroundColor: 'rgba(0,122,94,0.08)', borderTopLeftRadius: 30, borderTopRightRadius: 30, overflow: 'hidden' },
  progress: { height: 5, backgroundColor: colors.emerald },
  iconCircle: { alignSelf: 'center', width: 76, height: 76, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(124,58,237,0.10)', marginTop: 8 },
  title: { color: colors.slate, textAlign: 'center', fontSize: 30, fontWeight: '900', letterSpacing: -1 },
  sub: { color: 'rgba(15,23,42,0.56)', textAlign: 'center', fontWeight: '700', lineHeight: 21 },
  error: { backgroundColor: '#FEF2F2', color: colors.danger, borderWidth: 1, borderColor: '#FECACA', padding: 12, borderRadius: 16, textAlign: 'center', fontWeight: '800' },
  formGap: { gap: 14, marginTop: 8 },
  otpRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  otpBox: { flex: 1, height: 54, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: 'rgba(255,255,255,0.72)', textAlign: 'center', fontSize: 20, color: colors.slate, fontWeight: '900' },
  resend: { color: colors.purple, fontWeight: '900', textAlign: 'center', paddingVertical: 8 },
  successText: { color: 'rgba(15,23,42,0.62)', fontWeight: '700', textAlign: 'center', lineHeight: 22 },
});
