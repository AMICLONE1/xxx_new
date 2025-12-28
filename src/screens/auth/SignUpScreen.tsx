import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types';
import { validateEmail } from '@/utils/helpers';
import { validatePassword, passwordsMatch, PasswordValidation } from '@/utils/passwordValidation';
import { authService } from '@/services/api/authService';
import { useAuthStore } from '@/store';

type SignUpScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'SignUp'>;

interface Props {
  navigation: SignUpScreenNavigationProp;
}

export default function SignUpScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTermsError, setShowTermsError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [confirmPasswordTouched, setConfirmPasswordTouched] = useState(false);
  const { setUser, setToken } = useAuthStore();

  // Memoized password validation
  const passwordValidation: PasswordValidation = useMemo(
    () => validatePassword(password),
    [password]
  );

  const doPasswordsMatch = useMemo(
    () => passwordsMatch(password, confirmPassword),
    [password, confirmPassword]
  );

  // Check if form is valid
  const isFormValid = useMemo(() => {
    return (
      validateEmail(email.trim().toLowerCase()) &&
      passwordValidation.isValid &&
      doPasswordsMatch &&
      termsAccepted
    );
  }, [email, passwordValidation.isValid, doPasswordsMatch, termsAccepted]);

  const handleSignUp = async () => {
    // Check terms acceptance first
    if (!termsAccepted) {
      setShowTermsError(true);
      return;
    }

    const trimmedEmail = email.trim().toLowerCase();

    if (!validateEmail(trimmedEmail)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address');
      return;
    }

    if (!passwordValidation.isValid) {
      // Don't show alert - inline validation handles this
      return;
    }

    if (!doPasswordsMatch) {
      // Don't show alert - inline validation handles this
      return;
    }

    setIsLoading(true);
    try {
      if (__DEV__) {
        console.log('🚀 Starting sign up process...');
        // SECURITY: Never log password
      }

      const response = await authService.signUp({
        email: trimmedEmail,
        password: password,
        name: name.trim() || undefined,
      });

      // SECURITY: Clear password from state after submission
      setPassword('');
      setConfirmPassword('');

      if (__DEV__) {
        console.log('📥 Sign up response:', { success: response.success, error: response.error });
      }

      if (response.success && response.data) {
        if (__DEV__) {
          console.log('✅ Sign up successful, setting user and token...');
        }
        await setToken(response.data.token);
        setUser(response.data.user);
        
        if (__DEV__) {
          console.log('✅ Navigation to Onboarding...');
        }
        Alert.alert('Success', 'Account created successfully!', [
          {
            text: 'OK',
            onPress: () => navigation.replace('Onboarding'),
          },
        ]);
      } else {
        if (__DEV__) {
          console.error('❌ Sign up failed:', response.error);
        }
        Alert.alert('Sign Up Failed', response.error || 'Failed to create account. Please try again.');
      }
    } catch (error: any) {
      if (__DEV__) {
        console.error('❌ Sign up exception:', error);
      }
      Alert.alert('Error', error.message || 'Failed to sign up. Please try again.');
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
        <View style={styles.content}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join PowerNetPro</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your name"
              autoCapitalize="words"
              autoCorrect={false}
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email address"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordInputWrapper}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Create a strong password"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (!passwordTouched) setPasswordTouched(true);
                }}
                onBlur={() => setPasswordTouched(true)}
              />
              <TouchableOpacity
                style={styles.eyeButton}
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
            
            {/* Password Requirements Checklist - Always visible */}
            <View style={styles.passwordRequirements}>
              <Text style={styles.requirementsTitle}>Password must contain:</Text>
              <View style={styles.requirementRow}>
                <Ionicons
                  name={passwordValidation.hasMinLength ? 'checkmark-circle' : 'ellipse-outline'}
                  size={14}
                  color={passwordValidation.hasMinLength ? '#10b981' : '#9ca3af'}
                />
                <Text
                  style={[
                    styles.requirementText,
                    passwordValidation.hasMinLength && styles.requirementMet,
                  ]}
                >
                  At least 8 characters
                </Text>
              </View>
              <View style={styles.requirementRow}>
                <Ionicons
                  name={passwordValidation.hasUppercase ? 'checkmark-circle' : 'ellipse-outline'}
                  size={14}
                  color={passwordValidation.hasUppercase ? '#10b981' : '#9ca3af'}
                />
                <Text
                  style={[
                    styles.requirementText,
                    passwordValidation.hasUppercase && styles.requirementMet,
                  ]}
                >
                  One uppercase letter (A–Z)
                </Text>
              </View>
              <View style={styles.requirementRow}>
                <Ionicons
                  name={passwordValidation.hasLowercase ? 'checkmark-circle' : 'ellipse-outline'}
                  size={14}
                  color={passwordValidation.hasLowercase ? '#10b981' : '#9ca3af'}
                />
                <Text
                  style={[
                    styles.requirementText,
                    passwordValidation.hasLowercase && styles.requirementMet,
                  ]}
                >
                  One lowercase letter (a–z)
                </Text>
              </View>
              <View style={styles.requirementRow}>
                <Ionicons
                  name={passwordValidation.hasNumber ? 'checkmark-circle' : 'ellipse-outline'}
                  size={14}
                  color={passwordValidation.hasNumber ? '#10b981' : '#9ca3af'}
                />
                <Text
                  style={[
                    styles.requirementText,
                    passwordValidation.hasNumber && styles.requirementMet,
                  ]}
                >
                  One number (0–9)
                </Text>
              </View>
              <View style={styles.requirementRow}>
                <Ionicons
                  name={passwordValidation.hasSpecialChar ? 'checkmark-circle' : 'ellipse-outline'}
                  size={14}
                  color={passwordValidation.hasSpecialChar ? '#10b981' : '#9ca3af'}
                />
                <Text
                  style={[
                    styles.requirementText,
                    passwordValidation.hasSpecialChar && styles.requirementMet,
                  ]}
                >
                  One special character (!@#$%^&*)
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Confirm Password</Text>
            <View style={styles.passwordInputWrapper}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Confirm your password"
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  if (!confirmPasswordTouched) setConfirmPasswordTouched(true);
                }}
                onBlur={() => setConfirmPasswordTouched(true)}
              />
              <TouchableOpacity
                style={styles.eyeButton}
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
            {/* Confirm Password Error */}
            {confirmPasswordTouched && confirmPassword.length > 0 && !doPasswordsMatch && (
              <Text style={styles.errorText}>Passwords do not match</Text>
            )}
            {confirmPasswordTouched && confirmPassword.length > 0 && doPasswordsMatch && (
              <View style={styles.matchRow}>
                <Ionicons name="checkmark-circle" size={14} color="#10b981" />
                <Text style={styles.matchText}>Passwords match</Text>
              </View>
            )}
          </View>

          {/* Terms & Conditions Checkbox */}
          <View style={styles.termsContainer}>
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => {
                setTermsAccepted(!termsAccepted);
                if (showTermsError) setShowTermsError(false);
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
                {termsAccepted && (
                  <Ionicons name="checkmark" size={14} color="#ffffff" />
                )}
              </View>
              <Text style={styles.termsText}>
                I agree to the{' '}
                <Text
                  style={styles.termsLink}
                  onPress={() => navigation.navigate('TermsConditions')}
                >
                  Terms & Conditions
                </Text>
                {' '}and{' '}
                <Text
                  style={styles.termsLink}
                  onPress={() => navigation.navigate('TermsConditions')}
                >
                  Privacy Policy
                </Text>
              </Text>
            </TouchableOpacity>
            {showTermsError && (
              <Text style={styles.termsError}>
                Please accept Terms & Conditions to continue
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.button,
              (!isFormValid || isLoading) && styles.buttonDisabled,
            ]}
            onPress={handleSignUp}
            disabled={!isFormValid || isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? 'Creating Account...' : 'Sign Up'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.linkButton}
          >
            <Text style={styles.linkText}>
              Already have an account? <Text style={styles.linkTextBold}>Sign In</Text>
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
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#10b981',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 32,
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
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  passwordInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  eyeButton: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  passwordRequirements: {
    marginTop: 10,
    paddingHorizontal: 4,
  },
  requirementsTitle: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 6,
    fontWeight: '500',
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  requirementText: {
    fontSize: 11,
    color: '#9ca3af',
    marginLeft: 6,
  },
  requirementMet: {
    color: '#10b981',
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 6,
    marginLeft: 4,
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    marginLeft: 4,
  },
  matchText: {
    fontSize: 12,
    color: '#10b981',
    marginLeft: 4,
  },
  termsContainer: {
    marginBottom: 24,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#d1d5db',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 22,
  },
  termsLink: {
    color: '#10b981',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  termsError: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 8,
    marginLeft: 34,
  },
  button: {
    backgroundColor: '#10b981',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 24,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    marginTop: 8,
    alignItems: 'center',
    marginBottom: 24,
  },
  linkText: {
    fontSize: 14,
    color: '#6b7280',
  },
  linkTextBold: {
    color: '#10b981',
    fontWeight: '600',
  },
});

