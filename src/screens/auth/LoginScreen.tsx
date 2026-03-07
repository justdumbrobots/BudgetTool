/**
 * Login Screen
 *
 * Two modes (toggled via tabs):
 *   Sign In  — email + password → signInWithEmail
 *   Sign Up  — email + password → signUpWithEmail
 *
 * Also provides Google OAuth sign-in via the auth store.
 *
 * After successful sign-in the auth store's onAuthStateChange listener
 * updates the user, which causes AppNavigator to route to Main or Onboarding.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Colors } from '../../theme/colors';
import { useAuthStore } from '../../store/useAuthStore';

// ─── Google Button ────────────────────────────────────────────────────────────

function GoogleButton({ onPress, loading }: { onPress: () => void; loading: boolean }) {
  return (
    <TouchableOpacity
      style={styles.googleBtn}
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={Colors.bgPrimary} size="small" />
      ) : (
        <>
          <Text style={styles.googleIcon}>G</Text>
          <Text style={styles.googleBtnText}>Continue with Google</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

// ─── Divider ─────────────────────────────────────────────────────────────────

function OrDivider() {
  return (
    <View style={styles.dividerRow}>
      <View style={styles.dividerLine} />
      <Text style={styles.dividerText}>or</Text>
      <View style={styles.dividerLine} />
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export function LoginScreen() {
  const { signInWithEmail, signUpWithEmail, signInWithGoogle, error, clearError } = useAuthStore();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Show Supabase errors as alerts
  useEffect(() => {
    if (error) {
      Alert.alert('Authentication Error', error, [
        { text: 'OK', onPress: clearError },
      ]);
    }
  }, [error, clearError]);

  const handleEmailAuth = async () => {
    if (!email.trim()) {
      Alert.alert('Email required', 'Please enter your email address.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Password too short', 'Password must be at least 6 characters.');
      return;
    }
    if (mode === 'signup' && password !== confirmPassword) {
      Alert.alert('Passwords do not match', 'Please make sure both passwords are identical.');
      return;
    }

    setEmailLoading(true);
    if (mode === 'signin') {
      await signInWithEmail(email.trim(), password);
    } else {
      await signUpWithEmail(email.trim(), password);
      // Supabase sends a confirmation email by default; inform the user
      if (!error) {
        Alert.alert(
          'Check your email',
          'A confirmation link has been sent to your email address. Click it to activate your account.',
        );
      }
    }
    setEmailLoading(false);
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    await signInWithGoogle();
    setGoogleLoading(false);
  };

  const switchMode = (next: 'signin' | 'signup') => {
    setMode(next);
    clearError();
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Branding */}
          <View style={styles.branding}>
            <Text style={styles.appName}>PayPeriod</Text>
            <Text style={styles.tagline}>Your bi-weekly budget, simplified.</Text>
          </View>

          {/* Mode tabs */}
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tab, mode === 'signin' && styles.tabActive]}
              onPress={() => switchMode('signin')}
            >
              <Text style={[styles.tabText, mode === 'signin' && styles.tabTextActive]}>
                Sign In
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, mode === 'signup' && styles.tabActive]}
              onPress={() => switchMode('signup')}
            >
              <Text style={[styles.tabText, mode === 'signup' && styles.tabTextActive]}>
                Create Account
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form card */}
          <View style={styles.card}>
            {/* Google */}
            <GoogleButton onPress={handleGoogle} loading={googleLoading} />

            <OrDivider />

            {/* Email */}
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={Colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            {/* Password */}
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={Colors.textMuted}
              secureTextEntry
            />

            {/* Confirm password (sign-up only) */}
            {mode === 'signup' && (
              <>
                <Text style={styles.label}>Confirm Password</Text>
                <TextInput
                  style={styles.input}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="••••••••"
                  placeholderTextColor={Colors.textMuted}
                  secureTextEntry
                />
              </>
            )}

            {/* Submit */}
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleEmailAuth}
              disabled={emailLoading}
              activeOpacity={0.8}
            >
              {emailLoading ? (
                <ActivityIndicator color={Colors.bgPrimary} size="small" />
              ) : (
                <Text style={styles.submitBtnText}>
                  {mode === 'signin' ? 'Sign In' : 'Create Account'}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer note */}
          <Text style={styles.footerNote}>
            {mode === 'signin'
              ? "Don't have an account? Tap \"Create Account\" above."
              : 'Already have an account? Tap "Sign In" above.'}
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 32,
  },
  branding: {
    alignItems: 'center',
    marginBottom: 40,
  },
  appName: {
    fontSize: 40,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: 6,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: Colors.bgCard,
    borderRadius: 10,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 7,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: Colors.accent,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  tabTextActive: {
    color: Colors.bgPrimary,
  },
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4285F4',
    borderRadius: 10,
    paddingVertical: 14,
    gap: 10,
  },
  googleIcon: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    fontStyle: 'italic',
  },
  googleBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  label: {
    fontSize: 13,
    color: Colors.textLabel,
    fontWeight: '600',
    marginTop: 4,
  },
  input: {
    backgroundColor: Colors.bgInput,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.textPrimary,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  submitBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  submitBtnText: {
    color: Colors.bgPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  footerNote: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 18,
  },
});
