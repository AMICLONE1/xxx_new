import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '@/types';
import { validatePassword, passwordsMatch, PasswordValidation } from '@/utils/passwordValidation';
import { supabaseAuthService } from '@/services/supabase/authService';

type ResetPasswordScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'ResetPassword'
>;

type ResetPasswordScreenRouteProp = RouteProp<
  RootStackParamList,
  'ResetPassword'
>;

interface Props {
  navigation: ResetPasswordScreenNavigationProp;
  route: ResetPasswordScreenRouteProp;
}

interface PasswordRequirementProps {
  label: string;
  met: boolean;
}

const PasswordRequirement = ({ label, met }: PasswordRequirementProps) => (
  <View style={styles.requirementRow}>
    <Ionicons
      name={met ? 'checkmark-circle' : 'ellipse-outline'}
      size={16}
      color={met ? '#10b981' : '#9ca3af'}
    />
    <Text style={[styles.requirementText, met && styles.requirementMet]}>
      {label}
    </Text>
  </View>
);

export default function ResetPasswordScreen({ navigation, route }: Props) {
  const { email } = route.params;
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [confirmPasswordTouched, setConfirmPasswordTouched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Memoized password validation
  const passwordValidation: PasswordValidation = useMemo(
    () => validatePassword(password),
    [password]
  );

  const doPasswordsMatch = useMemo(
    () => passwordsMatch(password, confirmPassword),
    [password, confirmPassword]
  );

  const isFormValid =
    passwordValidation.isValid && confirmPassword.length > 0 && doPasswordsMatch;

  const handleResetPassword = async () => {
    if (!isFormValid) {
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      if (__DEV__) {
        console.log('🔐 Resetting password for:', email);
        // SECURITY: Never log password
      }

      const response = await supabaseAuthService.updatePassword(password);

      // SECURITY: Clear passwords from state
      setPassword('');
      setConfirmPassword('');

      if (response.success) {
        if (__DEV__) {
          console.log('✅ Password reset successful');
        }
        Alert.alert(
          'Password Reset Successful',
          'Your password has been updated. Please sign in with your new password.',
          [
            {
              text: 'Sign In',
              onPress: () => navigation.navigate('Login'),
            },
          ]
        );
      } else {
        setError(response.error || 'Failed to reset password. Please try again.');
      }
    } catch (err: any) {
      if (__DEV__) {
        console.error('❌ Password reset error:', err);
      }
      setError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>

        <View style={styles.content}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <Ionicons name="key-outline" size={48} color="#10b981" />
          </View>

          <Text style={styles.title}>Create New Password</Text>
          <Text style={styles.subtitle}>
            Your new password must be different from previously used passwords and
            meet our security requirements.
          </Text>

          {/* New Password Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>New Password</Text>
            <View
              style={[
                styles.inputWrapper,
                passwordTouched && !passwordValidation.isValid
                  ? styles.inputError
                  : passwordTouched && passwordValidation.isValid
                  ? styles.inputSuccess
                  : null,
              ]}
            >
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color="#6b7280"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Enter new password"
                placeholderTextColor="#9ca3af"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (error) setError('');
                }}
                onBlur={() => setPasswordTouched(true)}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                  color="#6b7280"
                />
              </TouchableOpacity>
            </View>

            {/* Password Requirements - Always visible */}
            <View style={styles.requirementsContainer}>
              <Text style={styles.requirementsTitle}>Password must contain:</Text>
              <PasswordRequirement
                label="At least 8 characters"
                met={passwordValidation.hasMinLength}
              />
              <PasswordRequirement
                label="One uppercase letter (A-Z)"
                met={passwordValidation.hasUppercase}
              />
              <PasswordRequirement
                label="One lowercase letter (a-z)"
                met={passwordValidation.hasLowercase}
              />
              <PasswordRequirement
                label="One number (0-9)"
                met={passwordValidation.hasNumber}
              />
              <PasswordRequirement
                label="One special character (!@#$%^&*)"
                met={passwordValidation.hasSpecialChar}
              />
            </View>
          </View>

          {/* Confirm Password Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Confirm New Password</Text>
            <View
              style={[
                styles.inputWrapper,
                confirmPasswordTouched && confirmPassword.length > 0
                  ? doPasswordsMatch
                    ? styles.inputSuccess
                    : styles.inputError
                  : null,
              ]}
            >
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color="#6b7280"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Confirm new password"
                placeholderTextColor="#9ca3af"
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  if (error) setError('');
                }}
                onBlur={() => setConfirmPasswordTouched(true)}
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                  color="#6b7280"
                />
              </TouchableOpacity>
            </View>
            {confirmPasswordTouched && confirmPassword.length > 0 && (
              <View style={styles.matchIndicator}>
                <Ionicons
                  name={doPasswordsMatch ? 'checkmark-circle' : 'close-circle'}
                  size={16}
                  color={doPasswordsMatch ? '#10b981' : '#ef4444'}
                />
                <Text
                  style={[
                    styles.matchText,
                    { color: doPasswordsMatch ? '#10b981' : '#ef4444' },
                  ]}
                >
                  {doPasswordsMatch ? 'Passwords match' : 'Passwords do not match'}
                </Text>
              </View>
            )}
          </View>

          {/* Error Message */}
          {error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={16} color="#ef4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[
              styles.button,
              (!isFormValid || isLoading) && styles.buttonDisabled,
            ]}
            onPress={handleResetPassword}
            disabled={!isFormValid || isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? 'Resetting Password...' : 'Reset Password'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    flexGrow: 1,
  },
  backButton: {
    padding: 16,
    marginTop: Platform.OS === 'ios' ? 44 : 16,
  },
  content: {
    flex: 1,
    padding: 24,
    paddingTop: 0,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  inputError: {
    borderColor: '#ef4444',
  },
  inputSuccess: {
    borderColor: '#10b981',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
  },
  requirementsContainer: {
    marginTop: 12,
    paddingHorizontal: 4,
  },
  requirementsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  requirementText: {
    fontSize: 13,
    color: '#9ca3af',
    marginLeft: 8,
  },
  requirementMet: {
    color: '#10b981',
  },
  matchIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  matchText: {
    fontSize: 13,
    marginLeft: 6,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#ef4444',
    marginLeft: 8,
  },
  button: {
    backgroundColor: '#10b981',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
