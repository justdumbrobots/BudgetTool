/**
 * Settings Screen
 *
 * Allows users to edit:
 *   - Pay frequency and anchor date
 *   - Income per period and side income
 *   - Starting balance
 *   - App information
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Colors } from '../theme/colors';
import { useAppStore } from '../store/useAppStore';
import { useAuthStore } from '../store/useAuthStore';
import { PickerModal } from '../components/PickerModal';
import { PayFrequency, PAY_FREQUENCIES, FREQUENCY_LABELS } from '../types';
import { formatCurrency } from '../utils/formatters';

export function SettingsScreen() {
  const { profile, saveProfileAction } = useAppStore();
  const { user, signOut } = useAuthStore();

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  const [frequency, setFrequency] = useState<PayFrequency>(profile?.payFrequency ?? 'bi-weekly');
  const [anchorDate, setAnchorDate] = useState(profile?.anchorPayDate ?? '');
  const [income, setIncome] = useState(profile ? String(profile.incomePerPeriod) : '');
  const [sideIncome, setSideIncome] = useState(profile ? String(profile.sideIncome) : '');
  const [startingBalance, setStartingBalance] = useState(profile ? String(profile.startingBalance) : '0');
  const [showFreqPicker, setShowFreqPicker] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const markDirty = () => setIsDirty(true);

  const handleSave = () => {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(anchorDate)) {
      Alert.alert('Invalid date', 'Please enter your next pay date as YYYY-MM-DD');
      return;
    }

    const incomeAmt = parseFloat(income);
    if (isNaN(incomeAmt) || incomeAmt < 0) {
      Alert.alert('Invalid income', 'Please enter a valid income amount.');
      return;
    }

    saveProfileAction({
      payFrequency: frequency,
      anchorPayDate: anchorDate,
      incomePerPeriod: incomeAmt,
      sideIncome: parseFloat(sideIncome) || 0,
      startingBalance: parseFloat(startingBalance) || 0,
    });

    setIsDirty(false);
    Alert.alert('Saved', 'Your settings have been updated and all periods recomputed.');
  };

  const freqOptions = PAY_FREQUENCIES.map((f) => ({ label: FREQUENCY_LABELS[f], value: f }));

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Pay Schedule */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pay Schedule</Text>
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Pay Frequency</Text>
            <TouchableOpacity
              style={styles.pickerBtn}
              onPress={() => setShowFreqPicker(true)}
            >
              <Text style={styles.pickerText}>{FREQUENCY_LABELS[frequency]}</Text>
              <Text style={styles.arrow}>▼</Text>
            </TouchableOpacity>

            <Text style={styles.fieldLabel}>Next Pay Date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              value={anchorDate}
              onChangeText={(v) => { setAnchorDate(v); markDirty(); }}
              placeholder="2026-03-06"
              placeholderTextColor={Colors.textMuted}
              keyboardType="numbers-and-punctuation"
              maxLength={10}
            />

            <Text style={styles.hint}>
              ⚠️ Changing the pay date will regenerate all {800} pay periods.
            </Text>
          </View>
        </View>

        {/* Income */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Income</Text>
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Take-Home Pay Per Period</Text>
            <TextInput
              style={styles.input}
              value={income}
              onChangeText={(v) => { setIncome(v); markDirty(); }}
              placeholder="0.00"
              placeholderTextColor={Colors.textMuted}
              keyboardType="decimal-pad"
            />

            <Text style={styles.fieldLabel}>Side Income Per Period</Text>
            <TextInput
              style={styles.input}
              value={sideIncome}
              onChangeText={(v) => { setSideIncome(v); markDirty(); }}
              placeholder="0.00"
              placeholderTextColor={Colors.textMuted}
              keyboardType="decimal-pad"
            />

            <Text style={styles.fieldLabel}>Starting Balance</Text>
            <TextInput
              style={styles.input}
              value={startingBalance}
              onChangeText={(v) => { setStartingBalance(v); markDirty(); }}
              placeholder="0.00"
              placeholderTextColor={Colors.textMuted}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        {/* Save Button */}
        {isDirty && (
          <View style={styles.section}>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* App Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.card}>
            <InfoRow label="App" value="PayPeriod" />
            <InfoRow label="Version" value="1.0.0" />
            <InfoRow label="Data" value="Stored locally on device" />
            <InfoRow label="Periods Generated" value="800 (~30 years bi-weekly)" />
          </View>
        </View>

        {profile && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Current Configuration</Text>
            <View style={styles.card}>
              <InfoRow label="Pay Frequency" value={FREQUENCY_LABELS[profile.payFrequency]} />
              <InfoRow label="Anchor Pay Date" value={profile.anchorPayDate} />
              <InfoRow label="Income/Period"   value={formatCurrency(profile.incomePerPeriod)} />
              <InfoRow label="Side Income"     value={formatCurrency(profile.sideIncome)} />
              <InfoRow label="Starting Balance" value={formatCurrency(profile.startingBalance)} />
            </View>
          </View>
        )}

        {/* Account */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.card}>
            {user && <InfoRow label="Signed in as" value={user.email ?? 'Google account'} />}
            <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
              <Text style={styles.signOutBtnText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <PickerModal
        visible={showFreqPicker}
        title="Pay Frequency"
        options={freqOptions}
        selected={frequency}
        onSelect={(v) => { setFrequency(v); markDirty(); }}
        onClose={() => setShowFreqPicker(false)}
      />
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 13,
    color: Colors.textLabel,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  fieldLabel: {
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
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgInput,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  pickerText: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 16,
  },
  arrow: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  hint: {
    fontSize: 11,
    color: Colors.textMuted,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  saveBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveBtnText: {
    color: Colors.bgPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  infoLabel: {
    fontSize: 13,
    color: Colors.textLabel,
  },
  infoValue: {
    fontSize: 13,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  signOutBtn: {
    backgroundColor: Colors.bgInput,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.textExpense,
    marginTop: 4,
  },
  signOutBtnText: {
    color: Colors.textExpense,
    fontSize: 15,
    fontWeight: '700',
  },
});
